import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Boolean, Enum, Text, Numeric, JSON, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import sqlalchemy.orm as sqlalchemy_orm

Base = declarative_base()

class BaseModel(Base):
    __abstract__ = True

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class Company(BaseModel):
    __tablename__ = "companies"
    
    name = Column(String, index=True, nullable=False)
    business_name = Column(String, nullable=True)
    tax_id = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    subscription_plan = Column(String, default="free")
    logo_url = Column(String, nullable=True)

class TenantModel(BaseModel):
    __abstract__ = True
    
    @sqlalchemy_orm.declared_attr
    def company_id(cls):
        return Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=True, index=True)


class Branch(TenantModel):
    __tablename__ = "branches"
    
    name = Column(String, index=True, nullable=False)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    
    # Relaciones
    users = relationship("UserBranchAccess", back_populates="branch", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="branch")
    storage_locations = relationship("StorageLocation", back_populates="branch")
    cash_registers = relationship("CashRegister", back_populates="branch")
    tickets = relationship("Ticket", back_populates="branch")
    purchases = relationship("Purchase", back_populates="branch")
    work_orders = relationship("WorkOrder", back_populates="branch")
    quotes = relationship("Quote", back_populates="branch")

class UserBranchAccess(TenantModel):
    __tablename__ = "user_branch_access"
    
    user_id = Column(String, index=True, nullable=False)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    
    branch = relationship("Branch", back_populates="users")

class MovementType(enum.Enum):
    IN_PURCHASE = "entrada_compra"
    IN_RETURN = "entrada_devolucion"
    IN_ADJUSTMENT = "entrada_ajuste"
    OUT_SALE = "salida_venta"
    OUT_WASTE = "salida_merma"
    OUT_ADJUSTMENT = "salida_ajuste"
    INTERNAL_TRANSFER = "traslado_interno"
    BRANCH_TRANSFER_OUT = "traslado_sucursal_salida"
    BRANCH_TRANSFER_IN = "traslado_sucursal_entrada"

class ProductType(enum.Enum):
    STORABLE = "STORABLE"
    SERVICE = "SERVICE"
    CONSUMABLE = "CONSUMABLE"

class PurchaseState(enum.Enum):
    DRAFT = "borrador"
    CONFIRMED = "confirmado"
    CANCELLED = "cancelado"

class PurchaseCategory(enum.Enum):
    MERCADERIA = "MERCADERÍA"       # Afecta inventario
    GASTO_OPERATIVO = "GASTO_OPERATIVO"  # Servicios, arriendo, gas, etc.
    MIXTO = "MIXTO"                  # Contiene ambos tipos

class SaleState(enum.Enum):
    DRAFT = "borrador"
    VALIDATED = "validado"
    PAID = "pagado"
    REFUNDED = "reembolsado"
    CANCELLED = "cancelado"

class QuoteState(enum.Enum):
    DRAFT = "borrador"
    SENT = "enviado"
    APPROVED = "aprobado"
    REJECTED = "rechazado"

class WorkOrderState(enum.Enum):
    OPEN = "abierta"
    IN_PROGRESS = "en_progreso"
    READY = "lista"
    COMPLETED = "finalizada"

class PaymentMethod(enum.Enum):
    CASH = "efectivo"
    CARD = "tarjeta"
    TRANSFER = "transferencia"
    MIXED = "mixto"
    INTERNAL_CREDIT = "credito_interno" # Nuevo por defecto

class PaymentMethodConfig(TenantModel):
    __tablename__ = "payment_method_configs"
    
    name = Column(String, nullable=False, index=True) # "Efectivo", "Tarjeta", "Crédito Interno"
    key = Column(String, nullable=False) # "efectivo", "tarjeta", "credito_interno"
    icon = Column(String, nullable=True, default="Wallet") # Icono Lucide
    is_active = Column(Boolean, default=True)
    description = Column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint('company_id', 'key', name='uix_payment_method_company_key'),
    )

