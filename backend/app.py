# app.py
"""
ATS Resume Analyzer Backend (Flask + Celery + Redis)
"""

import io
import json
import os
import sqlite3
import uuid
from datetime import datetime
from functools import wraps

import pandas as pd
import redis
from celery import Celery
from flask import (
    Flask,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    send_file,
    url_for,
)
from flask_cors import CORS
from flask_login import (
    LoginManager,
    current_user,
    login_required,
    login_user,
    logout_user,
)
from reportlab.pdfgen import canvas
from werkzeug.utils import secure_filename

from ats_processor import ATSProcessor
# add to imports
from database import add_resume, get_all_resumes, get_resume, init_db, update_resume_analysis, init_job_profiles_db,delete_job_profile, update_job_profile

from models import User, db


# ---------------------------------------------------------------------------
# App + Config
# ---------------------------------------------------------------------------
app = Flask(__name__)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://frontend:3000",
]

app.config.update(
    SESSION_COOKIE_SAMESITE=None,
    SESSION_COOKIE_SECURE=False,   # keep False for local dev; set True in production with HTTPS
    SESSION_COOKIE_HTTPONLY=True,
    CORS_SUPPORTS_CREDENTIALS=True,
    UPLOAD_FOLDER="uploads",
    MAX_CONTENT_LENGTH=16 * 1024 * 1024,  # 16MB
    broker_url="redis://redis:6379/0",
    result_backend="redis://redis:6379/0",
    SECRET_KEY=os.getenv("FLASK_SECRET_KEY", "change-this-secret-key"),
    SQLALCHEMY_DATABASE_URI="sqlite:///ats.db",
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
)

CORS(
    app, 
    resources={r"/api/*": {"origins": ALLOWED_ORIGINS}},
     supports_credentials=True,
   
)





# ---------------------------------------------------------------------------
# Extensions
# ---------------------------------------------------------------------------
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"


def make_celery(flask_app: Flask) -> Celery:
    celery_app = Celery(
        flask_app.import_name,
        backend=flask_app.config["result_backend"],
        broker=flask_app.config["broker_url"],
    )
    celery_app.conf.update(flask_app.config)
    return celery_app


celery = make_celery(app)





# Redis client
try:
    redis_client = redis.Redis(host="redis", port=6379, db=1, decode_responses=True)
    redis_client.ping()
    print("✅ Redis connected successfully")
except redis.ConnectionError:
    print("❌ Redis connection failed. Please start Redis server.")
    redis_client = None

# ATS processor
try:
    ats_processor = ATSProcessor()
    print("✅ ATS Processor initialized successfully")
except Exception as exc:  # noqa: BLE001
    print(f"❌ ATS Processor initialization failed: {exc}")
    ats_processor = None

# Upload folder
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

# in the init block (near init_db())
try:
    init_db()  # resumes table
    init_job_profiles_db()  # job_profiles table
    with app.app_context():
        db.create_all()  # users table
    print("ƒo. Database (resumes + users + job profiles) initialized successfully")
except Exception as exc:  # noqa: BLE001
    print(f"ƒ?O Database initialization failed: {exc}")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
ALLOWED_EXTENSIONS = {"pdf", "doc", "docx"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


def roles_required(*roles):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            if not current_user.is_authenticated:
                if request.path.startswith("/api/"):
                    return jsonify({"error": "Not authenticated"}), 401
                return redirect(url_for("login"))
            if current_user.role not in roles:
                if request.path.startswith("/api/"):
                    return jsonify({"error": "Forbidden"}), 403
                flash("You do not have permission to access this page.", "danger")
                return redirect(url_for("index"))
            return f(*args, **kwargs)

        return wrapped

    return decorator


def _resume_counts():
    conn = sqlite3.connect("ats.db")
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM resumes")
    total = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM resumes WHERE status = 'completed'")
    completed = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM resumes WHERE status != 'completed'")
    pending = cur.fetchone()[0]
    conn.close()
    return total, completed, pending


def _dummy_top_skills():
    return [
        {"skill": "Python", "count": 42},
        {"skill": "SQL", "count": 33},
        {"skill": "AWS", "count": 28},
        {"skill": "Docker", "count": 25},
    ]


# ---------------------------------------------------------------------------
# HTML routes
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("index"))

    if request.method == "POST":
        name = request.form.get("name")
        email = request.form.get("email")
        password = request.form.get("password")
        role = request.form.get("role")

        if not all([name, email, password, role]):
            flash("Please fill in all fields.", "danger")
            return render_template("register.html")

        if role not in ["candidate", "user", "admin"]:
            flash("Invalid role selected.", "danger")
            return render_template("register.html")

        existing = User.query.filter_by(email=email).first()
        if existing:
            flash("Email already registered. Please log in.", "warning")
            return redirect(url_for("login"))

        user = User(name=name, email=email, role=role)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        flash("Registration successful. You can now log in.", "success")
        return redirect(url_for("login"))

    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("index"))

    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")
        user = User.query.filter_by(email=email).first()

        if user and user.check_password(password):
            login_user(user)
            flash("Logged in successfully.", "success")
            next_page = request.args.get("next")
            return redirect(next_page or url_for("index"))
        flash("Invalid email or password.", "danger")

    return render_template("login.html")


