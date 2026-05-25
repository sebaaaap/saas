from uuid import UUID
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core import security
from app.database import get_db_session
from app.models.base import User, UserRole, CashSession
from app.schemas.auth import TokenData
from app.db.tenant_session import TenantSession

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(
    db: Session = Depends(get_db_session),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    # Set the global multi-tenant context for all subsequent DB operations
    from app.database import current_company_id
    current_company_id.set(user.company_id)
        
    return user


def get_tenant_session(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> TenantSession:
    """
    Returns a TenantSession scoped to the current user's company.
    All queries via tenant_query() and adds via tenant_add() / add()
    are automatically isolated to current_user.company_id.
    """
    return TenantSession(db=db, company_id=current_user.company_id)


def check_roles(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        # Obtener el valor del rol del usuario (string)
        user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
        
        # El superadmin tiene acceso irrestricto a todos los módulos
        if user_role == 'superadmin':
            return current_user
            
        # Verificar si el rol del usuario está en la lista de roles permitidos
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: User role '{user_role}' not in allowed roles {allowed_roles}"
            )
        return current_user
    return role_checker
def require_active_session(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
) -> CashSession:
    """Verifica que el usuario tenga una sesión de caja abierta"""
    session = db.query(CashSession).filter(
        CashSession.user_id == current_user.username,
        CashSession.status == "open"
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apertura de caja requerida. No tienes una sesión activa en este momento."
        )
    return session
