from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException

from typing import List, Optional
from pydantic import BaseModel

from app.api.deps import get_tenant_session
from app.db.tenant_session import TenantSession
from app.models.base import PaymentMethodConfig
from app.api.deps import check_roles, get_tenant_session

router = APIRouter()

# ── Schemas ────────────────────────────────────────────────────────────────

class PaymentMethodConfigCreate(BaseModel):
    name: str
    key: str
    icon: Optional[str] = "Wallet"
    is_active: bool = True
    description: Optional[str] = None

class PaymentMethodConfigResponse(BaseModel):
    id: UUID
    name: str
    key: str
    icon: Optional[str]
    is_active: bool
    description: Optional[str]

    class Config:
        from_attributes = True

# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/", response_model=List[PaymentMethodConfigResponse])
def get_payment_methods(
    db: TenantSession = Depends(get_tenant_session),
    active_only: bool = True
):
    q = db.tenant_query(PaymentMethodConfig)
    if active_only:
        q = q.filter(PaymentMethodConfig.is_active == True)
    return q.all()

@router.post("/", response_model=PaymentMethodConfigResponse)
def create_payment_method(
    data: PaymentMethodConfigCreate,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin"]))
):
    existing = db.tenant_query(PaymentMethodConfig).filter(PaymentMethodConfig.key == data.key).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un método con esa clave")
    
    pm = PaymentMethodConfig(**data.model_dump())
    db.tenant_add(pm)
    db.commit()
    db.refresh(pm)
    return pm

@router.put("/{pm_id}", response_model=PaymentMethodConfigResponse)
def update_payment_method(
    pm_id: UUID,
    data: PaymentMethodConfigCreate,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin"]))
):
    pm = db.tenant_query(PaymentMethodConfig).filter(PaymentMethodConfig.id == pm_id).first()
    if not pm:
        raise HTTPException(status_code=404, detail="Método no encontrado")
    
    update_data = data.model_dump()
    for key, value in update_data.items():
        setattr(pm, key, value)
    
    db.commit()
    db.refresh(pm)
    return pm

@router.delete("/{pm_id}")
def delete_payment_method(
    pm_id: UUID,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin"]))
):
    pm = db.tenant_query(PaymentMethodConfig).filter(PaymentMethodConfig.id == pm_id).first()
    if not pm:
        raise HTTPException(status_code=404, detail="Método no encontrado")
    
    # No se permite eliminar las 4 por defecto
    if pm.key in ["efectivo", "tarjeta", "transferencia", "credito_interno"]:
        raise HTTPException(status_code=400, detail="No se pueden eliminar los métodos por defecto")
        
    db.delete(pm)
    db.commit()
    return {"status": "ok"}