@app.route("/logout")
@login_required
def logout():
    logout_user()
    flash("You have been logged out.", "info")
    return redirect(url_for("index"))


@app.route("/profile")
@login_required
def profile():
    return render_template("profile.html", user=current_user)


# ---------------------------------------------------------------------------
# Celery task
# ---------------------------------------------------------------------------

@celery.task(bind=True, name='process_resume_task') 
def process_resume_task(self, resume_id, file_path, job_profile_id=None):   
    try:
        self.update_state(
            state="PROGRESS", meta={"progress": 10, "message": "Starting analysis..."}
        )

        if not ats_processor:
            raise Exception("ATS Processor not available")

        self.update_state(
            state="PROGRESS", meta={"progress": 30, "message": "Extracting text..."}
        )

        analysis_result = ats_processor.analyze_resume(file_path, job_profile_id)

        self.update_state(
            state="PROGRESS", meta={"progress": 80, "message": "Finalizing analysis..."}
        )

        update_resume_analysis(resume_id, analysis_result)

        self.update_state(
            state="PROGRESS", meta={"progress": 100, "message": "Analysis complete!"}
        )

        return {"status": "completed", "analysis": analysis_result}

    except Exception as exc:  # noqa: BLE001
        self.update_state(
            state="FAILURE",
            meta={"error": str(exc), "message": f"Analysis failed: {str(exc)}"},
        )
        return {"status": "failed", "error": str(exc)}


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health_check():
    status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "database": True,
            "redis": redis_client is not None,
            "ats_processor": ats_processor is not None,
            "celery": True,
        },
    }
    if not all(status["services"].values()):
        status["status"] = "degraded"
    return jsonify(status)


def _user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }


