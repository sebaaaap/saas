from fastapi import APIRouter, Depends, HTTPException, Body, Query, Header

from uuid import UUID
from typing import List, Optional
from pydantic import BaseModel
from app.api.deps import get_tenant_session
from app.db.tenant_session import TenantSession
from app.schemas.quotes import QuoteCreate, QuoteResponse
from app.schemas.work_orders import WorkOrderResponse, WorkOrderPaymentCreate, WorkOrderPaymentResponse, WorkOrderBalanceResponse
from app.services.quote_service import QuoteWorkOrderService
from app.models.base import WorkOrderState, WorkOrderItem, WorkOrder

router = APIRouter()

@router.post("/quotes", response_model=QuoteResponse)
def create_quote(
    quote: QuoteCreate, 
    db: TenantSession = Depends(get_tenant_session),
    branch_id: Optional[UUID] = Header(None, alias="X-Branch-ID")
):
    """Crea una nueva cotización sin descontar stock."""
    created_quote = QuoteWorkOrderService.create_quote(db, quote)
    if branch_id:
        created_quote.branch_id = branch_id
        db.commit()
    return created_quote

@router.get("/quotes", response_model=List[QuoteResponse])
def get_quotes(db: TenantSession = Depends(get_tenant_session)):
    """Recupera todas las cotizaciones."""
    return QuoteWorkOrderService.get_quotes(db)

@router.post("/quotes/{quote_id}/approve", response_model=WorkOrderResponse)
def approve_quote(quote_id: UUID, db: TenantSession = Depends(get_tenant_session)):
    """Aprueba una cotización, crea la OT asociada y reserva stock transaccionalmente."""
    quote, wo = QuoteWorkOrderService.approve_quote(db, quote_id)
    if quote.branch_id:
        wo.branch_id = quote.branch_id
        db.commit()
    return wo

@router.post("/quotes/{quote_id}/reject", response_model=QuoteResponse)
def reject_quote(quote_id: UUID, db: TenantSession = Depends(get_tenant_session)):
    """Rechaza una cotización cambiándole el estado."""
    return QuoteWorkOrderService.reject_quote(db, quote_id)

@router.delete("/quotes/{quote_id}")
def delete_quote(quote_id: UUID, db: TenantSession = Depends(get_tenant_session)):
    """Elimina permanentemente una cotización."""
    QuoteWorkOrderService.delete_quote(db, quote_id)
    return {"message": "Cotización eliminada correctamente"}

@router.get("/pos/active-orders", response_model=List[WorkOrderResponse])
def get_active_orders(
    pos_only: bool = Query(False), 
    db: TenantSession = Depends(get_tenant_session),
    branch_id: Optional[UUID] = Header(None, alias="X-Branch-ID")
):
    """Recupera todas las OTs activas (abierta, en progreso, lista) filtradas opcionalmente por sucursal."""
    return QuoteWorkOrderService.get_active_work_orders(db, pos_only=pos_only, branch_id=branch_id)

@router.post("/ot/{wo_id}/payments", response_model=WorkOrderPaymentResponse)
def add_work_order_payment(
    wo_id: UUID, 
    payment_data: WorkOrderPaymentCreate, 
    session_id: UUID,
    db: TenantSession = Depends(get_tenant_session)
):
    """Registra un abono en la OT validando sesión. Genera ticket final si saldo es 0."""
    ticket, _ = QuoteWorkOrderService.add_payment(db, wo_id, payment_data, session_id)
    return {
        "id": ticket.id,
        "session_id": ticket.session_id,
        "amount": ticket.total_amount,
        "payment_method": ticket.payment_method,
        "date_created": ticket.date_created
    }

@router.get("/ot/{wo_id}/balance", response_model=WorkOrderBalanceResponse)
def get_work_order_balance(wo_id: UUID, db: TenantSession = Depends(get_tenant_session)):
    """Calcula saldo pendiente de OT restando abonos a monto total."""
    return QuoteWorkOrderService.get_wo_balance(db, wo_id)


class ItemDoneUpdate(BaseModel):
    done: bool

class ItemsDoneUpdate(BaseModel):
    items: list[dict]  # [{"id": "...", "done": True/False}]

@router.patch("/ot/{wo_id}/items")
def update_ot_items_done(
    wo_id: UUID,
    payload: ItemsDoneUpdate,
    db: TenantSession = Depends(get_tenant_session)
):
    """Actualiza el estado 'done' (completado) de múltiples ítems de una OT."""
    wo = db.tenant_query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Orden de trabajo no encontrada")
    
    updated = 0
    for item_update in payload.items:
        item_id = item_update.get("id")
        done = item_update.get("done", False)
        item = db.tenant_query(WorkOrderItem).filter(
            WorkOrderItem.id == item_id,
            WorkOrderItem.work_order_id == wo_id
        ).first()
        if item:
            item.done = done
            updated += 1
    
    # Auto-update WO state based on progress
    all_items = db.tenant_query(WorkOrderItem).filter(WorkOrderItem.work_order_id == wo_id).all()
    done_count = sum(1 for i in all_items if i.done)
    
    if done_count == 0:
        wo.state = WorkOrderState.OPEN
    elif done_count < len(all_items):
        wo.state = WorkOrderState.IN_PROGRESS
    else:
        wo.state = WorkOrderState.READY

    db.commit()
    return {"updated": updated, "new_state": wo.state.value, "done_count": done_count, "total": len(all_items)}


@router.patch("/ot/{wo_id}/state")
def update_ot_state(
    wo_id: UUID,
    state: str = Body(..., embed=True),
    db: TenantSession = Depends(get_tenant_session)
):
    """Cambia el estado de una OT manualmente."""
    wo = db.tenant_query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Orden de trabajo no encontrada")
    
    state_map = {
        "OPEN": WorkOrderState.OPEN,
        "IN_PROGRESS": WorkOrderState.IN_PROGRESS,
        "READY": WorkOrderState.READY,
        "COMPLETED": WorkOrderState.COMPLETED,
    }
    new_state = state_map.get(state)
    if not new_state:
        raise HTTPException(status_code=400, detail=f"Estado inválido: {state}")
    
    if new_state == WorkOrderState.COMPLETED:
        # Finalizar OT: consumir stock de TODOS los items que no lo hayan hecho aún
        for item in wo.items:
            if not item.stock_consumed:
                QuoteWorkOrderService.consume_item_stock(db, item, wo)
            item.done = True  # Marcar todos como completados
                
    wo.state = new_state
    db.commit()
    return {"id": str(wo.id), "state": wo.state.value}

@router.delete("/ot/{wo_id}")
def delete_work_order(wo_id: UUID, db: TenantSession = Depends(get_tenant_session)):
    """Elimina permanentemente una orden de trabajo."""
    QuoteWorkOrderService.delete_work_order(db, wo_id)
    return {"message": "Orden de trabajo eliminada correctamente"}
