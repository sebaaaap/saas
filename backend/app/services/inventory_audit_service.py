from app.db.tenant_session import TenantSession
from decimal import Decimal
from typing import Dict

from app.models.base import (
    Ticket, SaleItem, CashSession, SaleState, Product,
    InventoryMovement, InventoryMovementItem, MovementType
)

class InventoryAuditService:
    """
    Servicio para auditoría de inventario.
    Contiene la lógica antigua de 'Snapshots' de ventas.
    Útil para funciones premium, reportería o arqueos de stock históricos.
    """

    @staticmethod
    def audit_session_stock_snapshot(db: TenantSession, session_id: int):
        """
        Agrupa todos los productos vendidos en la sesión y genera 
        una simulación / snapshot de cómo se comportó el inventario.
        
        Esta lógica originalmente realizaba el descuento de stock al
        cierre de la sesión (Odoo / Snapshot pattern).
        """
        session = db.tenant_query(CashSession).filter(CashSession.id == session_id).first()
        if not session:
            return None

        # Buscamos todos los items de tickets validados o pagados de esta sesión
        session_items = db.tenant_query(SaleItem).join(Ticket).filter(
            Ticket.session_id == session_id,
            Ticket.state.in_([SaleState.VALIDATED, SaleState.PAID, SaleState.REFUNDED])
        ).all()

        stock_updates: Dict[int, int] = {}
        merma_updates: Dict[int, int] = {}
        
        for item in session_items:
            # Las notas de crédito (reembolsos) tienen item.quantity negativo
            if item.quantity < 0:
                if item.ticket.return_to_stock:
                    stock_updates[item.product_id] = stock_updates.get(item.product_id, 0) + item.quantity
                else:
                    stock_updates[item.product_id] = stock_updates.get(item.product_id, 0) + item.quantity
                    merma_updates[item.product_id] = merma_updates.get(item.product_id, 0) + abs(item.quantity)
            else:
                stock_updates[item.product_id] = stock_updates.get(item.product_id, 0) + item.quantity

        return {
            "session_id": session_id,
            "session_name": session.name,
            "stock_updates": stock_updates,
            "merma_updates": merma_updates
        }
