from uuid import UUID
from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal

class LocationBase(BaseModel):
    name: str
    zone: Optional[str] = None
    side: Optional[str] = None
    column: Optional[int] = None
    level: Optional[int] = None
    parent_id: Optional[UUID] = None
    path: Optional[str] = None
    allows_multiple_products: bool = True

class LocationCreate(LocationBase):
    pass

class AisleGenerate(BaseModel):
    zone_prefix: str    # Ej: "A"
    num_columns: int   # Ej: 10
    num_levels: int    # Ej: 7
    allows_multiple_products: bool = False # Por defecto pasillos son estrictos según requerimiento típico

class LocationResponse(LocationBase):
    id: UUID
    children: List['LocationResponse'] = [] # Nested response

    class Config:
        from_attributes = True

class ProductSupplierInfo(BaseModel):
    supplier_id: UUID
    supplier_code: str
    
    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    internal_reference: Optional[str] = None
    barcode: Optional[str] = None
    price: Decimal
    cost: Decimal
    uom: str = "unidades" 
    stock_quantity: Decimal = 0
    min_stock: Decimal = 5
    product_type: str = "STORABLE"
    location_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    is_variable_consumption: bool = False
    default_consumption_rate: Decimal = Decimal('1.0')
    suppliers_info: List[ProductSupplierInfo] = []

class ProductCreateWithLocation(ProductBase):
    pass

class ProductResponseWithLocation(ProductBase):
    id: UUID
    location: Optional[LocationBase]
    
    class Config:
        from_attributes = True
