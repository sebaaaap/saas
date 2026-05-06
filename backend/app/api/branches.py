from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from typing import List

from app.models.base import Branch, UserBranchAccess
from app.schemas.branches import (
    BranchCreate, BranchUpdate, BranchResponse,
    UserBranchAccessCreate, UserBranchAccessResponse
)
from app.api.deps import check_roles, get_current_user, get_tenant_session
from app.db.tenant_session import TenantSession

router = APIRouter()

@router.get("/", response_model=List[BranchResponse])
def get_branches(
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(get_current_user)
):
    """Lista todas las sucursales del tenant (company) del usuario logueado."""
    if current_user.role.value == "admin":
        return db.tenant_query(Branch).all()
    
    # Si no es admin, solo las sucursales a las que tiene acceso
    user_accesses = db.tenant_query(UserBranchAccess).filter(
        UserBranchAccess.user_id == current_user.username
    ).all()
    branch_ids = [ua.branch_id for ua in user_accesses]
    return db.tenant_query(Branch).filter(
        Branch.id.in_(branch_ids), Branch.is_active == True
    ).all()

@router.post("/", response_model=BranchResponse, status_code=201)
def create_branch(
    branch_in: BranchCreate,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin"]))
):
    """Crea una nueva sucursal dentro del tenant del admin logueado."""
    if branch_in.is_default:
        # Solo resetear el default dentro del mismo tenant
        db.tenant_query(Branch).update({Branch.is_default: False})
        
    branch = Branch(**branch_in.model_dump())
    db.add(branch)  # auto-stampa company_id
    db.commit()
    db.refresh(branch)
    
    # Asignar acceso al admin creador por defecto
    access = UserBranchAccess(user_id=current_user.username, branch_id=branch.id)
    db.add(access)
    db.commit()
    
    return branch

@router.put("/{branch_id}", response_model=BranchResponse)
def update_branch(
    branch_id: UUID,
    branch_in: BranchUpdate,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin"]))
):
    """Actualiza una sucursal — solo si pertenece al mismo tenant."""
    branch = db.tenant_query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")
        
    update_data = branch_in.model_dump(exclude_unset=True)
    
    if update_data.get("is_default"):
        db.tenant_query(Branch).update({Branch.is_default: False})
        
    for field, value in update_data.items():
        setattr(branch, field, value)
        
    db.commit()
    db.refresh(branch)
    return branch

@router.post("/access", response_model=UserBranchAccessResponse, status_code=201)
def assign_branch_access(
    access_in: UserBranchAccessCreate,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin"]))
):
    """Asigna una sucursal a un usuario."""
    existing = db.tenant_query(UserBranchAccess).filter(
        UserBranchAccess.user_id == access_in.user_id,
        UserBranchAccess.branch_id == access_in.branch_id
    ).first()
    if existing:
        return existing
        
    access = UserBranchAccess(**access_in.model_dump())
    db.add(access)
    db.commit()
    db.refresh(access)
    return access

@router.delete("/access/{access_id}")
def remove_branch_access(
    access_id: UUID,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin"]))
):
    """Remueve el acceso de un usuario a una sucursal."""
    access = db.tenant_query(UserBranchAccess).filter(
        UserBranchAccess.id == access_id
    ).first()
    if not access:
        raise HTTPException(status_code=404, detail="Acceso no encontrado")
        
    db.delete(access)
    db.commit()
    return {"detail": "Acceso removido correctamente"}
