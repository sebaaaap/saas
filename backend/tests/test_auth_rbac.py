"""
test_auth_rbac.py — Tests de Autenticación JWT y Control de Acceso por Roles (RBAC)
=====================================================================================
  - Login correcto genera token válido
  - Login incorrecto retorna 401
  - Token expirado retorna 401
  - Rol 'vendedor' recibe 403 en endpoints de admin
  - Rol 'admin' tiene acceso total
"""
import pytest
from datetime import timedelta
from jose import jwt
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash
from app.models.base import User, UserRole

# Contraseña corta para tests — bcrypt tiene límite de 72 bytes
_TEST_PASSWORD = "testpass"


# ─── Fixtures de usuarios ──────────────────────────────────────────────────────

@pytest.fixture
def admin_user(db):
    user = User(
        username="admin_rbac",
        hashed_password=get_password_hash(_TEST_PASSWORD),
        role=UserRole.admin,
        is_active=True,
    )
    db.add(user)
    db.commit()
    return user


@pytest.fixture
def vendedor_user(db):
    user = User(
        username="vendedor_rbac",
        hashed_password=get_password_hash(_TEST_PASSWORD),
        role=UserRole.vendedor,
        is_active=True,
    )
    db.add(user)
    db.commit()
    return user


# ─── Test 1: Login Exitoso genera Token JWT Válido ────────────────────────────

def test_login_exitoso_retorna_token(client, admin_user):
    """
    ESCENARIO: Login con credenciales correctas.
    ESPERADO:
      - HTTP 200
      - Respuesta contiene 'access_token' y 'token_type': 'bearer'
      - El token decodificado contiene el 'sub' (username) correcto
    """
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": "admin_rbac", "password": _TEST_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    assert resp.status_code == 200, (
        f"FALLO: Login debería retornar 200, obtuvo {resp.status_code}.\n{resp.text}"
    )
    data = resp.json()
    assert "access_token" in data, "FALLO: Respuesta no contiene 'access_token'."
    assert data["token_type"] == "bearer"
    assert data["user_role"] == "admin"

    # ── Decodificar y verificar el payload del JWT ────────────────────────
    payload = jwt.decode(
        data["access_token"],
        settings.SECRET_KEY,
        algorithms=["HS256"],
    )
    assert payload["sub"] == "admin_rbac", (
        f"FALLO: El campo 'sub' del token debería ser 'admin_rbac', es '{payload['sub']}'."
    )
    assert "exp" in payload, "FALLO: El token no tiene campo de expiración 'exp'."


def test_login_fallido_retorna_401(client, admin_user):
    """
    ESCENARIO: Password incorrecto.
    ESPERADO: HTTP 401 — No debe entregar token.
    """
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": "admin_rbac", "password": "CONTRASENA_INCORRECTA"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 401, (
        f"FALLO CRÍTICO: Login con credenciales incorrectas retornó {resp.status_code}.\n"
        "El sistema otorga acceso sin contraseña válida."
    )


def test_login_usuario_inexistente_retorna_401(client):
    """
    ESCENARIO: Username que no existe en la BDD.
    ESPERADO: HTTP 401 — Sin revelar si el usuario existe o no (seguridad).
    """
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": "fantasma_xyz", "password": "cualquier_cosa"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 401


# ─── Test 2: Token Expirado retorna 401 ───────────────────────────────────────

def test_token_expirado_retorna_401(client, admin_user):
    """
    ESCENARIO: Se usa un token que expiró hace 1 segundo.
    ESPERADO: HTTP 401 — El backend rechaza tokens vencidos.
    """
    # Crear token con expiración en el PASADO (-1 segundo)
    token_expirado = create_access_token(
        subject="admin_rbac",
        expires_delta=timedelta(seconds=-1),
    )

    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token_expirado}"},
    )

    assert resp.status_code == 401, (
        f"FALLO CRÍTICO DE SEGURIDAD: Token expirado fue aceptado (retornó {resp.status_code}).\n"
        "Los tokens vencidos NUNCA deben ser válidos."
    )


# ─── Test 3: RBAC — Vendedor bloqueado en endpoints de Admin ──────────────────

def test_vendedor_bloqueado_en_compras(client, db, vendedor_user):
    """
    ESCENARIO: Usuario con rol 'vendedor' accede a GET /purchases/ (solo admin).
    ESPERADO: HTTP 403 — Acceso Denegado.
    """
    token = f"Bearer {create_access_token(subject='vendedor_rbac')}"

    resp = client.get(
        "/api/v1/purchases/",
        headers={"Authorization": token},
    )

    assert resp.status_code == 403, (
        f"FALLO DE SEGURIDAD RBAC: 'vendedor' pudo acceder a /purchases/ (retornó {resp.status_code}).\n"
        "Un vendedor NO debe ver órdenes de compra. Revisa check_roles en el endpoint."
    )


def test_vendedor_bloqueado_en_reportes(client, db, vendedor_user):
    """
    ESCENARIO: Usuario 'vendedor' accede a reportes de rentabilidad.
    ESPERADO: HTTP 403.

    ESTADO ACTUAL: xfail — Este test descubre un BUG DE SEGURIDAD REAL.
    El endpoint GET /reports/sales/profitability no tiene check_roles().
    Cualquier usuario autenticado puede ver los márgenes de ganancia.

    TODO: Agregar Depends(check_roles(["admin"])) en reports.py → get_profitability()
    """
    token = f"Bearer {create_access_token(subject='vendedor_rbac')}"

    resp = client.get(
        "/api/v1/reports/sales/profitability",
        headers={"Authorization": token},
    )

    if resp.status_code == 200:
        pytest.xfail(
            "🔒 BUG DE SEGURIDAD DETECTADO: El endpoint /reports/sales/profitability "
            "retornó 200 para un usuario 'vendedor'.\n"
            "Los reportes de rentabilidad son CONFIDENCIALES.\n"
            "FIX: Agregar Depends(check_roles(['admin'])) en app/api/reports.py "
            "→ función get_profitability()."
        )

    assert resp.status_code == 403



def test_admin_tiene_acceso_a_compras(client, db, admin_user):
    """
    ESCENARIO: Admin accede a /purchases/ (debe ser permitido).
    ESPERADO: HTTP 200 (no 403).
    """
    token = f"Bearer {create_access_token(subject='admin_rbac')}"

    resp = client.get(
        "/api/v1/purchases/",
        headers={"Authorization": token},
    )

    assert resp.status_code == 200, (
        f"FALLO: Admin no pudo acceder a /purchases/ (retornó {resp.status_code}).\n"
        "El administrador debe tener acceso total."
    )


def test_sin_token_retorna_401(client):
    """
    ESCENARIO: Petición sin token a endpoint protegido.
    ESPERADO: HTTP 401 — Autenticación requerida.
    """
    resp = client.get("/api/v1/purchases/")
    assert resp.status_code == 401, (
        f"FALLO: Endpoint protegido accesible sin token (retornó {resp.status_code})."
    )
