import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from fastapi import Header, Depends
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/pos_db")

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_tenant_id(tenant_id: str = Header(default="default", alias="X-Tenant-ID")) -> str:
    """Extrae el tenant_id de los headers, por defecto usa 'default' para local."""
    return tenant_id

def get_db_session(tenant_id: str = Depends(get_tenant_id)) -> Session:
    """
    Retorna una sesión con el esquema asignado para el tenant, implementando la estrategia multi-tenant.
    """
    db = SessionLocal()
    try:
        db.execute(text(f'SET search_path TO "{tenant_id}", public;'))
        db.commit() # Asegura que el cambio de esquema persista sincrónicamente
        yield db
    finally:
        db.close()
