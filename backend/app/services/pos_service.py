"""
Servicio de POS - Lógica de Negocio
Implementa el flujo de Odoo: DRAFT -> VALIDATED -> PAID
Con transacciones atómicas para integridad de datos
"""
from app.db.tenant_session import TenantSession
from sqlalchemy import and_
from datetime import datetime
from typing import List, Optional, Union
from fastapi import HTTPException
from decimal import Decimal
from app.core.utils import round_decimal

from app.models.base import (
    Ticket, SaleItem, Payment, Product, CashSession, 
    InventoryMovement, InventoryMovementItem,
    SaleState, PaymentMethod, MovementType, RefundReason, StorageLocation, ProductType
)
from app.schemas.pos import (
    SaleCreate, SaleResponse, SaleItemCreate, PaymentCreate,
    RefundCreate, RefundResponse, QuickSaleCreate
)

class POSService:
    """Servicio de Punto de Venta con lógica transaccional"""
    
    @staticmethod
    def generate_ticket_number(db: TenantSession, prefix: str = "T") -> str:
        """Genera número de ticket único: T-2026-0001 o NC-2026-0001"""
        year = datetime.now().year
        last_ticket = db.query(Ticket).filter(
            Ticket.ticket_number.like(f"{prefix}-{year}-%")
        ).order_by(Ticket.ticket_number.desc()).first()
        
        if last_ticket:
            try:
                last_num = int(last_ticket.ticket_number.split('-')[-1])
                new_num = last_num + 1
            except (ValueError, IndexError):
                new_num = 1
        else:
            new_num = 1
            
        return f"{prefix}-{year}-{new_num:04d}"
    
    @staticmethod
    def calculate_totals(items: List[SaleItemCreate]) -> tuple[Decimal, Decimal, Decimal]:
        """
        Calcula subtotal (neto), IVA y total usando Decimal para precisión.
        
        MODELO DE PRECIOS: El precio registrado en el sistema ES el precio final
        que paga el cliente (IVA incluido). El IVA se EXTRAE del precio, no se agrega.
        
        Ejemplo: producto a $4.000
          → Total (lo que paga cliente) = $4.000
          → IVA (19% del total)         = $760
          → Neto (subtotal sin IVA)     = $3.240
        
        Returns: (neto, iva, total)
        """
        total = Decimal('0.00')
        for item in items:
            item_qty = Decimal(str(item.quantity))
            item_price = Decimal(str(item.price))
            item_disc = Decimal(str(item.discount_percent)) if item.discount_percent else Decimal('0')
            
            item_total = item_qty * item_price
            if item_disc > 0:
                item_total *= (Decimal('1') - (item_disc / Decimal('100')))
            total += item_total
        
        # El precio YA incluye IVA → extraemos IVA del total
        total      = round_decimal(total)
        tax_amount = round_decimal(total * Decimal('0.19'))
        subtotal   = round_decimal(total - tax_amount)   # neto sin IVA
        
        return (subtotal, tax_amount, total)
    
    @staticmethod
    def create_sale_draft(
        db: TenantSession, 
        sale_data: Union[SaleCreate, QuickSaleCreate]
    ) -> Ticket:
        """
        Crea una venta, y descuenta el stock de forma atómica.
        Usa with_for_update para control de concurrencia.
        """
        if isinstance(sale_data, QuickSaleCreate):
            payments = [PaymentCreate(
                payment_method=sale_data.payment_method,
                amount=sale_data.total_amount
            )]
            sale_data = SaleCreate(
                items=sale_data.items,
                payments=payments,
                session_id=sale_data.session_id
            )

        try:
            with db.begin_nested():
                movement = InventoryMovement(
                    type=MovementType.OUT_SALE,
                    reason="Venta POS (Tiempo Real)"
                )
                db.add(movement)
                db.flush()

                final_items_to_create = []

                from sqlalchemy.orm import joinedload
                from app.models.base import ProductBOM
                for item in sale_data.items:
                    original_product = db.tenant_query(Product).options(
                        joinedload(Product.bom_lines).joinedload(ProductBOM.component)
                    ).filter(Product.id == item.product_id).first()
                    if not original_product:
                        raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")

                    if original_product.product_type == ProductType.SERVICE:
                        final_items_to_create.append({
                            "product_id": original_product.id,
                            "quantity": Decimal(str(item.quantity)),
                            "price": Decimal(str(item.price)),
                            "discount_percent": Decimal(str(item.discount_percent)) if item.discount_percent else Decimal('0')
                        })
                        continue

                    from sqlalchemy import or_
                    # Bloqueo preventivo (with_for_update)
                    # Calculamos el consumo total necesario
                    item_consumption_rate = Decimal(str(item.consumption_rate)) if hasattr(item, 'consumption_rate') and getattr(item, 'consumption_rate') is not None else Decimal('1.0')
                    stock_to_deduct = Decimal(str(item.quantity)) * item_consumption_rate

                    candidates = db.tenant_query(Product).outerjoin(Product.location).filter(
                        Product.barcode == original_product.barcode,
                        Product.stock_quantity > 0,
                        or_(StorageLocation.id == None, StorageLocation.name != "Pasillo Mermas")
                    ).with_for_update(of=Product).order_by(Product.stock_quantity.desc()).all()

                    total_available = sum(p.stock_quantity for p in candidates)

                    qty_remaining = stock_to_deduct
                    
                    # 1. Try to take from own stock
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

                        final_items_to_create.append({
                            "product_id": candidate.id,
                            "quantity": take / item_consumption_rate if item_consumption_rate else Decimal('0'),
                            "price": Decimal(str(item.price)),
                            "discount_percent": Decimal(str(item.discount_percent)) if item.discount_percent else Decimal('0'),
                            "consumption_rate": item_consumption_rate,
                            "stock_reduced": take
                        })

                        qty_remaining -= take
                        
                    # 2. If still remaining, check BOM
                    if qty_remaining > 0:
                        has_active_bom = any(b.is_active for b in original_product.bom_lines)
                        if not has_active_bom:
                            raise HTTPException(
                                status_code=400, 
                                detail=f"Stock insuficiente para {original_product.name}. Total disponible: {total_available}, Requerido: {stock_to_deduct}"
                            )
                            
                        # Use the first active BOM line
                        bom = next(b for b in original_product.bom_lines if b.is_active)
                        component_qty_needed = qty_remaining * Decimal(str(bom.qty_per_unit))
                        
                        comp_candidates = db.tenant_query(Product).outerjoin(Product.location).filter(
                            Product.barcode == bom.component.barcode,
                            Product.stock_quantity > 0,
                            or_(StorageLocation.id == None, StorageLocation.name != "Pasillo Mermas")
                        ).with_for_update(of=Product).order_by(Product.stock_quantity.desc()).all()
                        
                        comp_total_available = sum(p.stock_quantity for p in comp_candidates)
                        if comp_total_available < component_qty_needed:
                            raise HTTPException(
                                status_code=400, 
                                detail=f"Stock insuficiente en la materia prima '{bom.component.name}' para fabricar '{original_product.name}'. Disponible: {comp_total_available}, Requerido: {component_qty_needed}"
                            )
                            
                        comp_qty_remaining = component_qty_needed
                        
                        for comp_candidate in comp_candidates:
                            if comp_qty_remaining <= 0:
                                break
                            
                            take_comp = min(Decimal(str(comp_candidate.stock_quantity)), comp_qty_remaining)
                            
                            stock_before = comp_candidate.stock_quantity
                            comp_candidate.stock_quantity -= take_comp
                            stock_after = comp_candidate.stock_quantity
                            
                            mov_item = InventoryMovementItem(
                                movement_id=movement.id,
                                product_id=comp_candidate.id,
                                quantity=-take_comp,
                                stock_before=stock_before,
                                stock_after=stock_after
                            )
                            db.add(mov_item)
                            comp_qty_remaining -= take_comp
                            
                        # Add the sale item pointing to the ORIGINAL product, but it consumed component stock.
                        # The stock_reduced is recorded as the remaining qty of the derivative product,
                        # not the component quantity, so refunds know how many "parches" to return.
                        final_items_to_create.append({
                            "product_id": original_product.id,
                            "quantity": qty_remaining / item_consumption_rate if item_consumption_rate else Decimal('0'),
                            "price": Decimal(str(item.price)),
                            "discount_percent": Decimal(str(item.discount_percent)) if item.discount_percent else Decimal('0'),
                            "consumption_rate": item_consumption_rate,
                            "stock_reduced": qty_remaining
                        })

                subtotal, tax_amount, total = POSService.calculate_totals(sale_data.items)
                total_payments = sum(Decimal(str(p.amount)) for p in sale_data.payments)

                if abs(total_payments - total) > Decimal('1.00'):
                    if abs(total_payments - subtotal) < Decimal('0.10'):
                        total = subtotal
                        tax_amount = Decimal('0.00')

                if abs(total_payments - total) > Decimal('1.00'):
                    raise HTTPException(
                        status_code=400,
                        detail=f"La suma de pagos ({total_payments}) no coincide con el total esperado ({total})"
                    )

                ticket = Ticket(
                    ticket_number=POSService.generate_ticket_number(db),
                    state=SaleState.DRAFT,
                    subtotal=subtotal,
                    tax_amount=tax_amount,
                    total_amount=total,
                    payment_method="MIXED" if len(sale_data.payments) > 1 else (
                        sale_data.payments[0].payment_method.value if hasattr(sale_data.payments[0].payment_method, 'value') else sale_data.payments[0].payment_method
                    ),
                    session_id=sale_data.session_id,
                    customer_id=getattr(sale_data, "customer_id", None),
                    vehicle_id=getattr(sale_data, "vehicle_id", None),
                    document_type=getattr(sale_data, "document_type", "boleta"),
                    comment=getattr(sale_data, "comment", None)
                )
                db.add(ticket)
                db.flush()

                for item_data in final_items_to_create:
                    item_qty = Decimal(str(item_data["quantity"]))
                    item_price = Decimal(str(item_data["price"]))
                    item_discount = Decimal(str(item_data["discount_percent"]))

                    item_subtotal = item_qty * item_price
                    if item_discount > 0:
                        item_subtotal *= (Decimal('1') - (item_discount / Decimal('100')))
                    
                    sale_item = SaleItem(
                        ticket_id=ticket.id,
                        product_id=item_data["product_id"],
                        quantity=item_qty,
                        unit_price=item_price,
                        discount_percent=item_discount,
                        consumption_rate=item_data.get("consumption_rate", Decimal('1.0')),
                        stock_reduced=item_data.get("stock_reduced", item_qty),
                        subtotal=item_subtotal
                    )
                    db.add(sale_item)

                for payment_data in sale_data.payments:
                    try:
                        pm_name = payment_data.payment_method.name if hasattr(payment_data.payment_method, 'name') else payment_data.payment_method.upper()
                        pm_enum = PaymentMethod[pm_name]
                    except (KeyError, AttributeError):
                        pm_val = payment_data.payment_method.value if hasattr(payment_data.payment_method, 'value') else payment_data.payment_method
                        pm_enum = next((m for m in PaymentMethod if m.value == pm_val), PaymentMethod.CASH)

                    payment = Payment(
                        ticket_id=ticket.id,
                        payment_method=pm_enum.value,  # Guardar el string, no el objeto enum
                        amount=payment_data.amount,
                        reference=payment_data.reference
                    )
                    db.add(payment)

                # Assign movement ticket_id
                movement.ticket_id = ticket.id

            db.commit()
            db.refresh(ticket)
            return ticket
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            from sqlalchemy.exc import SQLAlchemyError
            if isinstance(e, SQLAlchemyError):
                print(f"Database error during sale: {e}")
            raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")

    
    @staticmethod
    def validate_sale(db: TenantSession, ticket_id: int) -> Ticket:
        """
        Valida una venta: DRAFT -> VALIDATED
        En el modelo Odoo/Snapshot, esto NO resta stock de inmediato.
        Solo actualiza estado y totales de sesión.
        El descuento de inventario se realiza al CERRAR la sesión (SessionService.close_session).
        """
        ticket = db.tenant_query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")
        
        if ticket.state != SaleState.DRAFT:
            return ticket
        
        # Actualizar estado del ticket
        ticket.state = SaleState.VALIDATED
        ticket.date_validated = datetime.utcnow()
        
        # Actualizar totales de la sesión si existe
        if ticket.session_id:
            session = db.tenant_query(CashSession).filter(CashSession.id == ticket.session_id).first()
            if session:
                for payment in ticket.payments:
                    # Usamos .name para obtener CASH, CARD, etc. o .value para efectivo, tarjeta
                    pm_name = payment.payment_method.name if hasattr(payment.payment_method, "name") else str(payment.payment_method).upper()
                    
                    if "CASH" in pm_name or "EFECTIVO" in pm_name.upper():
                        session.total_sales_cash += payment.amount
                        # Sincronizamos expected_balance (efectivo esperado)
                        session.expected_balance = session.opening_balance + session.total_sales_cash
                    elif "CARD" in pm_name or "TARJETA" in pm_name.upper():
                        session.total_sales_card += payment.amount
                    elif "TRANSFER" in pm_name or "TRANSFERENCIA" in pm_name.upper():
                        session.total_sales_transfer += payment.amount
        
        db.commit()
        db.refresh(ticket)
        return ticket
    
    @staticmethod
    def mark_as_paid(db: TenantSession, ticket_id: int) -> Ticket:
        """
        Marca una venta como pagada: VALIDATED -> PAID
        """
        ticket = db.tenant_query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")
        
        if ticket.state != SaleState.VALIDATED:
            raise HTTPException(status_code=400, detail="El ticket debe estar validado primero")
        
        ticket.state = SaleState.PAID
        db.commit()
        db.refresh(ticket)
        return ticket
    
    @staticmethod
    def create_refund(db: TenantSession, refund_data: RefundCreate) -> tuple[Ticket, Ticket]:
        """
        Crea una nota de crédito (venta negativa)
        NO borra la venta original
        Opcionalmente regresa el producto al inventario o lo marca como merma
        """
        # Obtener venta original
        original_ticket = db.tenant_query(Ticket).filter(
            Ticket.id == refund_data.original_ticket_id
        ).first()
        
        if not original_ticket:
            raise HTTPException(status_code=404, detail="Ticket original no encontrado")
        
        if original_ticket.is_refunded:
            raise HTTPException(status_code=400, detail="Este ticket ya fue reembolsado")
        
        # --- NUEVO: Validar que no hay servicios si se intenta gestionar stock/mermas ---
        for item_data in refund_data.items:
            product = db.tenant_query(Product).filter(Product.id == item_data.product_id).first()
            if product and product.product_type == ProductType.SERVICE:
                # Si el usuario eligió una razón que implica movimiento físico o intentó forzarlo 
                # (aunque para servicios el backend lo ignora), lanzamos el error solicitado.
                if refund_data.refund_reason == RefundReason.RETURN_TO_STOCK or not refund_data.return_to_stock:
                     # El usuario dijo: "un servicio no se puede enviar ni a estock ni a mermas"
                     # Si es merma (return_to_stock=False) o devolución stock (Reason)
                     raise HTTPException(
                         status_code=400, 
                         detail=f"El ítem '{product.name}' es un SERVICIO y no es inventariable. No se puede enviar a stock ni a mermas."
                     )
        
        # Crear nota de crédito (venta negativa)
        credit_note = Ticket(
            ticket_number=POSService.generate_ticket_number(db, prefix="NC"),
            state=SaleState.REFUNDED,
            subtotal=-sum(item.quantity * item.price for item in refund_data.items),
            tax_amount=0,  # Se calcula después
            total_amount=0,  # Se calcula después
            payment_method=original_ticket.payment_method,
            session_id=original_ticket.session_id,
            original_ticket_id=original_ticket.id,
            refund_reason=RefundReason(refund_data.refund_reason.value),
            return_to_stock=refund_data.return_to_stock,
            date_validated=datetime.utcnow()
        )
        
        # Recalcular totales
        subtotal, tax_amount, total = POSService.calculate_totals(refund_data.items)
        credit_note.subtotal = -subtotal
        credit_note.tax_amount = -tax_amount
        credit_note.total_amount = -total
        
        db.add(credit_note)
        db.flush()
        
        # Crear items de la nota de crédito
        for item_data in refund_data.items:
            # Rescatamos la tasa de consumo original o asumimos 1.0
            original_sale_item = db.tenant_query(SaleItem).filter(
                SaleItem.ticket_id == original_ticket.id,
                SaleItem.product_id == item_data.product_id
            ).first()
            applied_rate = original_sale_item.consumption_rate if original_sale_item else Decimal('1.0')
            stock_reducido_original = -(item_data.quantity * applied_rate)

            sale_item = SaleItem(
                ticket_id=credit_note.id,
                product_id=item_data.product_id,
                quantity=-item_data.quantity,  # Negativo
                unit_price=item_data.price,
                discount_percent=item_data.discount_percent,
                consumption_rate=applied_rate,
                stock_reduced=stock_reducido_original,
                subtotal=-(item_data.quantity * item_data.price)
            )
            db.add(sale_item)
        
        # Crear movimiento de inventario (LOG para trazabilidad)
        movement_type = MovementType.IN_RETURN if refund_data.return_to_stock else MovementType.OUT_WASTE
        movement = InventoryMovement(
            type=movement_type,
            reason=f"Reembolso {credit_note.ticket_number} - {refund_data.refund_reason.value}",
            ticket_id=credit_note.id
        )
        db.add(movement)
        db.flush()
        
        # Registrar items del movimiento Y actualizar stock en tiempo real
        for item in refund_data.items:
                from sqlalchemy.orm import joinedload
                from app.models.base import ProductBOM
                product = db.tenant_query(Product).options(
                    joinedload(Product.bom_lines).joinedload(ProductBOM.component)
                ).filter(Product.id == item.product_id).first()
                if product:
                    if product.product_type == ProductType.SERVICE:
                        continue
                    
                    stock_before = product.stock_quantity

                    # Obtenemos la tasa de la venta original para devolver exacto el stock
                    original_sale_item = db.tenant_query(SaleItem).filter(
                        SaleItem.ticket_id == original_ticket.id,
                        SaleItem.product_id == product.id
                    ).first()
                    applied_rate = original_sale_item.consumption_rate if original_sale_item else Decimal('1.0')
                    total_to_return = item.quantity * applied_rate
                    
                    # ── CHECK BOM ────────────────────────────────────────────────
                    # Si el producto tiene receta activa, devolvemos stock a la materia prima en su lugar.
                    target_product = product
                    target_quantity = total_to_return
                    has_active_bom = any(b.is_active for b in product.bom_lines)
                    
                    if has_active_bom:
                        bom = next(b for b in product.bom_lines if b.is_active)
                        target_product = bom.component
                        target_quantity = total_to_return * Decimal(str(bom.qty_per_unit))
                        stock_before = target_product.stock_quantity

                    if refund_data.return_to_stock:
                        # ── REINGRESO AL STOCK ───────────────────────────────────────
                        # Sumamos la cantidad devuelta al producto destino
                        target_product.stock_quantity += target_quantity
                        stock_after = target_product.stock_quantity

                        movement_item = InventoryMovementItem(
                            movement_id=movement.id,
                            product_id=target_product.id,
                            quantity=target_quantity,         # positivo = entra al stock
                            stock_before=stock_before,
                            stock_after=stock_after
                        )
                else:
                    # ── MERMA (no regresa al stock útil) ────────────────────────
                    # Buscamos o creamos el Pasillo Mermas
                    merma_location = db.tenant_query(StorageLocation).filter(
                        StorageLocation.name == "Pasillo Mermas",
                        StorageLocation.branch_id == original_ticket.branch_id
                    ).first()
                    if not merma_location:
                        merma_location = StorageLocation(
                            name="Pasillo Mermas",
                            zone="Virtual",
                            path="Virtual/Mermas",
                            allows_multiple_products=True,
                            branch_id=original_ticket.branch_id
                        )
                        db.add(merma_location)
                        db.flush()

                    # Buscamos si ya hay un "twin" del producto destino en merma
                    merma_product = db.tenant_query(Product).filter(
                        Product.barcode == target_product.barcode,
                        Product.location_id == merma_location.id
                    ).first()

                    if not merma_product:
                        # Creamos gemelo en Pasillo Mermas con stock inicial 0
                        merma_product = Product(
                            name=target_product.name,
                            barcode=target_product.barcode,
                            price=target_product.price,
                            cost=target_product.cost,
                            uom=target_product.uom,
                            product_type=target_product.product_type,
                            category_id=target_product.category_id,
                            location_id=merma_location.id,
                            stock_quantity=0,
                            is_active=True,
                            branch_id=original_ticket.branch_id
                        )
                        db.add(merma_product)
                        db.flush()

                    # Movemos al Pasillo Mermas
                    merma_product.stock_quantity += target_quantity
                    stock_after = stock_before  # El stock útil original no cambia al enviar a merma

                    movement_item = InventoryMovementItem(
                        movement_id=movement.id,
                        product_id=target_product.id,
                        quantity=-target_quantity,         # negativo = sale como merma (conceptualmente)
                        stock_before=stock_before,
                        stock_after=stock_after
                    )

                db.add(movement_item)
        
        # Marcar ticket original como reembolsado
        original_ticket.is_refunded = True
        original_ticket.state = SaleState.REFUNDED
        original_ticket.refund_ticket_id = credit_note.id
        
        # --- NUEVO: Actualizar totales de la sesión para el reembolso ---
        # Restamos el total reembolsado de los totales de la sesión
        if original_ticket.session_id:
            session = db.tenant_query(CashSession).filter(CashSession.id == original_ticket.session_id).first()
            if session:
                # Como es una nota de crédito, total_amount ya es negativo. 
                # Simplemente lo sumamos (lo cual restará del acumulado positivo).
                # Nota: Si era mixto, aquí simplificamos usando el método principal 
                # o prorrateando. Por ahora usamos el proporcional si es un solo método.
                main_method = original_ticket.payment_method
                if main_method == "efectivo":
                    session.total_sales_cash += credit_note.total_amount
                    # Re-sincronizar expected_balance
                    session.expected_balance = session.opening_balance + session.total_sales_cash
                elif main_method == "tarjeta":
                    session.total_sales_card += credit_note.total_amount
                elif main_method == "transferencia":
                    session.total_sales_transfer += credit_note.total_amount
                else:
                    # Si es MIXTO, restamos del proporcional (simplificado al efectivo por ahora)
                    session.total_sales_cash += credit_note.total_amount
                    session.expected_balance = session.opening_balance + session.total_sales_cash

        db.commit()
        db.refresh(credit_note)
        db.refresh(original_ticket)
        
        return (credit_note, original_ticket)
    
    @staticmethod
    def get_sale_by_id(db: TenantSession, ticket_id: int) -> Optional[Ticket]:
        """Obtiene una venta por ID"""
        from sqlalchemy.orm import joinedload
        return db.tenant_query(Ticket).options(
            joinedload(Ticket.customer),
            joinedload(Ticket.items).joinedload(SaleItem.product),
            joinedload(Ticket.payments)
        ).filter(Ticket.id == ticket_id).first()
    
    @staticmethod
    def get_sales_by_session(db: TenantSession, session_id: int) -> List[Ticket]:
        """Obtiene todas las ventas de una sesión"""
        from sqlalchemy.orm import joinedload
        return db.tenant_query(Ticket).options(
            joinedload(Ticket.customer),
            joinedload(Ticket.items).joinedload(SaleItem.product),
            joinedload(Ticket.payments)
        ).filter(Ticket.session_id == session_id).order_by(Ticket.date_created.desc()).all()
