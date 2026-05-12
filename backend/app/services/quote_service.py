from app.db.tenant_session import TenantSession
from sqlalchemy.orm import joinedload
from sqlalchemy import and_, or_
from datetime import datetime
from fastapi import HTTPException
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from app.models.base import (
    Quote, QuoteItem, WorkOrder, WorkOrderItem, WorkOrderPayment,
    QuoteState, WorkOrderState, PaymentMethod, CashSession, Product,
    InventoryMovement, InventoryMovementItem, MovementType, StorageLocation,
    Ticket, SaleItem, SaleState, ProductType
)
from app.schemas.quotes import QuoteCreate, QuoteUpdateState
from app.schemas.work_orders import WorkOrderCreate, WorkOrderPaymentCreate
from app.services.pos_service import POSService

class QuoteWorkOrderService:

    @staticmethod
    def create_quote(db: TenantSession, quote_data: QuoteCreate) -> Quote:
        total = Decimal('0')
        
        quote = Quote(
            customer_id=quote_data.customer_id,
            vehicle_id=quote_data.vehicle_id,
            mileage=quote_data.mileage,
            service_info=quote_data.service_info,
            state=QuoteState.DRAFT
        )
        db.add(quote)
        db.flush()

        for item in quote_data.items:
            subtotal = round(item.quantity * item.unit_price, 2)
            total += subtotal
            
            qi = QuoteItem(
                quote_id=quote.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
                consumption_rate=getattr(item, 'consumption_rate', Decimal('1.0')),
                subtotal=subtotal
            )
            db.add(qi)
            
        quote.total = total
        db.commit()
        db.refresh(quote)

        # Si el modo seleccionado era OT, aprobamos inmediatamente la cotización creada
        if quote_data.is_ot:
            QuoteWorkOrderService.approve_quote(db, quote.id)
            db.refresh(quote)

        return quote

    @staticmethod
    def get_quotes(db: TenantSession) -> List[Quote]:
        return db.tenant_query(Quote).order_by(Quote.created_at.desc()).all()

    @staticmethod
    def reject_quote(db: TenantSession, quote_id: UUID) -> Quote:
        quote = db.tenant_query(Quote).filter(Quote.id == quote_id).first()
        if not quote:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
        
        if quote.state != QuoteState.DRAFT:
            raise HTTPException(status_code=400, detail="Solo se pueden rechazar cotizaciones en estado borrador")
            
        quote.state = QuoteState.REJECTED
        db.commit()
        db.refresh(quote)
        return quote

    @staticmethod
    def approve_quote(db: TenantSession, quote_id: UUID) -> tuple[Quote, WorkOrder]:
        quote = db.tenant_query(Quote).filter(Quote.id == quote_id).first()
        if not quote:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
            
        if quote.state != QuoteState.DRAFT:
            raise HTTPException(status_code=400, detail="Solo se pueden aprobar cotizaciones en estado borrador")
            
        try:
            with db.begin_nested():
                quote.state = QuoteState.APPROVED
                
                # Create WorkOrder
                work_order = WorkOrder(
                    quote_id=quote.id,
                    customer_id=quote.customer_id,
                    vehicle_id=quote.vehicle_id,
                    mileage=quote.mileage,
                    service_info=quote.service_info,
                    state=WorkOrderState.OPEN
                )
                db.add(work_order)
                db.flush()

                # Add items (we do not deduct stock yet, it is deducted when item is done)
                for qi in quote.items:
                    wo_item = WorkOrderItem(
                        work_order_id=work_order.id,
                        product_id=qi.product_id,
                        quantity=qi.quantity,
                        unit_price=qi.unit_price,
                        consumption_rate=qi.consumption_rate,
                        subtotal=qi.subtotal
                    )
                    db.add(wo_item)
                        
            db.commit()
            db.refresh(quote)
            db.refresh(work_order)
            return quote, work_order
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail="Error al aprobar cotización y generar OT")

    @staticmethod
    def consume_item_stock(db: TenantSession, wo_item: WorkOrderItem, wo: WorkOrder):
        movement = InventoryMovement(
            type=MovementType.OUT_SALE,
            reason=f"Consumo OT {wo.id} - Item {wo_item.id}"
        )
        db.add(movement)
        db.flush()

        original_product = db.tenant_query(Product).filter(Product.id == wo_item.product_id).first()
        if not original_product:
            raise HTTPException(status_code=404, detail=f"Producto {wo_item.product_id} no encontrado")

        # Servicios no descuentan stock
        pt = original_product.product_type
        is_service = (pt == ProductType.SERVICE) or (hasattr(pt, 'value') and pt.value == "SERVICE") or (pt == "SERVICE")
        if is_service:
            wo_item.stock_consumed = True  # Mark as consumed (no stock to deduct for services)
            return # Services don't deduct stock

        candidates = db.tenant_query(Product).outerjoin(Product.location).filter(
            Product.barcode == original_product.barcode,
            Product.stock_quantity > 0,
            or_(StorageLocation.id == None, StorageLocation.name != "Pasillo Mermas")
        ).with_for_update(of=Product).order_by(Product.stock_quantity.desc()).all()

        total_available = sum(p.stock_quantity for p in candidates)

        stock_to_deduct = wo_item.quantity * wo_item.consumption_rate

        if total_available < stock_to_deduct:
            raise HTTPException(
                status_code=400, 
                detail=f"Stock insuficiente para {original_product.name}. Disponible: {total_available}, Requerido: {stock_to_deduct}"
            )

        qty_remaining = stock_to_deduct

        for candidate in candidates:
            if qty_remaining <= 0:
                break

            take = min(Decimal(str(candidate.stock_quantity)), Decimal(str(qty_remaining)))
            
            stock_before = candidate.stock_quantity
            candidate.stock_quantity -= take
            stock_after = candidate.stock_quantity

            mov_item = InventoryMovementItem(
                movement_id=movement.id,
                product_id=candidate.id,
                quantity=-take,
                stock_before=stock_before,
                stock_after=stock_after
            )
            db.add(mov_item)

            wo_item.stock_reduced += take
            qty_remaining -= take

        wo_item.stock_consumed = True  # Mark this item's stock as consumed


    @staticmethod
    def get_active_work_orders(db: TenantSession, pos_only: bool = False, branch_id: Optional[UUID] = None):
        query = db.tenant_query(WorkOrder).options(
            joinedload(WorkOrder.items),
            joinedload(WorkOrder.tickets)
        ).filter(
            WorkOrder.state.in_([WorkOrderState.OPEN, WorkOrderState.IN_PROGRESS, WorkOrderState.READY, WorkOrderState.COMPLETED])
        )
        if branch_id:
            query = query.filter(WorkOrder.branch_id == branch_id)
        
        orders = query.all()
        
        if not pos_only:
            return orders

        active = []
        for wo in orders:
            total_items = sum(item.subtotal for item in wo.items)
            total_payments = sum(
                t.total_amount for t in wo.tickets
                if t.state in (SaleState.PAID, SaleState.VALIDATED) and not t.is_refunded
            )
            balance = total_items - total_payments
            if balance > Decimal('1'):  # tolerancia de $1 para redondeos
                active.append(wo)
                
        return active

    @staticmethod
    def add_payment(db: TenantSession, wo_id: UUID, payment_data: WorkOrderPaymentCreate, session_id: UUID) -> tuple[Ticket, Decimal]:
        with db.begin_nested():
            wo = db.tenant_query(WorkOrder).filter(WorkOrder.id == wo_id).with_for_update().first()
            if not wo:
                raise HTTPException(status_code=404, detail="Orden de trabajo no encontrada")
                
            cash_session = db.tenant_query(CashSession).filter(CashSession.id == session_id).first()
            if not cash_session or cash_session.status != "open":
                raise HTTPException(status_code=400, detail="La sesión de caja no está abierta o es inválida")
                
            total_items = sum(item.subtotal for item in wo.items)
            total_payments = sum(t.total_amount for t in wo.tickets if t.state in (SaleState.PAID, SaleState.VALIDATED) and not t.is_refunded)
            balance = total_items - total_payments
            
            if payment_data.amount > balance:
                raise HTTPException(status_code=400, detail=f"El monto a pagar ({payment_data.amount}) supera el saldo pendiente ({balance})")

            # Try to match by value first (common for coming from frontend as string)
            pm_enum = None
            pm_map = {
                "efectivo": PaymentMethod.CASH,
                "tarjeta": PaymentMethod.CARD,
                "transferencia": PaymentMethod.TRANSFER,
                "mixto": PaymentMethod.MIXED
            }
            
            # Look up in our map or directly in Enum values/keys
            pm_lower = payment_data.payment_method.lower()
            if pm_lower in pm_map:
                pm_enum = pm_map[pm_lower]
            else:
                for pm in PaymentMethod:
                    if pm.value == pm_lower:
                        pm_enum = pm
                        break
            
            # Fallback to key lookup
            if not pm_enum:
                try:
                    pm_enum = PaymentMethod[payment_data.payment_method.upper()]
                except KeyError:
                    raise HTTPException(status_code=400, detail=f"Método de pago inválido: {payment_data.payment_method}")

            # We generate an OT_PAYMENT Ticket 
            ticket = Ticket(
                ticket_number=POSService.generate_ticket_number(db),
                state=SaleState.VALIDATED,
                subtotal=payment_data.amount,
                tax_amount=Decimal('0'), # Assuming taxes are calculated at item level, simple amount here
                total_amount=payment_data.amount,
                payment_method=payment_data.payment_method,
                session_id=session_id,
                customer_id=wo.customer_id,
                vehicle_id=wo.vehicle_id,
                work_order_id=wo.id,
                ticket_type="OT_PAYMENT"
            )
            db.add(ticket)
            db.flush()
            
            # Create the Payment record
            from app.models.base import Payment
            pago = Payment(
                ticket_id=ticket.id,
                payment_method=pm_enum,
                amount=payment_data.amount,
                reference=f"Abono/Pago OT #{str(wo.id).split('-')[0]}"
            )
            db.add(pago)

            # Mark items as paid if provided AND create SaleItem records for the Ticket
            if payment_data.item_ids:
                from app.models.base import WorkOrderItem, SaleItem
                wo_items = db.tenant_query(WorkOrderItem).filter(
                    WorkOrderItem.id.in_(payment_data.item_ids),
                    WorkOrderItem.work_order_id == wo.id
                ).all()
                
                for woi in wo_items:
                    woi.is_paid = True
                    # Create a detail item for the POS ticket
                    sale_item = SaleItem(
                        ticket_id=ticket.id,
                        product_id=woi.product_id,
                        quantity=woi.quantity,
                        unit_price=woi.unit_price,
                        subtotal=woi.subtotal,
                        discount_percent=Decimal('0')
                    )
                    db.add(sale_item)
            else:
                # Pago global (sin seleccionar ítems): crear SaleItems para TODOS los ítems de la OT
                from app.models.base import SaleItem as SI
                total_ot = sum(item.subtotal for item in wo.items) or Decimal('1')
                for woi in wo.items:
                    # Marcar como pagado si el pago cubre el total de la OT
                    if payment_data.amount >= (total_ot - Decimal('1')):  # tolerancia de $1 por redondeo
                        woi.is_paid = True
                    sale_item = SI(
                        ticket_id=ticket.id,
                        product_id=woi.product_id,
                        quantity=woi.quantity,
                        unit_price=woi.unit_price,
                        subtotal=woi.subtotal,
                        discount_percent=Decimal('0')
                    )
                    db.add(sale_item)

            # auto-complete OT if all items are paid
            db.flush()
            all_items_paid = all(item.is_paid for item in wo.items)
            if all_items_paid and wo.items:
                wo.state = WorkOrderState.COMPLETED

            new_balance = balance - payment_data.amount
            
            # Update session totals
            if pm_enum == PaymentMethod.CASH:
                cash_session.total_sales_cash += payment_data.amount
                cash_session.expected_balance = cash_session.opening_balance + cash_session.total_sales_cash
            elif pm_enum == PaymentMethod.CARD:
                cash_session.total_sales_card += payment_data.amount
            elif pm_enum == PaymentMethod.TRANSFER:
                cash_session.total_sales_transfer += payment_data.amount
            elif pm_enum == PaymentMethod.MIXED:
                cash_session.total_sales_cash += payment_data.amount
                cash_session.expected_balance = cash_session.opening_balance + cash_session.total_sales_cash
                
            # If paid off completely, finish WO if operationally done
            if new_balance == Decimal('0'):
                done_count = sum(1 for i in wo.items if i.done)
                if done_count == len(wo.items) and len(wo.items) > 0:
                    wo.state = WorkOrderState.COMPLETED
                
        db.commit()
        db.refresh(ticket)
        return ticket, new_balance

    @staticmethod
    def get_wo_balance(db: TenantSession, wo_id: UUID):
        wo = db.tenant_query(WorkOrder).filter(WorkOrder.id == wo_id).first()
        if not wo:
            raise HTTPException(status_code=404, detail="Orden de trabajo no encontrada")
            
        total_items = sum(item.subtotal for item in wo.items)
        total_payments = sum(t.total_amount for t in wo.tickets if t.state in (SaleState.PAID, SaleState.VALIDATED) and not t.is_refunded)
        balance = total_items - total_payments
        
        return {
            "work_order_id": wo.id,
            "total_items": total_items,
            "total_payments": total_payments,
            "balance": balance
        }

    @staticmethod
    def delete_quote(db: TenantSession, quote_id: UUID):
        quote = db.tenant_query(Quote).filter(Quote.id == quote_id).first()
        if not quote:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
        
        # If it has an associated work order, we might want to prevent deletion or delete both.
        # For now, let's just delete the quote (cascade handles items)
        db.delete(quote)
        db.commit()
        return True

    @staticmethod
    def delete_work_order(db: TenantSession, wo_id: UUID):
        wo = db.tenant_query(WorkOrder).filter(WorkOrder.id == wo_id).first()
        if not wo:
            raise HTTPException(status_code=404, detail="Orden de trabajo no encontrada")
        
        # Prevent deletion if there are payments
        active_tickets = [t for t in wo.tickets if t.state in (SaleState.PAID, SaleState.VALIDATED) and not t.is_refunded]
        if active_tickets:
            raise HTTPException(status_code=400, detail="No se puede eliminar una orden que tiene abonos realizados. Revierta los abonos primero.")
        
        db.delete(wo)
        db.commit()
        return True

