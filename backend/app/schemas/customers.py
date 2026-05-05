from uuid import UUID
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum
from decimal import Decimal

class VehicleType(str, Enum):
    automovil = "automovil"
    motocicleta = "motocicleta"
    camion = "camion"
    furgon = "furgon"
    camioneta = "camioneta"
    otro = "otro"

class VehicleBase(BaseModel):
    license_plate: str
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    vehicle_type: VehicleType = VehicleType.automovil
    color: Optional[str] = None
    vin: Optional[str] = None
    service_info: Optional[dict] = None

class VehicleCreate(VehicleBase):
    customer_id: Optional[UUID] = None

class VehicleUpdate(BaseModel):
    license_plate: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    vehicle_type: Optional[VehicleType] = None
    color: Optional[str] = None
    vin: Optional[str] = None
    service_info: Optional[dict] = None

class VehicleResponse(VehicleBase):
    id: UUID
    customer_id: UUID
    
    class Config:
        from_attributes = True

class CustomerBase(BaseModel):
    name: str
    rut: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    rut: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: UUID
    vehicles: List[VehicleResponse] = []
    
    class Config:
        from_attributes = True

class CustomerSalesHistory(BaseModel):
    id: UUID
    name: str
    rut: str
    total_spent: Decimal
    tickets_count: int
    last_sale_date: Optional[datetime]
    
    class Config:
        from_attributes = True