class RefundReason(enum.Enum):
    RETURN_TO_STOCK = "devolucion_stock"
    DAMAGED = "producto_danado"
    CUSTOMER_ERROR = "error_cliente"
    SYSTEM_ERROR = "error_sistema"

class StorageLocation(TenantModel):
    __tablename__ = "storage_locations"

    name = Column(String, nullable=False)
    zone = Column(String, nullable=True)
    side = Column(String, nullable=True)
    column = Column(Integer, nullable=True)
    level = Column(Integer, nullable=True)
    
    parent_id = Column(UUID(as_uuid=True), ForeignKey("storage_locations.id"), nullable=True)
    path = Column(String, index=True)
    allows_multiple_products = Column(Boolean, default=True, nullable=False)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=True)
    
    children = relationship("StorageLocation", backref=sqlalchemy_orm.backref("parent", remote_side="StorageLocation.id"))
    products = relationship("Product", back_populates="location")
    branch = relationship("Branch", back_populates="storage_locations")

class ProductCategory(TenantModel):
    __tablename__ = "product_categories"
    
    name = Column(String, nullable=False, index=True)
    color = Column(String, nullable=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("product_categories.id"), nullable=True)
    
    products = relationship("Product", back_populates="category_rel")

    __table_args__ = (
        UniqueConstraint('name', 'company_id', 'parent_id', name='uix_category_name_company_parent'),
    )

class Product(TenantModel):
    __tablename__ = "products"

    name = Column(String, index=True, nullable=False)
    internal_reference = Column(String, index=True, nullable=True) # sku
    barcode = Column(String, index=True, nullable=False) # codigo_barra
    
    price = Column(Numeric(12, 2), nullable=False, default=0.0) 
    cost = Column(Numeric(12, 2), nullable=False, default=0.0)  
    
    uom = Column(String, default="unidades")
    is_variable_consumption = Column(Boolean, default=False)
    default_consumption_rate = Column(Numeric(12, 3), default=1.0)
    
    product_type = Column(Enum(ProductType), default=ProductType.STORABLE)
    location_id = Column(UUID(as_uuid=True), ForeignKey("storage_locations.id"), nullable=True)
    
    category_id = Column(UUID(as_uuid=True), ForeignKey("product_categories.id"), nullable=True)
    category = Column(String, index=True, nullable=True)
    
    stock_quantity = Column(Numeric(12, 4), default=0, nullable=False) 
    min_stock = Column(Numeric(12, 4), default=5, nullable=False)
    image_path = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    
    is_raw_material = Column(Boolean, default=False, nullable=False) # New field
    is_scrap = Column(Boolean, default=False, nullable=False) # Scrap/Leftover tracking
    scrap_parent_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=True)
    branch = relationship("Branch", back_populates="products")

    location = relationship("StorageLocation", back_populates="products")
    category_rel = relationship("ProductCategory", back_populates="products")
    movement_items = relationship("InventoryMovementItem", back_populates="product")
    sale_items = relationship("SaleItem", back_populates="product")
    purchase_items = relationship("PurchaseItem", back_populates="product")
    suppliers_info = relationship("ProductSupplier", back_populates="product", cascade="all, delete-orphan")
    
    # BOM relationships
    bom_lines = relationship("ProductBOM", foreign_keys="ProductBOM.product_id", back_populates="product", cascade="all, delete-orphan")
    used_in_bom = relationship("ProductBOM", foreign_keys="ProductBOM.component_id", back_populates="component")

class ProductBOM(TenantModel):
    __tablename__ = "product_bom"
    
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False, index=True)
    component_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False, index=True)
    
    qty_per_unit = Column(Numeric(12, 4), nullable=False) # e.g. 0.005
    component_uom = Column(String, nullable=False) # "kg", "unidades", etc
    
    is_active = Column(Boolean, default=True)
    
    product = relationship("Product", foreign_keys=[product_id], back_populates="bom_lines")
    component = relationship("Product", foreign_keys=[component_id], back_populates="used_in_bom")

    __table_args__ = (
        UniqueConstraint('product_id', 'component_id', 'company_id', name='uix_product_component_company'),
    )

