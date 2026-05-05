"""
conftest.py — Fixtures globales de Pytest
==========================================
- Crea una BDD SQLite en memoria por cada función de test (aislamiento total).
- Provee un TestClient de FastAPI con la BDD de test inyectada.
- Provee helpers para crear tokens JWT de test según rol.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import timedelta

from app.main import app
from app.db.session import get_db
from app.models.base import Base, User, UserRole
from app.core import security
from app.core.security import get_password_hash   # ← usa el helper del propio proyecto

# ─── Base de Datos en Memoria ─────────────────────────────────────────────────
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,  # Una sola conexión compartida → ideal para SQLite en memoria
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Contraseña corta para evitar el límite de 72 bytes de bcrypt
_TEST_PASSWORD = "testpass"


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Crea todas las tablas una vez por sesión completa de testing."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db(setup_database):
    """
    Provee una sesión de BDD aislada por test.
    Usa rollback al finalizar para que cada test empiece limpio.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db):
    """
    TestClient de FastAPI compatible con httpx 0.28+.
    IMPORTANTE: El override debe ser sobre get_db_session (no get_db),
    que es la dependencia que usan los endpoints reales.
    """
    from app.database import get_db_session

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db_session] = override_get_db
    # Instanciación directa: compatible con starlette 0.36 + httpx 0.28
    test_client = TestClient(app, raise_server_exceptions=False)
    yield test_client
    app.dependency_overrides.clear()



# ─── Helpers de Autenticación ─────────────────────────────────────────────────

def _create_user_and_token(db, username: str, role: UserRole) -> str:
    """
    Crea un usuario en la BDD de test y retorna un Bearer token JWT.
    Usa get_password_hash del proyecto (bcrypt) con contraseña corta
    para evitar el error 'password cannot be longer than 72 bytes'.
    """
    user = User(
        username=username,
        hashed_password=get_password_hash(_TEST_PASSWORD),   # ← contraseña corta
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # security.create_access_token acepta subject= (no data=) según el código real
    token = security.create_access_token(subject=username)
    return f"Bearer {token}"


@pytest.fixture
def admin_token(db) -> str:
    return _create_user_and_token(db, "admin_test", UserRole.admin)


@pytest.fixture
def vendedor_token(db) -> str:
    return _create_user_and_token(db, "vendedor_test", UserRole.vendedor)


@pytest.fixture
def inventario_token(db) -> str:
    return _create_user_and_token(db, "inventario_test", UserRole.inventario)
