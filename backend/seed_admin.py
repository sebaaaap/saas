"""
Script para crear el usuario administrador inicial.
Correr con: docker exec -it pos_backend_local python seed_admin.py
"""
import sys
import uuid
from app.database import SessionLocal
from app.models.base import User, UserRole
from app.core.security import get_password_hash

USERNAME = "admin"
PASSWORD = "admin123"
FULL_NAME = "Administrador"

db = SessionLocal()
try:
    existing = db.query(User).filter(User.username == USERNAME).first()
    if existing:
        print(f"El usuario '{USERNAME}' ya existe. No se creó otro.")
        sys.exit(0)

    admin = User(
        id=uuid.uuid4(),
        username=USERNAME,
        hashed_password=get_password_hash(PASSWORD),
        role=UserRole.admin,
        is_active=True,
        full_name=FULL_NAME,
    )
    db.add(admin)
    db.commit()
    print(f"")
    print(f"  Usuario admin creado exitosamente!")
    print(f"  Username : {USERNAME}")
    print(f"  Password : {PASSWORD}")
    print(f"")
except Exception as e:
    print(f"ERROR: {e}")
    db.rollback()
finally:
    db.close()
