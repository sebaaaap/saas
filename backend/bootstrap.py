import sys
import os
import uuid
from sqlalchemy import create_engine, text
from passlib.context import CryptContext

# Aseguramos de que python encuentre el módulo 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, SessionLocal
from app.models.base import Base, User, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def main():
    print("--- INICIANDO BOOTSTRAP DE EMERGENCIA ---")

    print(f"URL de base de datos: {engine.url}")
    
    # Debido a Postgresql, drop_all() y create_all() trabajan por defecto en public,
    # a menos que pasemos un schema_translate_map o seteemos el search_path en la conexion actual
    # Vamos a usar una conexion específica al schema para recrear y borrar todo.
    engine_tenant = create_engine(engine.url, connect_args={"options": "-csearch_path=default,public"})
    
    with engine_tenant.connect() as conn:
        print("1. Asegurando esquema 'default' para el entorno Multi-tenant...")
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS \"default\";"))
        conn.commit()

    print("2. Borrando tablas existentes...")
    Base.metadata.drop_all(bind=engine_tenant)
    
    print("3. Creando tablas con el nuevo BaseModel (UUIDs)...")
    Base.metadata.create_all(bind=engine_tenant)
    
    print("4. Insertando usuario Admin Maestro...")
    session = SessionLocal()
    session.execute(text('SET search_path TO "default", public;'))
    
    try:
        admin_user = User(
            id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
            username="admin",
            email="admin@maestro.com",
            hashed_password=pwd_context.hash("admin123"),
            full_name="Administrador Maestro",
            role=UserRole.admin,
            is_active=True
        )
        session.add(admin_user)
        session.commit()
        print("=> Admin Maestro creado exitosamente (UUID fijo).")
    except Exception as e:
        session.rollback()
        print(f"Error al crear el admin: {e}")
    finally:
        session.close()
        
    print("--- BOOTSTRAP COMPLETADO CON ÉXITO ---")

if __name__ == "__main__":
    main()