@app.route("/api/auth/register", methods=["POST"])
def api_register():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = (data.get("role") or "candidate").strip().lower()

    if not all([name, email, password]):
        return jsonify({"error": "Name, email, and password are required."}), 400

    if role not in ["candidate", "user", "admin"]:
        return jsonify({"error": "Invalid role selected."}), 400

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"error": "Email already registered. Please log in."}), 409

    user = User(name=name, email=email, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    login_user(user)
    return jsonify({"message": "Registration successful.", "user": _user_to_dict(user)})


@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password."}), 401

    login_user(user)
    return jsonify({"message": "Logged in successfully.", "user": _user_to_dict(user)})


@app.route("/api/auth/logout", methods=["POST"])
@login_required
def api_logout():
    logout_user()
    return jsonify({"message": "Logged out successfully."})


@app.route("/api/auth/me", methods=["GET"])
def api_me():
    if not current_user.is_authenticated:
        return jsonify({"authenticated": False})
    return jsonify({"authenticated": True, "user": _user_to_dict(current_user)})


def _latest_resume_snapshot():
    try:
        resumes = get_all_resumes(limit=1, offset=0)
        if resumes:
            latest = resumes[0]
            return {
                "id": latest.get("id"),
                "filename": latest.get("filename"),
                "uploadedAt": latest.get("upload_date"),
            }
    except Exception:
        return None
    return None


@app.route("/api/profile/me", methods=["GET"])
@login_required
def profile_me():
    """Return candidate profile data for the current user."""
    latest_resume = _latest_resume_snapshot()

    profile = {
        "id": f"cand-{current_user.id}",
        "name": current_user.name,
        "email": current_user.email,
        "phone": "",
        "location": "",
        "headline": "Add your headline",
        "summary": "",
        "skills": [],
        "experience": [],
        "education": [],
        "preferences": {
            "roles": [],
            "locations": [],
            "workType": "remote",
            "salaryRange": "",
        },
        "lastLogin": datetime.utcnow().isoformat(),
        "profileCompletion": 40,
        "latestResume": latest_resume,
    }

    return jsonify(profile)


@app.route("/api/profile", methods=["PUT"])
@login_required
def profile_update():
    """Accept profile updates and echo back. Persistence can be added later."""
    try:
        data = request.json or {}
        merged = {
            **data,
            "id": f"cand-{current_user.id}",
            "name": data.get("name") or current_user.name,
            "email": current_user.email,
            "lastLogin": datetime.utcnow().isoformat(),
        }
        return jsonify({"message": "Profile updated", "profile": merged}), 200
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": str(exc)}), 500


@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    total, completed, pending = _resume_counts()
    data = {
        "total_resumes": total,
        "processed_today": min(completed, 5),
        "pending_jobs": pending,
        "top_skills": _dummy_top_skills(),
        "processing_time_avg_s": 8,
        "recent_activity": [
            {"id": str(uuid.uuid4()), "event": "Resume processed", "status": "success"},
            {"id": str(uuid.uuid4()), "event": "Job created", "status": "info"},
        ],
    }
    return jsonify(data)


@app.route("/api/resume/upload", methods=["POST"])
def upload_resume_alias():
    return upload_resume()


@app.route("/api/upload", methods=["POST"])
@login_required
@roles_required("candidate", "user", "admin")
def upload_resume():
    try:
        if "resume" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files["resume"]
        job_profile_id = request.form.get("jobProfileId")

        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        if not allowed_file(file.filename):
            return jsonify(
                {"error": "Invalid file type. Please upload PDF, DOC, or DOCX files."}
            ), 400

        resume_id = str(uuid.uuid4())
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], f"{resume_id}_{filename}")

        file.save(file_path)
        print(f"✅ File saved: {file_path}")

        add_resume(resume_id, filename, file_path, "processing", job_profile_id, getattr(current_user, "id", None))

        task = process_resume_task.delay(resume_id, file_path, job_profile_id)
        job_id = task.id

        if redis_client:
            redis_client.set(f"job:{job_id}:resume", resume_id, ex=3600)
            redis_client.set(f"resume:{resume_id}:job", job_id, ex=3600)

        print(f"✅ Processing queued: Job {job_id}, Resume {resume_id}")

        return jsonify(
            {
                "jobId": job_id,
                "resumeId": resume_id,
                "status": "queued",
                "message": "Resume uploaded successfully and queued for analysis",
            }
        )

    except Exception as exc:  # noqa: BLE001
        print(f"❌ Upload error: {exc}")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/batch-upload", methods=["POST"])
@login_required
@roles_required("candidate", "user", "admin")
def batch_upload():
    try:
        files = request.files.getlist("resumes")
        job_profile_id = request.form.get("jobProfileId")

        if not files:
            return jsonify({"error": "No files provided"}), 400

        job_id = str(uuid.uuid4())
        resume_ids = []
        task_ids = []

        print(f"✅ Batch upload started: {len(files)} files")

        for file in files:
            if file and allowed_file(file.filename):
                resume_id = str(uuid.uuid4())
                filename = secure_filename(file.filename)
                file_path = os.path.join(app.config["UPLOAD_FOLDER"], f"{resume_id}_{filename}")

                file.save(file_path)
                add_resume(resume_id, filename, file_path, "processing", job_profile_id, getattr(current_user, "id", None))

                task = process_resume_task.delay(resume_id, file_path, job_profile_id)
                task_ids.append(task.id)
                resume_ids.append(resume_id)

                print(f"  ✅ Queued: {filename}")

        if redis_client:
            redis_client.set(f"batch:{job_id}:resumes", json.dumps(resume_ids), ex=3600)
            redis_client.set(f"batch:{job_id}:tasks", json.dumps(task_ids), ex=3600)

        print(f"✅ Batch upload complete: {len(resume_ids)} files queued")

        return jsonify(
            {
                "jobId": job_id,
                "resumeIds": resume_ids,
                "status": "queued",
                "message": f"{len(resume_ids)} resumes uploaded and queued for analysis",
            }
        )

    except Exception as exc:  # noqa: BLE001
        print(f"❌ Batch upload error: {exc}")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/analysis/<job_id>/status", methods=["GET"])
