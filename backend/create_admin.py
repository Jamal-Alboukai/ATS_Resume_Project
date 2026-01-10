# create_admin.py
from app import app, db
from models import User

with app.app_context():
    email = "admin@example.com"

    existing = User.query.filter_by(email=email).first()
    if existing:
        print("Admin already exists:", existing.email)
    else:
        admin = User(
            name="Super Admin",
            email=email,
            role="admin",
        )
        admin.set_password("StrongPassword123!")  # change this
        db.session.add(admin)
        db.session.commit()
        print("✅ Admin created:", email)