class CashRegister(TenantModel):
    __tablename__ = "cash_registers"
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=True)

    sessions = relationship("CashSession", back_populates="cash_register")
    branch = relationship("Branch", back_populates="cash_registers")

class CashSession(TenantModel):
    __tablename__ = "cash_sessions"
    
    user_id = Column(String, nullable=False) # ID del usuario (vendedor)
    cash_register_id = Column(UUID(as_uuid=True), ForeignKey("cash_registers.id"), nullable=False)
    
    opened_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    
    status = Column(String, default="open") # "open" or "closed"
    
    opening_balance = Column(Numeric(12, 2), default=0.0, nullable=False)
    closing_balance = Column(Numeric(12, 2), nullable=True)
    
    # Campos acumuladores (para arqueo)
    total_sales_cash = Column(Numeric(12, 2), default=0.0)
    total_sales_card = Column(Numeric(12, 2), default=0.0)
    total_sales_transfer = Column(Numeric(12, 2), default=0.0)
    expected_balance = Column(Numeric(12, 2), default=0.0) # Suma de ventas + apertura
    difference = Column(Numeric(12, 2), default=0.0)
    
    notes = Column(Text, nullable=True)
    
    cash_register = relationship("CashRegister", back_populates="sessions")
    tickets = relationship("Ticket", back_populates="session")

class VehicleType(enum.Enum):
    automovil = "automovil"
    motocicleta = "motocicleta"
    camion = "camion"
    furgon = "furgon"
    camioneta = "camioneta"
    otro = "otro"

class Customer(TenantModel):
    __tablename__ = "customers"
    
    name = Column(String, index=True, nullable=False)
    rut = Column(String, unique=True, index=True, nullable=False) # rut_cliente
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    
    vehicles = relationship("Vehicle", back_populates="owner", cascade="all, delete-orphan")
    tickets = relationship("Ticket", back_populates="customer")

class Vehicle(TenantModel):
    __tablename__ = "vehicles"
    
    license_plate = Column(String, unique=True, index=True, nullable=False)
    brand = Column(String, nullable=True)
    model = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    vehicle_type = Column(Enum(VehicleType), default=VehicleType.automovil)
    color = Column(String, nullable=True)
    vin = Column(String, nullable=True)
    service_info = Column(JSON, nullable=True) # Datos de lubricentro
    
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    owner = relationship("Customer", back_populates="vehicles")
    tickets = relationship("Ticket", back_populates="vehicle")

class Ticket(TenantModel):
    __tablename__ = "tickets"
    
    ticket_number = Column(String, unique=True, index=True, nullable=False)
    date_created = Column(DateTime(timezone=True), default=func.now(), nullable=False, index=True) # fecha_venta
    date_validated = Column(DateTime(timezone=True), nullable=True)
    
    state = Column(Enum(SaleState), default=SaleState.DRAFT, nullable=False)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=True)
    branch = relationship("Branch", back_populates="tickets")
    
    subtotal = Column(Numeric(12, 2), default=0.0)
    tax_amount = Column(Numeric(12, 2), default=0.0)
    total_amount = Column(Numeric(12, 2), default=0.0)
    
    payment_method = Column(String, default="CASH")
    
    document_type = Column(String, default="boleta") # "boleta" or "factura"
    comment = Column(Text, nullable=True)
    
    session_id = Column(UUID(as_uuid=True), ForeignKey("cash_sessions.id"), nullable=False, index=True)
    session = relationship("CashSession", back_populates="tickets")
    
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True, index=True)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=True, index=True)
    
    customer = relationship("Customer", back_populates="tickets")
    vehicle = relationship("Vehicle", back_populates="tickets")
    
    work_order_id = Column(UUID(as_uuid=True), ForeignKey("work_orders.id"), nullable=True, index=True)
    ticket_type = Column(String, default="DIRECT_SALE") # DIRECT_SALE, OT_PAYMENT
    work_order = relationship("WorkOrder", back_populates="tickets")
    
    is_refunded = Column(Boolean, default=False)
    refund_ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=True)
    original_ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=True)
    refund_reason = Column(Enum(RefundReason), nullable=True)
    return_to_stock = Column(Boolean, default=True)
    
    items = relationship("SaleItem", back_populates="ticket", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="ticket", cascade="all, delete-orphan")