@login_required
def get_analysis_status(job_id):
    try:
        if redis_client:
            batch_resumes = redis_client.get(f"batch:{job_id}:resumes")
            if batch_resumes:
                task_ids = json.loads(redis_client.get(f"batch:{job_id}:tasks") or "[]")
                completed = 0
                total = len(task_ids)

                for task_id in task_ids:
                    task = process_resume_task.AsyncResult(task_id)
                    if task.state == "SUCCESS":
                        completed += 1

                progress = (completed / total) * 100 if total > 0 else 0
                status = "completed" if completed == total else "processing"

                return jsonify(
                    {
                        "status": status,
                        "progress": progress,
                        "completed": completed,
                        "total": total,
                        "message": f"Processed {completed} of {total} resumes",
                    }
                )

        task = process_resume_task.AsyncResult(job_id)

        if task.state == "PENDING":
            return jsonify(
                {
                    "status": "queued",
                    "progress": 0,
                    "message": "Analysis queued and waiting to start",
                }
            )
        if task.state == "PROGRESS":
            info = task.info or {}
            return jsonify(
                {
                    "status": "processing",
                    "progress": info.get("progress", 0),
                    "message": info.get("message", "Processing..."),
                }
            )
        if task.state == "SUCCESS":
            return jsonify(
                {
                    "status": "completed",
                    "progress": 100,
                    "message": "Analysis completed successfully",
                }
            )
        if task.state == "FAILURE":
            # FIX: task.info is an Exception object, not a dict. Convert it to string.
            return jsonify({
                "status": "failed",
                "error": str(task.info),
                "message": "Analysis failed"
            })

        return jsonify({"status": "unknown", "message": "Job status could not be determined"})

    except Exception as exc:  # noqa: BLE001
        print(f"❌ Status check error: {exc}")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/analysis/<resume_id>", methods=["GET"])
@login_required
def get_analysis_result(resume_id):
    try:
        resume = get_resume(resume_id)
        if not resume:
            return jsonify({"error": "Resume not found"}), 404

        if not resume["analysis"]:
            return jsonify({"error": "Analysis not completed yet"}), 404

        analysis = json.loads(resume["analysis"])
        print(f"✅ Analysis retrieved for resume {resume_id}")

        return jsonify(analysis)

    except Exception as exc:  # noqa: BLE001
        print(f"❌ Get analysis error: {exc}")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/resumes", methods=["GET"])
@login_required
@roles_required("user", "admin")
def get_resumes():
    try:
        limit = request.args.get("limit", 50, type=int)
        offset = request.args.get("offset", 0, type=int)

        resumes = get_all_resumes(limit, offset)

        for resume in resumes:
            if resume.get("analysis"):
                try:
                    resume["analysis"] = json.loads(resume["analysis"])
                except Exception:  # noqa: BLE001
                    resume["analysis"] = None

        print(f"✅ Retrieved {len(resumes)} resumes")
        return jsonify(resumes)

    except Exception as exc:  # noqa: BLE001
        print(f"❌ Get resumes error: {exc}")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/resumes/<resume_id>", methods=["DELETE"])
@login_required
@roles_required("user", "admin")
def delete_resume(resume_id):
    try:
        resume = get_resume(resume_id)
        if not resume:
            return jsonify({"error": "Resume not found"}), 404

        if os.path.exists(resume["file_path"]):
            os.remove(resume["file_path"])
            print(f"✅ File deleted: {resume['file_path']}")

        conn = sqlite3.connect("ats.db")
        cursor = conn.cursor()
        cursor.execute("DELETE FROM resumes WHERE id = ?", (resume_id,))
        conn.commit()
        conn.close()

        print(f"✅ Resume deleted: {resume_id}")
        return jsonify({"message": "Resume deleted successfully"})

    except Exception as exc:  # noqa: BLE001
        print(f"❌ Delete error: {exc}")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/resumes/<resume_id>/reject", methods=["PUT"])
