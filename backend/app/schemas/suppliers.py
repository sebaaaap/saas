from uuid import UUID
from pydantic import BaseModel
from typing import Optional, List

class SupplierBase(BaseModel):
    name: str
    tax_id: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierResponse(SupplierBase):
    id: UUID

    class Config:
        from_attributes = True
