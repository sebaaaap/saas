from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import List, Optional
from decimal import Decimal
from app.schemas.customers import CustomerResponse, VehicleResponse

class QuoteItemCreate(BaseModel):
    product_id: UUID
    quantity: Decimal
    unit_price: Decimal
    consumption_rate: Decimal = Decimal('1.0')

class QuoteItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_name: str
    product_type: str
    quantity: Decimal
    unit_price: Decimal
    consumption_rate: Decimal = Decimal('1.0')
    stock_reduced: Decimal = Decimal('0.0')
    subtotal: Decimal
    
    class Config:
        from_attributes = True

class QuoteCreate(BaseModel):
    customer_id: UUID
    vehicle_id: Optional[UUID] = None
    mileage: Optional[Decimal] = None
    items: List[QuoteItemCreate]
    service_info: Optional[dict] = None
    is_ot: bool = False

class QuoteResponse(BaseModel):
    id: UUID
    customer_id: UUID
    vehicle_id: Optional[UUID] = None
    total: Decimal
    mileage: Optional[Decimal] = None
    state: str
    service_info: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    items: List[QuoteItemResponse] = []
    customer: Optional[CustomerResponse] = None
    vehicle: Optional[VehicleResponse] = None
    
    class Config:
        from_attributes = True

class QuoteUpdateState(BaseModel):
    state: str
