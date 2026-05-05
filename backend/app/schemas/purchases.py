from uuid import UUID
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from decimal import Decimal

class PurchaseItemCreate(BaseModel):
    product_id: UUID
    quantity: int
    unit_cost: Decimal

class PurchaseItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    quantity: int
    unit_cost: Decimal
    subtotal: Decimal
    
    class Config:
        from_attributes = True

class PurchaseCreate(BaseModel):
    supplier_id: Optional[UUID] = None
    invoice_number: Optional[str] = None
    purchase_category: Optional[str] = "MERCADERÍA"
    notes: Optional[str] = None
    items: List[PurchaseItemCreate]

class PurchaseUpdate(BaseModel):
    supplier_id: Optional[UUID] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None

class PurchaseResponse(BaseModel):
    id: UUID
    date_created: datetime
    supplier_id: Optional[UUID]
    invoice_number: Optional[str]
    purchase_category: Optional[str] = "MERCADERÍA"
    subtotal_net: Decimal
    tax_amount: Decimal
    total_cost: Decimal
    state: str
    notes: Optional[str]
    items: List[PurchaseItemResponse] = []
    
    class Config:
        from_attributes = True