class SaleItem(TenantModel):
    __tablename__ = "sale_items"
    
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    
    quantity = Column(Numeric(12, 4), nullable=False) # Cantidad base vendida
    unit_price = Column(Numeric(12, 2), nullable=False)
    discount_percent = Column(Numeric(12, 2), default=0.0)
    consumption_rate = Column(Numeric(12, 3), default=1.0) # Tasa cobrada
    stock_reduced = Column(Numeric(12, 4), default=0.0) # Log de trazabilidad del total mermado
    subtotal = Column(Numeric(12, 2), nullable=False)
    
    ticket = relationship("Ticket", back_populates="items")
    product = relationship("Product", back_populates="sale_items")

    @property
    def price(self):
        return self.unit_price

class Payment(TenantModel):
    __tablename__ = "payments"
    
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=False)
    
    payment_method = Column(String, nullable=False) # Dinámico: efectivo, tarjeta, transferencia, credito_interno, etc.
    amount = Column(Numeric(12, 2), nullable=False)
    
    reference = Column(String, nullable=True)
    date_created = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    
    ticket = relationship("Ticket", back_populates="payments")

class Supplier(TenantModel):
    __tablename__ = "suppliers"
    
    name = Column(String, index=True, nullable=False)
    tax_id = Column(String, index=True, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    
    purchases = relationship("Purchase", back_populates="supplier")
    products_info = relationship("ProductSupplier", back_populates="supplier", cascade="all, delete-orphan")

class ProductSupplier(TenantModel):
    __tablename__ = "product_suppliers"
    
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False)
    supplier_code = Column(String, index=True, nullable=False)
    
    product = relationship("Product", back_populates="suppliers_info")
    supplier = relationship("Supplier", back_populates="products_info")

    __table_args__ = (
        UniqueConstraint('product_id', 'supplier_id', 'supplier_code', name='uix_product_supplier_code'),
    )

class Purchase(TenantModel):
    __tablename__ = "purchases"
    
    date_created = Column(DateTime(timezone=True), default=func.now())
    
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=True)
    supplier = relationship("Supplier", back_populates="purchases")
    
    state = Column(Enum(PurchaseState), default=PurchaseState.DRAFT, nullable=False)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=True)
    branch = relationship("Branch", back_populates="purchases")
    
    invoice_number = Column(String, nullable=True, index=True)
    purchase_category = Column(String, nullable=True, default="MERCADERÍA")  # MERCADERÍA | GASTO_OPERATIVO | MIXTO
    subtotal_net = Column(Numeric(12, 2), default=0.0)
    tax_amount = Column(Numeric(12, 2), default=0.0)
    total_cost = Column(Numeric(12, 2), default=0.0)
    notes = Column(String, nullable=True)
    items = relationship("PurchaseItem", back_populates="purchase")

class PurchaseItem(TenantModel):
    __tablename__ = "purchase_items"
    
    purchase_id = Column(UUID(as_uuid=True), ForeignKey("purchases.id"))
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    quantity = Column(Numeric(12, 4), nullable=False)
    unit_cost = Column(Numeric(12, 2), nullable=False)
    
    purchase = relationship("Purchase", back_populates="items")
    product = relationship("Product", back_populates="purchase_items")

