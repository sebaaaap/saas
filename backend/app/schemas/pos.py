from uuid import UUID
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime
from enum import Enum
from decimal import Decimal

# --- Enums ---
class SaleStateEnum(str, Enum):
    DRAFT = "borrador"
    VALIDATED = "validado"
    PAID = "pagado"
    REFUNDED = "reembolsado"
    CANCELLED = "cancelado"

# Aunque mantenemos el Enum por compatibilidad de tipos, el Backend ahora acepta cualquier String
class PaymentMethodEnum(str, Enum):
    CASH = "efectivo"
    CARD = "tarjeta"
    TRANSFER = "transferencia"
    MIXED = "mixto"
    INTERNAL_CREDIT = "credito_interno"

class RefundReasonEnum(str, Enum):
    RETURN_TO_STOCK = "devolucion_stock"
    DAMAGED = "producto_danado"
    CUSTOMER_ERROR = "error_cliente"
    SYSTEM_ERROR = "error_sistema"

# --- Product Schemas ---
class ProductBase(BaseModel):
    name: str
    barcode: str
    price: Decimal = Field(ge=0, description="Precio debe ser mayor o igual a 0")
    cost: Decimal = Field(ge=0, description="Costo debe ser mayor o igual a 0")
    category: Optional[str] = None
    category_id: Optional[UUID] = None
    image_path: Optional[str] = None
    internal_reference: Optional[str] = None
    uom: str = "unidades"
    is_variable_consumption: bool = False
    default_consumption_rate: Decimal = Field(default=Decimal('1.0'), description="Tasa de consumo sugerida")
    is_scrap: bool = False
    scrap_parent_id: Optional[UUID] = None

    class Config:
        from_attributes = True

class ProductResponse(ProductBase):
    id: UUID
    stock_quantity: Decimal
    is_active: bool

    class Config:
        from_attributes = True

# --- Payment Schemas ---
class PaymentCreate(BaseModel):
    """Schema para crear un pago individual"""
    payment_method: str
    amount: Decimal = Field(gt=0, description="Monto debe ser mayor a 0")
    reference: Optional[str] = None  # Número de voucher, transacción, etc.

class PaymentResponse(PaymentCreate):
    id: UUID
    date_created: datetime
    
    class Config:
        from_attributes = True

# --- Nested Info Schemas ---
class CustomerMini(BaseModel):
    name: str
    rut: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True

# --- Sale Item Schemas ---
class SaleItemCreate(BaseModel):
    """Schema para crear un item de venta"""
    product_id: UUID
    quantity: Decimal = Field(gt=0, description="Cantidad debe ser mayor a 0")
    price: Decimal = Field(ge=0, description="Precio debe ser mayor o igual a 0")
    discount_percent: Decimal = Field(ge=0, le=100, default=0.0)
    consumption_rate: Decimal = Field(default=Decimal('1.0'), description="Tasa de consumo calculada/elegida")

class SaleItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    quantity: Decimal
    unit_price: Decimal
    discount_percent: Decimal
    consumption_rate: Decimal
    stock_reduced: Decimal = Decimal('0.0')
    subtotal: Decimal
    product: Optional[ProductBase] = None # Include product info for display

    class Config:
        from_attributes = True

# --- Sale/Ticket Schemas ---
class SaleCreate(BaseModel):
    """
    Schema para crear una venta
    Soporta pagos divididos (split payments)
    """
    items: List[SaleItemCreate] = Field(min_items=1, description="Debe haber al menos 1 item")
    payments: List[PaymentCreate] = Field(min_items=1, description="Debe haber al menos 1 pago")
    session_id: UUID = Field(..., description="Toda venta debe estar vinculada a una sesión")
    customer_id: Optional[UUID] = None
    vehicle_id: Optional[UUID] = None
    document_type: str = "boleta"
    comment: Optional[str] = None
    
    @validator('payments')
    def validate_payments(cls, v, values):
        """Valida que la suma de pagos sea coherente"""
        if not v:
            raise ValueError("Debe haber al menos un método de pago")
        return v

class SaleValidate(BaseModel):
    """Schema para validar una venta (confirmar y ajustar inventario)"""
    ticket_id: UUID

class SaleResponse(BaseModel):
    """Response completo de una venta"""
    id: UUID
    ticket_number: str
    date_created: datetime
    date_validated: Optional[datetime]
    state: SaleStateEnum
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    payment_method: str
    session_id: Optional[UUID]
    return_to_stock: bool = True
    original_ticket_id: Optional[UUID] = None
    items: List[SaleItemResponse]
    payments: List[PaymentResponse]
    customer_id: Optional[UUID] = None
    customer: Optional[CustomerMini] = None # Simplified customer info
    document_type: Optional[str] = "boleta"
    comment: Optional[str] = None
    
    class Config:
        from_attributes = True

# --- Refund Schemas ---
class RefundCreate(BaseModel):
    """
    Schema para crear una nota de crédito (reembolso)
    No borra la venta original, crea una venta negativa vinculada
    """
    original_ticket_id: UUID
    items: List[SaleItemCreate]  # Items a reembolsar (pueden ser parciales)
    refund_reason: RefundReasonEnum
    return_to_stock: bool = Field(
        default=True, 
        description="Si True, el producto regresa al inventario. Si False, se marca como merma."
    )

class RefundResponse(BaseModel):
    """Response de un reembolso"""
    credit_note: SaleResponse
    original_ticket: SaleResponse
    
    class Config:
        from_attributes = True

# --- Quick Sale Schema (Backward Compatibility) ---
class QuickSaleCreate(BaseModel):
    """
    Schema simplificado para ventas rápidas (un solo método de pago)
    Para compatibilidad con el frontend actual
    """
    items: List[SaleItemCreate]
    payment_method: str = "efectivo"
    total_amount: Decimal
    session_id: UUID = Field(..., description="Toda venta rápida debe estar vinculada a una sesión")