@login_required
@roles_required("user", "admin")
def reject_resume(resume_id):
    """Mark a resume as rejected with an optional reason."""
    try:
        resume = get_resume(resume_id)
        if not resume:
            return jsonify({"error": "Resume not found"}), 404

        payload = request.get_json() or {}
        reason = payload.get("reason", "")

        # Merge rejection info into analysis JSON (non-destructive)
        analysis_data = {}
        if resume.get("analysis"):
            try:
                analysis_data = json.loads(resume["analysis"])
            except Exception:
                analysis_data = {}

        analysis_data["rejection"] = {
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat(),
        }

        conn = sqlite3.connect("ats.db")
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE resumes SET status = ?, analysis = ? WHERE id = ?",
            ("rejected", json.dumps(analysis_data), resume_id),
        )
        conn.commit()
        conn.close()

        print(f"Resume rejected: {resume_id}")
        return jsonify(
            {
                "message": "Resume rejected",
                "id": resume_id,
                "status": "rejected",
                "reason": reason,
            }
        )

    except Exception as exc:  # noqa: BLE001
        print(f"Reject error: {exc}")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/export", methods=["POST"])
@login_required
@roles_required("user", "admin")
def export_analysis():
    try:
        data = request.json or {}
        resume_ids = data.get("resumeIds", [])
        format_type = data.get("format", "csv")

        print(f"✅ Exporting {len(resume_ids)} analyses as {format_type}")

        analysis_data = []
        for resume_id in resume_ids:
            resume = get_resume(resume_id)
            if resume and resume["analysis"]:
                analysis = json.loads(resume["analysis"])
                analysis_data.append(
                    {
                        "filename": resume["filename"],
                        "overall_score": analysis.get("overallScore", 0),
                        "skills_score": next(
                            (s.get("score", 0) for s in analysis.get("sections", []) if s.get("name") == "Skills Match"),
                            0,
                        ),
                        "experience_score": next(
                            (s.get("score", 0) for s in analysis.get("sections", []) if s.get("name") == "Experience"),
                            0,
                        ),
                        "education_score": next(
                            (s.get("score", 0) for s in analysis.get("sections", []) if s.get("name") == "Education"),
                            0,
                        ),
                        "job_match": analysis.get("jobMatch", {}).get("matchPercentage", 0),
                        "detected_skills": ", ".join([s.get("name", "") for s in analysis.get("skills", [])]),
                        "missing_skills": ", ".join(analysis.get("jobMatch", {}).get("missingSkills", [])),
                        "upload_date": resume["upload_date"],
                    }
                )

        if format_type == "csv":
            df = pd.DataFrame(analysis_data)
            output = io.StringIO()
            df.to_csv(output, index=False)
            output.seek(0)

            return send_file(
                io.BytesIO(output.getvalue().encode()),
                mimetype="text/csv",
                as_attachment=True,
                download_name="ats_analysis.csv",
            )

        if format_type == "excel":
            df = pd.DataFrame(analysis_data)
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine="openpyxl") as writer:
                df.to_excel(writer, index=False, sheet_name="ATS Analysis")
            output.seek(0)

            return send_file(
                output,
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                as_attachment=True,
                download_name="ats_analysis.xlsx",
            )

        if format_type == "pdf":
            output = io.BytesIO()
            p = canvas.Canvas(output)

            y = 800
            p.drawString(100, y, "ATS Analysis Report")
            p.drawString(100, y - 20, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            y -= 60

            for item in analysis_data:
                if y < 100:
                    p.showPage()
                    y = 800

                p.drawString(100, y, f"File: {item['filename']}")
                y -= 20
                p.drawString(120, y, f"Overall Score: {item['overall_score']}%")
                y -= 20
                p.drawString(120, y, f"Job Match: {item['job_match']}%")
                y -= 20
                p.drawString(120, y, f"Top Skills: {item['detected_skills'][:60]}...")
                y -= 40

            p.save()
            output.seek(0)

            return send_file(
                output,
                mimetype="application/pdf",
                as_attachment=True,
                download_name="ats_analysis.pdf",
            )

        return jsonify({"error": "Unsupported format"}), 400

    except Exception as exc:  # noqa: BLE001
        print(f"❌ Export error: {exc}")
        return jsonify({"error": str(exc)}), 500

# app.py

@app.route("/api/jobs/<job_id>/apply", methods=["POST"])
@login_required
@roles_required("candidate")
def apply_to_job(job_id):
    try:
        # 1. Validation: Check if a file was sent
        if 'resume' not in request.files:
            return jsonify({"error": "No resume file provided"}), 400
            
        file = request.files['resume']
        full_name = request.form.get('fullName')
        email = request.form.get('email')

        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        if file and allowed_file(file.filename):
            # 2. Prepare Unique Filename
            resume_id = str(uuid.uuid4())
            filename = secure_filename(file.filename)
            # We prefix with the ID to ensure no file overwrite conflicts
            save_name = f"{resume_id}_{filename}" 
            file_path = os.path.join(app.config["UPLOAD_FOLDER"], save_name)
            
            # 3. Save File to Disk
            file.save(file_path)
            
            # 4. Save to Database (SQLite)
            # This is CRITICAL: It creates the record so Recruiters can see it.
            # We pass the job_id so we know which job they applied for.
            add_resume(resume_id, filename, file_path, "processing", job_id, getattr(current_user, "id", None))
            
            # 5. Trigger AI Analysis (Background Task)
            # This sends the resume to the Celery worker to extract skills/score
            task = process_resume_task.delay(resume_id, file_path, job_id)
            
            print(f"✅ APPLICATION SAVED & QUEUED:")
            print(f"   Candidate: {full_name}")
            print(f"   Job ID: {job_id}")
            print(f"   Resume ID: {resume_id}")

            return jsonify({
                "message": "Application submitted successfully!", 
                "resumeId": resume_id,
                "jobId": job_id,
                "status": "applied"
            })
            
        return jsonify({"error": "Invalid file type"}), 400

    except Exception as e:
        print(f"❌ Application Error: {e}")
        return jsonify({"error": str(e)}), 500
    # app.py 

@app.route("/api/jobs/<job_id>/candidates", methods=["GET"])
@login_required
@roles_required("user", "admin")
def get_job_candidates(job_id):
    try:
        # Connect to DB directly to filter by job_id
        conn = sqlite3.connect("ats.db")
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        # Get resumes for this job
        cur.execute("SELECT * FROM resumes WHERE job_profile_id = ?", (job_id,))
        rows = cur.fetchall()
        
        candidates = []
        for row in rows:
            # Parse the JSON analysis if it exists
            analysis = {}
            if row["analysis"]:
                try:
                    analysis = json.loads(row["analysis"])
                except:
                    analysis = {}
            
            candidates.append({
                "id": row["id"],
                "filename": row["filename"],
                "status": row["status"],
                "upload_date": row["upload_date"],
                # Extract handy info for the UI
                "name": analysis.get("personalInfo", {}).get("name", "Unknown"),
                "email": analysis.get("personalInfo", {}).get("email", "Unknown"),
                "score": analysis.get("overallScore", 0),
                "skills": [s["name"] for s in analysis.get("skills", [])[:5]] # Top 5 skills
            })
            
        conn.close()
        return jsonify(candidates)

    except Exception as e:
        print(f"❌ Error fetching candidates: {e}")
        return jsonify({"error": str(e)}), 500
    


# replace the /api/job-profiles route with this
@app.route("/api/job-profiles", methods=["GET", "POST"])
def job_profiles():
    try:
        def normalize_skills(value):
            if isinstance(value, str):
                return [s.strip() for s in value.split(",") if s.strip()]
            if isinstance(value, list):
                return [str(s).strip() for s in value if str(s).strip()]
            return []

        if request.method == "GET":
            with sqlite3.connect("ats.db") as conn:
                conn.row_factory = sqlite3.Row
                cur = conn.cursor()
                cur.execute(
                    """
                    SELECT id, title, description, minimum_experience,
                           required_skills, preferred_skills
                    FROM job_profiles
                    ORDER BY title
                    """
                )
                rows = cur.fetchall()

            profiles = []
            for row in rows:
                profiles.append({
                    "id": row["id"],
                    "title": row["title"],
                    "description": row["description"] or "",
                    "minimumExperience": row["minimum_experience"] or 0,
                    "requiredSkills": json.loads(row["required_skills"] or "[]"),
                    "preferredSkills": json.loads(row["preferred_skills"] or "[]"),
                })
            print(f"ƒo. Retrieved {len(profiles)} job profiles from DB")
            return jsonify(profiles)

        # POST
        if not current_user.is_authenticated or current_user.role not in ["user", "admin"]:
            return jsonify({"error": "Only recruiters/admin can create job profiles."}), 403

        data = request.get_json() or {}
        title = (data.get("title") or "").strip()
        description = (data.get("description") or "").strip()
        minimum_experience = int(data.get("minimumExperience") or 0)
        required_skills = normalize_skills(data.get("requiredSkills") or [])
        preferred_skills = normalize_skills(data.get("preferredSkills") or [])

        if not title:
            return jsonify({"error": "Title is required."}), 400

        profile_id = str(uuid.uuid4())
        with sqlite3.connect("ats.db") as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO job_profiles
                  (id, title, description, minimum_experience, required_skills, preferred_skills)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    profile_id,
                    title,
                    description,
                    minimum_experience,
                    json.dumps(required_skills),
                    json.dumps(preferred_skills),
                ),
            )
            conn.commit()

        profile = {
            "id": profile_id,
            "title": title,
            "description": description,
            "minimumExperience": minimum_experience,
            "requiredSkills": required_skills,
            "preferredSkills": preferred_skills,
        }
        print(f"ƒo. Created job profile: {title}")
        return jsonify(profile), 201


    except Exception as exc:  # noqa: BLE001
        print(f"ƒ?O Job profiles error: {exc}")
        return jsonify({"error": str(exc)}), 500  
    