class InventoryMovement(TenantModel):
    __tablename__ = "inventory_movements"
    
    date = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    type = Column(Enum(MovementType), nullable=False)
    reason = Column(String, nullable=True)
    
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id"), nullable=True)
    purchase_id = Column(UUID(as_uuid=True), ForeignKey("purchases.id"), nullable=True)
    
    user_id = Column(String, nullable=True)
    
    items = relationship("InventoryMovementItem", back_populates="movement", cascade="all, delete-orphan")

class InventoryMovementItem(TenantModel):
    __tablename__ = "inventory_movement_items"
    
    movement_id = Column(UUID(as_uuid=True), ForeignKey("inventory_movements.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    
    quantity = Column(Numeric(12, 4), nullable=False)
    stock_before = Column(Numeric(12, 4), nullable=False)
    stock_after = Column(Numeric(12, 4), nullable=False)
    
    movement = relationship("InventoryMovement", back_populates="items")
    product = relationship("Product", back_populates="movement_items")

    @property
    def product_name(self):
        return self.product.name if self.product else "N/A"

class UserRole(enum.Enum):
    superadmin = "superadmin"  # Platform owner — cross-tenant access
    admin = "admin"
    vendedor = "vendedor"
    inventario = "inventario"

class User(TenantModel):
    __tablename__ = "users"
    
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.vendedor, nullable=False)
    is_active = Column(Boolean, default=True)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=True)  # Sucursal asignada (vendedor)

class Quote(TenantModel):
    __tablename__ = "quotes"
    
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=True)
    total = Column(Numeric(12, 2), default=0.0)
    mileage = Column(Numeric(12, 2), nullable=True)
    state = Column(Enum(QuoteState), default=QuoteState.DRAFT, nullable=False)
    service_info = Column(JSON, nullable=True) # Datos de lubricentro vinculados a esta cotización
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=True)
    
    branch = relationship("Branch", back_populates="quotes")
    
    customer = relationship("Customer", backref="quotes")
    vehicle = relationship("Vehicle", backref="quotes")
    items = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan")
    work_order = relationship("WorkOrder", back_populates="quote", uselist=False)

