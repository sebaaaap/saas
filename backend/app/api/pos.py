from uuid import UUID
"""
API Endpoints para POS
Implementa el flujo completo de ventas con soporte para:
- Pagos divididos (split payments)
- Validación de ventas (ajuste de inventario)
- Reembolsos (notas de crédito)
- Búsqueda de productos
"""
from fastapi import APIRouter, Depends, HTTPException, Query

from typing import List, Optional

from app.api.deps import get_tenant_session
from app.db.tenant_session import TenantSession
from app.services.pos_service import POSService
from app.schemas.pos import (
    ProductResponse, 
    SaleCreate, 
    SaleResponse, 
    SaleValidate,
    RefundCreate,
    RefundResponse,
    QuickSaleCreate
)
from app.models.base import Product
from app.api.deps import check_roles, require_active_session

router = APIRouter()

# --- Product Endpoints ---

@router.get("/products/barcode/{barcode}", response_model=ProductResponse)
def get_product_by_barcode(
    barcode: str, 
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "vendedor", "inventario"]))
):
    """
    Busca un producto por código de barras
    Ideal para llamar automáticamente cuando el escáner envía 'Enter'
    """
    product = db.tenant_query(Product).filter(Product.barcode == barcode).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product

@router.get("/products", response_model=List[ProductResponse])
def search_products(
    search: Optional[str] = Query(None, description="Búsqueda por nombre, barcode o referencia"),
    category: Optional[str] = Query(None, description="Filtrar por categoría"),
    skip: int = 0,
    limit: int = 50,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "vendedor", "inventario"]))
):
    """
    Búsqueda de productos con filtros
    Soporta búsqueda por nombre, SKU, categoría
    """
    query = db.tenant_query(Product).filter(Product.is_active == True)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(search_filter)) |
            (Product.barcode.ilike(search_filter)) |
            (Product.internal_reference.ilike(search_filter))
        )
    
    if category:
        query = query.filter(Product.category == category)
    
    return query.offset(skip).limit(limit).all()

# --- Sale Endpoints ---

@router.post("/sales", response_model=SaleResponse, status_code=201)
def create_sale(
    sale: SaleCreate, 
    db: TenantSession = Depends(get_tenant_session),
    active_session = Depends(require_active_session)
):
    """
    Crea una venta con pagos divididos (estado inicial)
    Afecta el inventario de manera INMEDIATA y en TIEMPO REAL 
    restando las cantidades del stock en una transacción atómica.
    
    Ejemplo de payload con split payments:
    {
        "items": [{"product_id": 1, "quantity": 2, "price": 100}],
        "payments": [
            {"payment_method": "efectivo", "amount": 100},
            {"payment_method": "tarjeta", "amount": 100}
        ],
        "session_id": 1
    }
    """

    try:
        # Aseguramos que la venta use la sesión activa verificada por la dependencia
        sale.session_id = active_session.id
        print(f"DEBUG: create_sale payload: {sale.model_dump_json(indent=2)}")
        ticket = POSService.create_sale_draft(db, sale)
        
        # Asignar a la misma sucursal de la caja
        if active_session.cash_register.branch_id:
            ticket.branch_id = active_session.cash_register.branch_id
            db.commit()
        
        from fastapi.encoders import jsonable_encoder
        from app.schemas.pos import SaleResponse
        
        # Validar Pydantic para forzar carga de relaciones (items, payments) dentro del try
        # y usar jsonable_encoder para manejar UUID/Decimal evitando el error 500 de FastAPI
        response_data = SaleResponse.model_validate(ticket)
        return jsonable_encoder(response_data)
    except HTTPException:
        # Re-lanzar para que FastAPI maneje el código correcto (400, 404, etc)
        raise
    except Exception as e:
        print(f"ERROR en create_sale: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sales/quick", response_model=SaleResponse, status_code=201)
