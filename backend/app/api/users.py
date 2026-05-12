from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user, get_tenant_session
from app.api.deps import get_tenant_session
from app.db.tenant_session import TenantSession
from app.models.base import User, UserRole
from app.schemas.auth import UserCreate, UserUpdate, UserResponse
from app.core import security

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
def get_users(
    db: TenantSession = Depends(get_tenant_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    # tenant_query filtra automáticamente por company_id del usuario logueado
    return db.tenant_query(User).all()

@router.post("/", response_model=UserResponse)
def create_user(
    *,
    db: TenantSession = Depends(get_tenant_session),
    user_in: UserCreate,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Verificar username único SOLO dentro de la misma company
    user = db.tenant_query(User).filter(User.username == user_in.username).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="El nombre de usuario ya existe.",
        )
    
    if user_in.email:
        user_email = db.tenant_query(User).filter(User.email == user_in.email).first()
        if user_email:
            raise HTTPException(
                status_code=400,
                detail="El correo ya está registrado.",
            )

    db_obj = User(
        username=user_in.username,
        email=user_in.email,
        phone=user_in.phone,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        is_active=user_in.is_active,
        branch_id=user_in.branch_id,
        # company_id se estampa automáticamente por tenant_add()
    )
    db.add(db_obj)  # usa tenant_add internamente → auto company_id
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    *,
    db: TenantSession = Depends(get_tenant_session),
    user_id: UUID,
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Solo puede editar usuarios de su propia empresa
    db_obj = db.tenant_query(User).filter(User.id == user_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    update_data = user_in.dict(exclude_unset=True)
    if "password" in update_data:
        hashed_password = security.get_password_hash(update_data["password"])
        db_obj.hashed_password = hashed_password
        del update_data["password"]
    
    for field in update_data:
        setattr(db_obj, field, update_data[field])
        
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.delete("/{user_id}", response_model=UserResponse)
def delete_user(
    *,
    db: TenantSession = Depends(get_tenant_session),
    user_id: UUID,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Solo puede eliminar usuarios de su propia empresa
    user = db.tenant_query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")

    db.delete(user)
    db.commit()
    return user