class QuoteItem(TenantModel):
    __tablename__ = "quote_items"
    
    quote_id = Column(UUID(as_uuid=True), ForeignKey("quotes.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    quantity = Column(Numeric(12, 4), nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    consumption_rate = Column(Numeric(12, 3), default=1.0)
    stock_reduced = Column(Numeric(12, 4), default=0.0)
    subtotal = Column(Numeric(12, 2), nullable=False)
    
    quote = relationship("Quote", back_populates="items")
    product = relationship("Product")

    @property
    def product_name(self):
        return self.product.name if self.product else "N/A"

    @property
    def product_type(self):
        if not self.product or not self.product.product_type:
            return "PRODUCTO"
        return "SERVICIO" if self.product.product_type == ProductType.SERVICE else "PRODUCTO"

class WorkOrder(TenantModel):
    __tablename__ = "work_orders"
    
    quote_id = Column(UUID(as_uuid=True), ForeignKey("quotes.id"), nullable=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=True)
    
    state = Column(Enum(WorkOrderState), default=WorkOrderState.OPEN, nullable=False)
    mileage = Column(Numeric(12, 2), nullable=True) # kilometraje
    notes = Column(Text, nullable=True)
    assigned_user_id = Column(String, nullable=True) # mecanico asignado
    service_info = Column(JSON, nullable=True) # Datos de lubricentro vinculados a esta OT
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=True)
    
    branch = relationship("Branch", back_populates="work_orders")
    
    quote = relationship("Quote", back_populates="work_order")
    customer = relationship("Customer")
    vehicle = relationship("Vehicle")
    items = relationship("WorkOrderItem", back_populates="work_order", cascade="all, delete-orphan")
    legacy_payments = relationship("WorkOrderPayment", back_populates="work_order", cascade="all, delete-orphan")
    tickets = relationship("Ticket", back_populates="work_order")

    @property
    def total_amount(self):
        return sum(item.subtotal for item in self.items)

    @property
    def payments(self):
        # Maps ticket to a dict resembling WorkOrderPaymentResponse
        return [
            {
                "id": t.id,
                "session_id": t.session_id,
                "amount": t.total_amount,
                "payment_method": t.payment_method,
                "date_created": t.date_created
            }
            for t in self.tickets if t.state in (SaleState.PAID, SaleState.VALIDATED) and not t.is_refunded
        ]
        
    @property
    def total_payments(self):
        return sum(
            t.total_amount for t in self.tickets
            if t.state in (SaleState.PAID, SaleState.VALIDATED) and not t.is_refunded
        )

    @property
    def pending_balance(self):
        return max(self.total_amount - self.total_payments, 0)

    @property
    def financial_progress(self):
        from decimal import Decimal
        total = self.total_amount
        if total <= 0: 
            return Decimal("100.0") if self.items else Decimal("0.0")
        paid = sum(t.total_amount for t in self.tickets if t.state in (SaleState.PAID, SaleState.VALIDATED) and not t.is_refunded)
        return min((paid / total) * Decimal("100.0"), Decimal("100.0"))

    @property
    def operational_progress(self):
        from decimal import Decimal
        if not self.items: 
            return Decimal("0.0")
        done_count = sum(1 for i in self.items if i.done)
        return (Decimal(done_count) / Decimal(len(self.items))) * Decimal("100.0")

class WorkOrderItem(TenantModel):
    __tablename__ = "work_order_items"
    
    work_order_id = Column(UUID(as_uuid=True), ForeignKey("work_orders.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    quantity = Column(Numeric(12, 4), nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    consumption_rate = Column(Numeric(12, 3), default=1.0)
    stock_reduced = Column(Numeric(12, 4), default=0.0)
    subtotal = Column(Numeric(12, 2), nullable=False)
    done = Column(Boolean, default=False, nullable=False)
    is_paid = Column(Boolean, default=False, nullable=False)
    stock_consumed = Column(Boolean, default=False, nullable=False)
    
    work_order = relationship("WorkOrder", back_populates="items")
    product = relationship("Product")

    @property
    def product_name(self):
        return self.product.name if self.product else "N/A"

    @property
    def product_type(self):
        if not self.product or not self.product.product_type:
            return "PRODUCTO"
        return "SERVICIO" if self.product.product_type == ProductType.SERVICE else "PRODUCTO"

class WorkOrderPayment(TenantModel):
    __tablename__ = "work_order_payments"
    
    work_order_id = Column(UUID(as_uuid=True), ForeignKey("work_orders.id"), nullable=False)
    session_id = Column(UUID(as_uuid=True), ForeignKey("cash_sessions.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String, nullable=False)
    date_created = Column(DateTime(timezone=True), default=func.now())
    
    work_order = relationship("WorkOrder", back_populates="legacy_payments")
    session = relationship("CashSession")

# ── Expenses (Modo Compra PDV) ─────────────────────────────────────────────

class ExpenseCategory(TenantModel):
    __tablename__ = "expense_categories"

    name = Column(String, nullable=False, index=True)
    color = Column(String, nullable=True, default="#6366f1")
    icon = Column(String, nullable=True, default="receipt")  # Nombre icono lucide
    is_active = Column(Boolean, default=True)

    expenses = relationship("Expense", back_populates="category")


class Expense(TenantModel):
    __tablename__ = "expenses"

    category_id = Column(UUID(as_uuid=True), ForeignKey("expense_categories.id"), nullable=False)
    session_id = Column(UUID(as_uuid=True), ForeignKey("cash_sessions.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String, nullable=False)  # efectivo | tarjeta | transferencia
    glosa = Column(Text, nullable=True)
    date_created = Column(DateTime(timezone=True), default=func.now(), nullable=False)

    category = relationship("ExpenseCategory", back_populates="expenses")
    session = relationship("CashSession")

