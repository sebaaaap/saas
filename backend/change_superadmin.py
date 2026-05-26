import os
import sys

# Add the current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.base import User, UserRole
from app.core import security

def change_superadmin_password():
    db = SessionLocal()
    try:
        superadmin = db.query(User).filter(User.role == UserRole.superadmin).first()
        if not superadmin:
            print("Superadmin not found!")
            return
        
        superadmin.hashed_password = security.get_password_hash("Elpapu123")
        db.commit()
        print("Superadmin password changed successfully to Elpapu123")
    finally:
        db.close()

if __name__ == "__main__":
    change_superadmin_password()