def create_quick_sale(
    sale: QuickSaleCreate, 
    db: TenantSession = Depends(get_tenant_session),
    active_session = Depends(require_active_session)
):
    """
    Endpoint simplificado para ventas rápidas (un solo método de pago)
    Crea la venta en DRAFT y la valida automáticamente
    
    Para compatibilidad con el frontend actual
    """
    # Aseguramos que la venta use la sesión activa
    sale.session_id = active_session.id
    # Crear venta en DRAFT
    ticket = POSService.create_sale_draft(db, sale)
    
    # Asignar a la misma sucursal de la caja
    if active_session.cash_register.branch_id:
        ticket.branch_id = active_session.cash_register.branch_id
        db.commit()
    
    # Validar automáticamente (ajustar inventario)
    ticket = POSService.validate_sale(db, ticket.id)
    
    # Marcar como pagada
    ticket = POSService.mark_as_paid(db, ticket.id)
    
    from fastapi.encoders import jsonable_encoder
    from app.schemas.pos import SaleResponse
    return jsonable_encoder(SaleResponse.model_validate(ticket))

@router.post("/sales/{ticket_id}/validate", response_model=SaleResponse)
def validate_sale(ticket_id: UUID, db: TenantSession = Depends(get_tenant_session)):
    """
    Valida una venta: DRAFT -> VALIDATED
    Ajusta el inventario de forma atómica
    Crea registros de trazabilidad (Inventory Logs)
    """
    try:
        ticket = POSService.validate_sale(db, ticket_id)
        from fastapi.encoders import jsonable_encoder
        from app.schemas.pos import SaleResponse
        response_data = SaleResponse.model_validate(ticket)
        return jsonable_encoder(response_data)
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR en validate_sale: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sales/{ticket_id}/pay", response_model=SaleResponse)
def mark_sale_as_paid(ticket_id: UUID, db: TenantSession = Depends(get_tenant_session)):
    """
    Marca una venta como pagada: VALIDATED -> PAID
    """
    try:
        ticket = POSService.mark_as_paid(db, ticket_id)
        from fastapi.encoders import jsonable_encoder
        from app.schemas.pos import SaleResponse
        response_data = SaleResponse.model_validate(ticket)
        return jsonable_encoder(response_data)
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR en mark_sale_as_paid: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sales/{ticket_id}", response_model=SaleResponse)
def get_sale(ticket_id: str, db: TenantSession = Depends(get_tenant_session)):
    """Obtiene una venta por ID o ticket_number"""
    try:
        uuid_obj = UUID(ticket_id)
        ticket = POSService.get_sale_by_id(db, uuid_obj)
    except ValueError:
        from app.models.base import Ticket
        ticket = db.tenant_query(Ticket).filter(Ticket.ticket_number == ticket_id).first()
        
    if not ticket:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return ticket

@router.get("/sales/session/{session_id}", response_model=List[SaleResponse])
def get_sales_by_session(session_id: UUID, db: TenantSession = Depends(get_tenant_session)):
    """Obtiene todas las ventas de una sesión"""
    tickets = POSService.get_sales_by_session(db, session_id)
    return tickets

# --- Refund Endpoints ---

@router.post("/refunds", response_model=RefundResponse, status_code=201)
def create_refund(refund: RefundCreate, db: TenantSession = Depends(get_tenant_session)):
    """
    Crea una nota de crédito (reembolso)
    NO borra la venta original, crea una venta negativa vinculada
    
    Ejemplo de payload:
    {
        "original_ticket_id": 1,
        "items": [{"product_id": 1, "quantity": 1, "price": 100}],
        "refund_reason": "devolucion_stock",
        "return_to_stock": true
    }
    
    Si return_to_stock es true, el producto regresa al inventario.
    Si es false, se marca como merma/dañado.
    """
    try:
        credit_note, original_ticket = POSService.create_refund(db, refund)
        
        from fastapi.encoders import jsonable_encoder
        from app.schemas.pos import RefundResponse
        
        response_data = RefundResponse.model_validate({
            "credit_note": credit_note,
            "original_ticket": original_ticket
        })
        return jsonable_encoder(response_data)
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR en create_refund: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
