"""
Script de Inicialización de Base de Datos
Crea el usuario administrador por defecto si no existe
EJECUTAR ESTE SCRIPT ANTES DE INICIAR LA APLICACIÓN POR PRIMERA VEZ
"""
import sys
from pathlib import Path

# Agregar el directorio raíz al path
sys.path.append(str(Path(__file__).parent.parent))

from app.db.session import SessionLocal, engine
from app.models.base import Base, User, UserRole
from app.core.security import get_password_hash

def init_db():
    """Inicializa la base de datos y crea el usuario admin por defecto"""
    
    # Crear todas las tablas
    print("🔧 Creando tablas en la base de datos...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tablas creadas exitosamente")
    
    # Crear sesión
    db = SessionLocal()
    
    try:
        # Verificar si existe el usuario admin
        admin_user = db.query(User).filter(User.username == "admin").first()
        
        if not admin_user:
            print("👤 Creando usuario administrador por defecto...")
            admin_user = User(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                full_name="Administrador del Sistema",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            
            print("✅ Usuario administrador creado exitosamente")
            print("   Username: admin")
            print("   Password: admin123")
            print("   ⚠️  IMPORTANTE: Cambie esta contraseña en producción")
        else:
            print("ℹ️  El usuario administrador ya existe")
        
        # Opcional: Crear un usuario vendedor de ejemplo
        seller_user = db.query(User).filter(User.username == "vendedor").first()
        if not seller_user:
            print("👤 Creando usuario vendedor de ejemplo...")
            seller_user = User(
                username="vendedor",
                hashed_password=get_password_hash("vendedor123"),
                full_name="Vendedor de Ejemplo",
                role=UserRole.SELLER,
                is_active=True
            )
            db.add(seller_user)
            db.commit()
            print("✅ Usuario vendedor creado")
            print("   Username: vendedor")
            print("   Password: vendedor123")
        
        print("\n🎉 Inicialización completada exitosamente")
        
    except Exception as e:
        print(f"❌ Error durante la inicialización: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("  INICIALIZACIÓN DE BASE DE DATOS - POS ANTIGRAVITY")
    print("=" * 60)
    init_db()
