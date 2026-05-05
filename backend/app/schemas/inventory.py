from uuid import UUID
from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import List, Optional
from app.models.base import MovementType
from decimal import Decimal

class InventoryMovementItemCreate(BaseModel):
    product_id: UUID
    quantity: Decimal

class InventoryMovementCreate(BaseModel):
    items: List[InventoryMovementItemCreate]
    type: str # ENUM como string: "IN_PURCHASE", etc
    reason: Optional[str] = None
    to_location_id: Optional[UUID] = None

class InventoryMovementItemDetail(BaseModel):
    id: UUID
    product_id: UUID
    product_name: str
    quantity: Decimal

    class Config:
        from_attributes = True

class InventoryMovementResponse(BaseModel):
    id: UUID
    date: datetime
    type: str # O MovementType si queremos el enum
    reason: Optional[str]
    items: List[InventoryMovementItemDetail] = []

    @field_validator('type', mode='before')
    @classmethod
    def enum_to_string(cls, v):
        if isinstance(v, MovementType):
            return v.name
        return v

    class Config:
        from_attributes = True

class InterBranchTransferCreate(BaseModel):
    items: List[InventoryMovementItemCreate]
    from_branch_id: UUID
    to_branch_id: UUID
    reason: Optional[str] = None
