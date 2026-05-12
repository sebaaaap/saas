from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Header

from typing import List, Optional

from app.api.deps import get_tenant_session
from app.db.tenant_session import TenantSession
from app.schemas.sessions import (
    CashSessionCreate, CashSessionClose, CashSessionResponse,
    CashRegisterCreate, CashRegisterResponse
)
from app.services.session_service import SessionService
from app.api.deps import check_roles, get_current_user

router = APIRouter()

# --- Cash Register Endpoints ---

@router.get("/registers", response_model=List[CashRegisterResponse])
def list_registers(
    available_only: bool = Query(False),
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "vendedor", "inventario"])),
    branch_id: Optional[UUID] = Header(None, alias="X-Branch-ID")
):
    """Lista terminales físicas (Cajas)"""
    if available_only:
        return SessionService.get_available_registers(db, branch_id)
    return SessionService.list_registers(db, active_only=False, branch_id=branch_id)

@router.post("/registers", response_model=CashRegisterResponse, status_code=201)
def create_register(
    data: CashRegisterCreate, 
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin"])),
    branch_id: Optional[UUID] = Header(None, alias="X-Branch-ID")
):
    """Crea una nueva terminal física"""
    register = SessionService.create_register(db, data)
    if branch_id:
        register.branch_id = branch_id
        db.commit()
    return register

@router.put("/registers/{register_id}", response_model=CashRegisterResponse)
def update_register(
    register_id: UUID,
    data: CashRegisterCreate,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin"]))
):
    """Actualiza una terminal física"""
    return SessionService.update_register(db, register_id, data)

@router.delete("/registers/{register_id}")
def delete_register(
    register_id: UUID,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin"]))
):
    """Desactiva una terminal física"""
    SessionService.delete_register(db, register_id)
    return {"detail": "Caja desactivada correctamente"}

# --- Cash Session Endpoints ---

@router.post("/open", response_model=CashSessionResponse, status_code=201)
def open_session(
    data: CashSessionCreate, 
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "vendedor"]))
):
    """
    Abre una nueva sesión de caja vinculada a una terminal.
    Si el usuario ya tiene una o la caja está ocupada, fallará.
    """
    return SessionService.open_session(db, data)

@router.post("/{session_id}/close", response_model=CashSessionResponse)
def close_session(
    session_id: UUID, 
    data: CashSessionClose, 
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "vendedor"]))
):
    """Cierra la sesión y realiza el arqueo"""
    return SessionService.close_session(db, session_id, data)

@router.get("/active", response_model=Optional[CashSessionResponse])
def get_active_session(
    user_id: Optional[str] = Query(None),
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(get_current_user),
    branch_id: Optional[UUID] = Header(None, alias="X-Branch-ID")
):
    """Obtiene la sesión abierta actual del usuario para la sucursal actual"""
    target_user_id = user_id or current_user.username
    session = SessionService.get_open_session(db, target_user_id, branch_id)
    return session

@router.get("/", response_model=List[CashSessionResponse])
def get_all_sessions(
    skip: int = 0,
    limit: int = 100,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin"]))
):
    return SessionService.get_all_sessions(db, skip, limit)
