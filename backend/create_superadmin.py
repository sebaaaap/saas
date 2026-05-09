"""
Script para crear el usuario superadmin de la plataforma.
Ejecutar UNA sola vez:  python create_superadmin.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.base import User, UserRole
from app.core.security import get_password_hash
import uuid

USERNAME = "admin"
PASSWORD = "Elpapu123"   # ← Cambia esto antes de producción
FULL_NAME = "Seo Sebastian"

def main():
    db = SessionLocal()
    
    # Check if already exists
    existing = db.query(User).filter(User.username == USERNAME).first()
    if existing:
        print(f"✅ El usuario '{USERNAME}' ya existe.")
        db.close()
        return
    
    user = User(
        id=uuid.uuid4(),
        username=USERNAME,
        full_name=FULL_NAME,
        hashed_password=get_password_hash(PASSWORD),
        role=UserRole.superadmin,
        is_active=True,
        company_id=None,   # superadmin is not tied to any company
    )
    db.add(user)
    db.commit()
    print(f"✅ Usuario superadmin creado:")
    print(f"   Usuario:    {USERNAME}")
    print(f"   Contraseña: {PASSWORD}")
    print(f"   Accede en:  /superadmin")
    db.close()

if __name__ == "__main__":
    main()
