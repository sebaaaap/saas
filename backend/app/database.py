import os
import contextvars
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker, Session, with_loader_criteria
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

# ContextVar to store the current company_id for the request lifecycle
current_company_id = contextvars.ContextVar('current_company_id', default=None)

@event.listens_for(Session, "do_orm_execute")
def _add_tenant_filter(execute_state):
    company_id = current_company_id.get()
    if company_id is None:
        return
        
    if execute_state.is_select:
        # Import inside the function to avoid circular imports
        from app.models.base import TenantModel
        execute_state.statement = execute_state.statement.options(
            with_loader_criteria(
                TenantModel,
                lambda cls: cls.company_id == company_id,
                include_aliases=True
            )
        )

@event.listens_for(Session, "before_flush")
def receive_before_flush(session, flush_context, instances):
    company_id = current_company_id.get()
    if not company_id:
        return
    
    from app.models.base import TenantModel
    for instance in session.new:
        if isinstance(instance, TenantModel):
            if not getattr(instance, 'company_id', None):
                instance.company_id = company_id

def get_tenant_id(tenant_id: str = Header(default="default", alias="X-Tenant-ID")) -> str:
    """Extrae el tenant_id de los headers, por defecto usa 'default' para local."""
    return tenant_id

def get_db_session(tenant_id: str = Depends(get_tenant_id)) -> Session:
    """
    Retorna una sesión con el esquema asignado para el tenant.
    El multi-tenant ahora se maneja por Row-Level Security usando company_id en la aplicación.
    Mantenemos el search_path por compatibilidad, pero la lógica fuerte está en SQLAlchemy.
    """
    db = SessionLocal()
    try:
        # db.execute(text(f'SET search_path TO "{tenant_id}", public;')) # Comentado si usamos un solo esquema
        # db.commit() 
        yield db
    finally:
        db.close()
