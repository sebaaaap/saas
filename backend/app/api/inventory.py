from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_tenant_session
from app.db.tenant_session import TenantSession
from app.schemas.inventory import InventoryMovementCreate, InventoryMovementResponse, InterBranchTransferCreate
from app.services.inventory_service import InventoryService
from typing import List, Optional
from fastapi import Header
from app.api.deps import check_roles

router = APIRouter()

@router.post("/adjustments", response_model=InventoryMovementResponse)
def create_adjustment(
    data: InventoryMovementCreate, 
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "inventario"]))
):
    """
    Crea un ajuste manual de inventario (Entrada/Salida/Merma).
    """
    service = InventoryService(db)
    return service.create_movement(data)

@router.get("/movements", response_model=List[InventoryMovementResponse])
def list_movements(
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "inventario"]))
):
    """
    Lista todos los movimientos de inventario (Kardex).
    """
    from app.models.base import InventoryMovement
    movements = db.tenant_query(InventoryMovement).order_by(InventoryMovement.date.desc()).all()
    
    # Mapeo manual para asegurar que product_name se llene
    results = []
    for mov in movements:
        items_detail = []
        for item in mov.items:
            items_detail.append({
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product.name if item.product else "Desconocido",
                "quantity": item.quantity
            })
        
        results.append({
            "id": mov.id,
            "date": mov.date,
            "type": mov.type.name, # Enviamos el nombre del enum (ej: IN_PURCHASE)
            "reason": mov.reason,
            "items": items_detail
        })
    return results

@router.get("/reports")
def get_inventory_reports(
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "inventario"])),
    branch_id: Optional[UUID] = Header(None, alias="X-Branch-ID")
):
    """
    Genera reportes de valoración y estado del inventario.
    """
    from app.models.base import Product, InventoryMovementItem, InventoryMovement
    from sqlalchemy import func

    query = db.tenant_query(Product).filter(Product.is_active == True)
    if branch_id:
        query = query.filter(Product.branch_id == branch_id)
        
    products = query.all()
    
    report_data = []
    total_valuation = 0
    total_potential_revenue = 0

    for p in products:
        valuation = (p.stock_quantity or 0) * (p.cost or 0)
        potential_revenue = (p.stock_quantity or 0) * (p.price or 0)
        
        total_valuation += valuation
        total_potential_revenue += potential_revenue

        # Buscar última fecha de movimiento para este producto
        last_mov = db.tenant_query(InventoryMovement.date)\
            .join(InventoryMovementItem)\
            .filter(InventoryMovementItem.product_id == p.id)\
            .order_by(InventoryMovement.date.desc())\
            .first()

        report_data.append({
            "id": p.id,
            "name": p.name,
            "barcode": p.barcode,
            "stock": p.stock_quantity,
            "uom": p.uom,
            "cost": p.cost,
            "price": p.price,
            "valuation": valuation,
            "last_activity": last_mov[0] if last_mov else None
        })

    return {
        "summary": {
            "total_products": len(products),
            "total_valuation": total_valuation,
            "total_potential_revenue": total_potential_revenue,
            "potential_margin": total_potential_revenue - total_valuation
        },
        "details": report_data
    }

@router.post("/transfer", response_model=InventoryMovementResponse)
def transfer_stock_branches(
    data: InterBranchTransferCreate,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "inventario"]))
):
    """
    Transfiere stock entre sucursales.
    """
    service = InventoryService(db)
    return service.transfer_between_branches(data, user_id=getattr(current_user, "id", None))
