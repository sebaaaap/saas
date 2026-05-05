from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import List, Optional
from decimal import Decimal
from app.schemas.customers import CustomerResponse, VehicleResponse

class WorkOrderItemCreate(BaseModel):
    product_id: UUID
    quantity: Decimal
    unit_price: Decimal
    consumption_rate: Decimal = Decimal('1.0')

class WorkOrderItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_name: str
    product_type: str
    quantity: Decimal
    unit_price: Decimal
    consumption_rate: Decimal = Decimal('1.0')
    stock_reduced: Decimal = Decimal('0.0')
    subtotal: Decimal
    done: bool = False
    is_paid: bool = False
    
    class Config:
        from_attributes = True

class WorkOrderPaymentCreate(BaseModel):
    amount: Decimal
    payment_method: str
    item_ids: Optional[List[UUID]] = None

class WorkOrderPaymentResponse(BaseModel):
    id: UUID
    session_id: UUID
    amount: Decimal
    payment_method: str
    date_created: datetime
    
    class Config:
        from_attributes = True

class WorkOrderCreate(BaseModel):
    quote_id: Optional[UUID] = None
    customer_id: UUID
    vehicle_id: Optional[UUID] = None
    mileage: Optional[Decimal] = None
    notes: Optional[str] = None
    assigned_user_id: Optional[str] = None
    items: List[WorkOrderItemCreate] = []
    service_info: Optional[dict] = None

class WorkOrderResponse(BaseModel):
    id: UUID
    quote_id: Optional[UUID] = None
    customer_id: UUID
    vehicle_id: Optional[UUID] = None
    state: str
    mileage: Optional[Decimal] = None
    notes: Optional[str] = None
    assigned_user_id: Optional[str] = None
    service_info: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    items: List[WorkOrderItemResponse] = []
    payments: List[WorkOrderPaymentResponse] = []
    customer: Optional[CustomerResponse] = None
    vehicle: Optional[VehicleResponse] = None
    total_amount: Optional[Decimal] = None 
    total_payments: Optional[Decimal] = None
    pending_balance: Optional[Decimal] = None
    financial_progress: Optional[Decimal] = None
    operational_progress: Optional[Decimal] = None
    
    class Config:
        from_attributes = True

class WorkOrderBalanceResponse(BaseModel):
    work_order_id: UUID
    total_items: Decimal
    total_payments: Decimal
    balance: Decimal
