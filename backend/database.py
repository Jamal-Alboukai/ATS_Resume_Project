# database.py
import sqlite3
from datetime import datetime
import json

DB_PATH = "ats.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Create resumes table if it doesn't exist."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS resumes (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            status TEXT NOT NULL,
            job_profile_id TEXT,
            analysis TEXT,
            upload_date TEXT NOT NULL,
            user_id INTEGER
        )
        """
    )
    # Ensure user_id column exists for legacy DBs
    cursor.execute("PRAGMA table_info(resumes)")
    cols = [row["name"] for row in cursor.fetchall()]
    if "user_id" not in cols:
        cursor.execute("ALTER TABLE resumes ADD COLUMN user_id INTEGER")
    conn.commit()
    conn.close()

def init_job_profiles_db():
    """Create job_profiles table if it doesn't exist."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS job_profiles (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            minimum_experience INTEGER,
            required_skills TEXT,
            preferred_skills TEXT
        )
        """
    )
    conn.commit()
    conn.close()

def add_resume(resume_id, filename, file_path, status, job_profile_id=None, user_id=None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO resumes (id, filename, file_path, status, job_profile_id, analysis, upload_date, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            resume_id,
            filename,
            file_path,
            status,
            job_profile_id,
            None,
            datetime.now().isoformat(),
            user_id,
        ),
    )
    conn.commit()
    conn.close()

def get_resume(resume_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM resumes WHERE id = ?", (resume_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)

def update_resume_analysis(resume_id, analysis_result):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE resumes
        SET analysis = ?, status = ?
        WHERE id = ?
        """,
        (json.dumps(analysis_result), "completed", resume_id),
    )
    conn.commit()
    conn.close()

def get_all_resumes(limit=50, offset=0):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT * FROM resumes
        ORDER BY upload_date DESC
        LIMIT ? OFFSET ?
        """,
        (limit, offset),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
# In database.py

def delete_job_profile(profile_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM job_profiles WHERE id = ?", (profile_id,))
    conn.commit()
    conn.close()

def update_job_profile(profile_id, data):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE job_profiles 
        SET title = ?, description = ?, minimum_experience = ?, required_skills = ?, preferred_skills = ?
        WHERE id = ?
        """,
        (
            data.get('title'),
            data.get('description'),
            data.get('minimum_experience'),
            json.dumps(data.get('required_skills', [])), # Save array as JSON string
            json.dumps(data.get('preferred_skills', [])), # Save array as JSON string
            profile_id
        )
    )
    conn.commit()
    conn.close()
