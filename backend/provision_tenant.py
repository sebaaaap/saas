import argparse
import os
from sqlalchemy import create_engine, text
from app.database import DATABASE_URL
from app.models.base import Base
from app.core.security import get_password_hash
from app.models.base import User, UserRole

def provision_tenant(tenant_name: str, admin_email: str, admin_password: str):
    """
    Crea un nuevo esquema en PostgreSQL para un cliente nuevo y crea todas sus tablas.
    """
    engine = create_engine(DATABASE_URL)
    
    # 1. Crear el esquema
    print(f"📦 Provisionando nuevo tenant: {tenant_name}")
    with engine.connect() as conn:
        conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{tenant_name}";'))
        conn.commit()
        print(f"✅ Esquema '{tenant_name}' creado.")

    # 2. Configurar el motor de SQLAlchemy para que apunte solo a este esquema
    engine_tenant = create_engine(DATABASE_URL, connect_args={"options": f"-csearch_path={tenant_name},public"})
    
    # 3. Crear las tablas dentro de este esquema
    print("🏗️  Creando tablas en la base de datos...")
    Base.metadata.create_all(bind=engine_tenant)
    print("✅ Tablas creadas con éxito.")
    
    # 4. Crear el usuario Administrador del nuevo taller
    print("👤 Creando usuario Administrador inicial...")
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_tenant)
    db = SessionLocal()
    
    try:
        # Verificar si el admin ya existe en este esquema
        existing_admin = db.query(User).filter(User.username == "admin").first()
        if existing_admin:
            print("⚠️  El usuario 'admin' ya existe en este tenant.")
        else:
            new_admin = User(
                username="admin",
                email=admin_email,
                full_name=f"Admin {tenant_name.capitalize()}",
                hashed_password=get_password_hash(admin_password),
                role=UserRole.admin,
                is_active=True
            )
            db.add(new_admin)
            db.commit()
            print(f"✅ Administrador creado! (Usuario: admin | Contraseña: {admin_password})")
            
    except Exception as e:
        print(f"❌ Error creando administrador: {e}")
        db.rollback()
    finally:
        db.close()
        
    print("\n🚀 ¡TENANT LISTO PARA USAR EN PRODUCCIÓN!")
    print(f"➡️  Accede desde: https://{tenant_name}.tudominio.cl")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Provisionar un nuevo cliente (tenant) en la base de datos.")
    parser.add_argument("tenant_name", type=str, help="Nombre corto del cliente, sin espacios (ej: tallergonzalez)")
    parser.add_argument("--email", type=str, default="admin@taller.cl", help="Email del administrador")
    parser.add_argument("--password", type=str, default="123456", help="Contraseña del administrador")
    
    args = parser.parse_args()
    
    # Sanitizar el nombre del tenant para evitar inyecciones SQL
    clean_tenant_name = "".join(c for c in args.tenant_name.lower() if c.isalnum())
    
    provision_tenant(clean_tenant_name, args.email, args.password)
