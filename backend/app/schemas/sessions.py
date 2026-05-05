from uuid import UUID
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from decimal import Decimal

# --- Cash Register Schemas ---
class CashRegisterBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class CashRegisterCreate(CashRegisterBase):
    pass

class CashRegisterResponse(CashRegisterBase):
    id: UUID
    class Config:
        from_attributes = True

# --- Cash Session Schemas ---
class CashSessionCreate(BaseModel):
    """Schema para abrir una sesión de caja"""
    opening_balance: Decimal = Field(ge=0, description="Efectivo inicial debe ser mayor o igual a 0")
    user_id: str
    cash_register_id: UUID
    notes: Optional[str] = None

class CashSessionClose(BaseModel):
    """Schema para cerrar una sesión de caja"""
    closing_balance: Decimal = Field(ge=0, description="Efectivo final contado por el cajero")
    notes: Optional[str] = None

class CashSessionResponse(BaseModel):
    """Response completo de una sesión"""
    id: UUID
    user_id: str
    cash_register_id: UUID
    opened_at: datetime
    closed_at: Optional[datetime]
    status: str
    opening_balance: Decimal
    closing_balance: Optional[Decimal]
    expected_balance: Decimal
    difference: Decimal
    total_sales_cash: Decimal
    total_sales_card: Decimal
    total_sales_transfer: Decimal
    notes: Optional[str]
    
    cash_register: Optional[CashRegisterResponse] = None

    class Config:
        from_attributes = True

class CashSessionSummary(BaseModel):
    """Resumen de sesión para reportes"""
    id: UUID
    opened_at: datetime
    closed_at: Optional[datetime]
    total_sales: Decimal
    total_transactions: int
    difference: Decimal
    status: str
