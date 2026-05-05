from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.database import get_db_session
from app.models.base import Branch, UserBranchAccess
from app.schemas.branches import (
    BranchCreate, BranchUpdate, BranchResponse,
    UserBranchAccessCreate, UserBranchAccessResponse
)
from app.api.deps import check_roles, get_current_user

router = APIRouter()

@router.get("/", response_model=List[BranchResponse])
def get_branches(
    db: Session = Depends(get_db_session),
    current_user = Depends(get_current_user)
):
    """Lista todas las sucursales (admin) o las asignadas al usuario."""
    # Si es admin, ve todas
    if current_user.role == "admin":
        return db.query(Branch).all()
    
    # Si no, ve solo a las que tiene acceso
    user_accesses = db.query(UserBranchAccess).filter(UserBranchAccess.user_id == current_user.username).all()
    branch_ids = [ua.branch_id for ua in user_accesses]
    return db.query(Branch).filter(Branch.id.in_(branch_ids), Branch.is_active == True).all()

@router.post("/", response_model=BranchResponse, status_code=201)
def create_branch(
    branch_in: BranchCreate,
    db: Session = Depends(get_db_session),
    current_user = Depends(check_roles(["admin"]))
):
    """Crea una nueva sucursal."""
    # Si es la primera o se marca como default, quitar default a las demás
    if branch_in.is_default:
        db.query(Branch).update({Branch.is_default: False})
        
    branch = Branch(**branch_in.model_dump())
    db.add(branch)
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
    db: Session = Depends(get_db_session),
    current_user = Depends(check_roles(["admin"]))
):
    """Actualiza una sucursal."""
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")
        
    update_data = branch_in.model_dump(exclude_unset=True)
    
    if update_data.get("is_default"):
        db.query(Branch).update({Branch.is_default: False})
        
    for field, value in update_data.items():
        setattr(branch, field, value)
        
    db.commit()
    db.refresh(branch)
    return branch

@router.post("/access", response_model=UserBranchAccessResponse, status_code=201)
def assign_branch_access(
    access_in: UserBranchAccessCreate,
    db: Session = Depends(get_db_session),
    current_user = Depends(check_roles(["admin"]))
):
    """Asigna una sucursal a un usuario."""
    existing = db.query(UserBranchAccess).filter(
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
    db: Session = Depends(get_db_session),
    current_user = Depends(check_roles(["admin"]))
):
    """Remueve el acceso de un usuario a una sucursal."""
    access = db.query(UserBranchAccess).filter(UserBranchAccess.id == access_id).first()
    if not access:
        raise HTTPException(status_code=404, detail="Acceso no encontrado")
        
    db.delete(access)
    db.commit()
    return {"detail": "Acceso removido correctamente"}
