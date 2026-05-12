from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_tenant_session
from app.db.tenant_session import TenantSession
from app.models.base import Supplier
from app.schemas.suppliers import SupplierCreate, SupplierResponse
from typing import List

router = APIRouter()

@router.post("/", response_model=SupplierResponse)
def create_supplier(data: SupplierCreate, db: TenantSession = Depends(get_tenant_session)):
    db_obj = Supplier(**data.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/", response_model=List[SupplierResponse])
def list_suppliers(db: TenantSession = Depends(get_tenant_session)):
    return db.tenant_query(Supplier).all()

@router.get("/{id}", response_model=SupplierResponse)
def get_supplier(id: UUID, db: TenantSession = Depends(get_tenant_session)):
    obj = db.tenant_query(Supplier).filter(Supplier.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return obj
