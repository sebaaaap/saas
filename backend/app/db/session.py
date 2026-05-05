from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Detectar driver y ajustar argumentos
connect_args = {}
url = settings.DATABASE_URL

# Ajuste para SQLite (check_same_thread)
if "sqlite" in url:
    connect_args["check_same_thread"] = False
    # Hack para convertir aiosqlite a sqlite estandard para uso síncrono si fuera necesario
    # Pero aquí usaremos sessionmaker standard.
    # NOTA: En producción idealmente usaríamos AsyncSession pero para simplificar compatibilidad
    # con SQLite/Postgres y mantener el mismo código, usaremos SQLAlchemy Sync Engine
    # o bien adaptamos la URL.
    # Si la URL viene como 'sqlite+aiosqlite', SQLAlchemy create_engine fallará si no usamos create_async_engine.
    # Para mantener simplicidad y robustez en este prototipo, vamos a forzar drivers síncronos.
    url = url.replace("+aiosqlite", "").replace("+asyncpg", "")

engine = create_engine(
    url, 
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