@app.route("/api/job-profiles/<profile_id>", methods=["DELETE"])
@login_required
@roles_required("user", "admin")
def delete_job_route(profile_id):
    try:
        delete_job_profile(profile_id)
        return jsonify({"message": "Job profile deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/job-profiles/<profile_id>", methods=["PUT"])
@login_required
@roles_required("user", "admin")
def update_job_route(profile_id):
    try:
        data = request.json
        update_job_profile(profile_id, data)
        return jsonify({"message": "Job profile updated", "id": profile_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500 







@app.route("/api/candidates", methods=["GET"])
def candidates():
    dummy = [
        {"id": "cand-1", "name": "Alex Doe", "role": "Full Stack", "status": "review"},
        {"id": "cand-2", "name": "Jamie Lee", "role": "Data Scientist", "status": "interview"},
    ]
    return jsonify(dummy)


@app.route("/api/job-postings", methods=["GET"])
def job_postings():
    dummy = [
        {"id": "job-1", "title": "Backend Engineer", "location": "Remote", "status": "open"},
        {"id": "job-2", "title": "Frontend Engineer", "location": "Remote", "status": "open"},
    ]
    return jsonify(dummy)


@app.route("/api/analytics", methods=["GET"])
def analytics():
    total, completed, pending = _resume_counts()
    data = {
        "totals": {"resumes": total, "completed": completed, "pending": pending},
        "top_skills": _dummy_top_skills(),
        "processing_time_avg_s": 8,
    }
    return jsonify(data)


@app.route("/api/my-resumes", methods=["GET"])
@login_required
@roles_required("candidate", "user", "admin")
def my_resumes():
    """Return resumes uploaded by the current user."""
    try:
        user_id = getattr(current_user, "id", None)
        if not user_id:
            return jsonify([])

        conn = sqlite3.connect("ats.db")
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(
            """
            SELECT * FROM resumes
            WHERE user_id = ?
            ORDER BY upload_date DESC
            """,
            (user_id,),
        )
        rows = cur.fetchall()
        conn.close()

        resumes = []
        for row in rows:
            item = dict(row)
            if item.get("analysis"):
                try:
                    item["analysis"] = json.loads(item["analysis"])
                except Exception:  # noqa: BLE001
                    item["analysis"] = None
            resumes.append(item)

        return jsonify(resumes)

    except Exception as exc:  # noqa: BLE001
        print(f"Get my resumes error: {exc}")
        return jsonify({"error": str(exc)}), 500


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------
@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "File too large. Maximum size is 16MB."}), 413


@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Endpoint not found"}), 404
    return "Page not found", 404


@app.errorhandler(500)
def internal_error(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Internal server error"}), 500
    return "Internal server error", 500


if __name__ == "__main__":
    print("🚀 Starting ATS Resume Analyzer Backend...")
    app.run(debug=True, host="0.0.0.0", port=5000)
