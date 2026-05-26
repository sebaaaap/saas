from app.db.tenant_session import TenantSession
from app.models.base import Product, Purchase, PurchaseItem, PurchaseState, MovementType, InventoryMovement, InventoryMovementItem
from app.schemas.purchases import PurchaseCreate, PurchaseUpdate
from fastapi import HTTPException
from decimal import Decimal
from app.core.utils import round_decimal

class PurchaseService:
    def __init__(self, db: TenantSession):
        self.db = db

    def create_purchase(self, data: PurchaseCreate) -> Purchase:
        """
        Crea una compra en estado BORRADOR (similar a Odoo).
        No afecta el stock hasta que se confirme.
        """
        # Validar que haya items (solo para MERCADERÍA — GASTO_OPERATIVO puede no tener ítems)
        category = data.purchase_category or "MERCADERÍA"
        if (not data.items or len(data.items) == 0) and category == "MERCADERÍA":
            pass  # Permitir borrador vacío; el usuario añade items manualmente
        
        # Validar proveedor si viene
        if data.supplier_id:
            from app.models.base import Supplier
            supplier = self.db.tenant_query(Supplier).filter(Supplier.id == data.supplier_id).first()
            if not supplier:
                raise HTTPException(status_code=404, detail=f"Proveedor {data.supplier_id} no encontrado")
        
        # Crear registro de compra en BORRADOR
        purchase = Purchase(
            supplier_id=data.supplier_id,
            invoice_number=data.invoice_number,
            purchase_category=data.purchase_category or "MERCADERÍA",
            notes=data.notes,
            subtotal_net=0,
            tax_amount=0,
            total_cost=0,
            state=PurchaseState.DRAFT
        )
        self.db.add(purchase)
        self.db.flush()

        calculated_net = Decimal('0.00')

        # Crear items de compra
        for item in data.items:
            # Validar producto
            product = self.db.tenant_query(Product).filter(Product.id == item.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")
            
            # Validar cantidad
            if item.quantity <= 0:
                raise HTTPException(status_code=400, detail=f"La cantidad debe ser mayor a 0")
            
            # Validar costo
            if item.unit_cost < 0:
                raise HTTPException(status_code=400, detail=f"El costo unitario no puede ser negativo")

            item_qty = Decimal(str(item.quantity))
            item_cost = Decimal(str(item.unit_cost))
            
            subtotal = round_decimal(item_qty * item_cost)
            
            purchase_item = PurchaseItem(
                purchase_id=purchase.id,
                product_id=product.id,
                quantity=item.quantity,
                unit_cost=item.unit_cost
            )
            self.db.add(purchase_item)
            calculated_net += subtotal

        total_cost = round_decimal(calculated_net)
        purchase.total_cost = total_cost
        purchase.tax_amount = round_decimal(total_cost * Decimal('0.19')) # IVA 19%
        purchase.subtotal_net = round_decimal(total_cost - purchase.tax_amount) # Neto es total - IVA
        
        try:
            self.db.commit()
            self.db.refresh(purchase)
            return purchase
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Error al crear la compra: {str(e)}")

    def confirm_purchase(self, purchase_id: int) -> Purchase:
        """
        Confirma una compra (similar a Odoo):
        1. Cambia el estado a CONFIRMADO
        2. Actualiza el costo de los productos
        3. Genera movimiento de inventario (entrada)
        4. Incrementa el stock
        """
        purchase = self.db.tenant_query(Purchase).filter(Purchase.id == purchase_id).first()
        if not purchase:
            raise HTTPException(status_code=404, detail="Compra no encontrada")
        
        if purchase.state != PurchaseState.DRAFT:
            raise HTTPException(
                status_code=400, 
                detail=f"Solo se pueden confirmar compras en estado borrador. Estado actual: {purchase.state.value}"
            )
        
        branch_id = purchase.branch_id  # Usar la sucursal de la compra para todos los filtros

        # Validar que todos los productos existan antes de tocar nada
        for item in purchase.items:
            product = self.db.tenant_query(Product).filter(Product.id == item.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")
        
        # Cambiar estado a CONFIRMADO
        purchase.state = PurchaseState.CONFIRMED
        
        try:
            # Generar movimiento de inventario (IN_PURCHASE)
            movement = InventoryMovement(
                type=MovementType.IN_PURCHASE,
                reason=f"Compra #{purchase.id}" + (f" - Factura: {purchase.invoice_number}" if purchase.invoice_number else "")
            )
            self.db.add(movement)
            self.db.flush()

            # Obtener la ubicación de mermas UNA VEZ, filtrada por sucursal
            from app.models.base import StorageLocation
            merma_loc_q = self.db.tenant_query(StorageLocation).filter(
                StorageLocation.name == "Pasillo Mermas"
            )
            if branch_id:
                merma_loc_q = merma_loc_q.filter(StorageLocation.branch_id == branch_id)
            merma_loc = merma_loc_q.first()
            merma_loc_id = merma_loc.id if merma_loc else None

            for item in purchase.items:
                product = self.db.tenant_query(Product).filter(Product.id == item.product_id).first()
                if not product:
                    continue

                target_product = product

                # Si el producto referenciado está en Mermas, buscar otra instancia del mismo SKU
                # en la misma sucursal que no sea Mermas
                if merma_loc_id and product.location_id == merma_loc_id:
                    alt_q = self.db.tenant_query(Product).filter(
                        Product.barcode == product.barcode,
                        Product.location_id != merma_loc_id,
                        Product.is_active == True
                    )
                    if branch_id:
                        alt_q = alt_q.filter(Product.branch_id == branch_id)
                    alt_product = alt_q.first()

                    if alt_product:
                        target_product = alt_product

                # Capturar stock antes para trazabilidad
                stock_before = target_product.stock_quantity

                # Incrementar stock
                target_product.stock_quantity += item.quantity
                # Actualizar costo (último costo de adquisición)
                target_product.cost = item.unit_cost
                if target_product.id != product.id:
                    product.cost = item.unit_cost  # Sincronizar costo en registro de mermas también

                # Registrar movimiento
                inv_item = InventoryMovementItem(
                    movement_id=movement.id,
                    product_id=target_product.id,
                    quantity=item.quantity,
                    stock_before=stock_before,
                    stock_after=target_product.stock_quantity
                )
                self.db.add(inv_item)

            self.db.commit()
            self.db.refresh(purchase)
            return purchase
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Error al confirmar la compra: {str(e)}")

    def cancel_purchase(self, purchase_id: int) -> Purchase:
        """
        Cancela una compra (solo si está en borrador)
        """
        purchase = self.db.tenant_query(Purchase).filter(Purchase.id == purchase_id).first()
        if not purchase:
            raise HTTPException(status_code=404, detail="Compra no encontrada")
        
        if purchase.state == PurchaseState.CONFIRMED:
            raise HTTPException(
                status_code=400, 
                detail="No se puede cancelar una compra confirmada. Debe crear una devolución."
            )
        
        if purchase.state == PurchaseState.CANCELLED:
            raise HTTPException(status_code=400, detail="La compra ya está cancelada")
        
        purchase.state = PurchaseState.CANCELLED
        
        try:
            self.db.commit()
            self.db.refresh(purchase)
            return purchase
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Error al cancelar la compra: {str(e)}")

    def get_purchase(self, purchase_id, branch_id=None) -> Purchase:
        """
        Obtiene una compra por ID. Opcionalmente valida que pertenezca a la sucursal.
        """
        q = self.db.tenant_query(Purchase).filter(Purchase.id == purchase_id)
        if branch_id:
            q = q.filter(Purchase.branch_id == branch_id)
        purchase = q.first()
        if not purchase:
            raise HTTPException(status_code=404, detail="Compra no encontrada")
        return purchase

    def list_purchases(self, state: str = None, branch_id=None) -> list[Purchase]:
        """
        Lista compras filtradas por sucursal (y opcionalmente por estado).
        """
        query = self.db.tenant_query(Purchase)

        if branch_id:
            query = query.filter(Purchase.branch_id == branch_id)

        if state:
            try:
                state_enum = PurchaseState[state.upper()]
                query = query.filter(Purchase.state == state_enum)
            except KeyError:
                raise HTTPException(status_code=400, detail=f"Estado inválido: {state}")

        return query.order_by(Purchase.date_created.desc()).all()

    def update_purchase(self, purchase_id: int, data: PurchaseUpdate) -> Purchase:
        """
        Actualiza una compra (solo si está en borrador)
        """
        purchase = self.db.tenant_query(Purchase).filter(Purchase.id == purchase_id).first()
        if not purchase:
            raise HTTPException(status_code=404, detail="Compra no encontrada")
        
        if purchase.state != PurchaseState.DRAFT:
            raise HTTPException(
                status_code=400, 
                detail="Solo se pueden editar compras en estado borrador"
            )
        
        # Actualizar campos
        if data.supplier_id is not None:
            if data.supplier_id:
                from app.models.base import Supplier
                supplier = self.db.tenant_query(Supplier).filter(Supplier.id == data.supplier_id).first()
                if not supplier:
                    raise HTTPException(status_code=404, detail=f"Proveedor {data.supplier_id} no encontrado")
            purchase.supplier_id = data.supplier_id
        
        if data.invoice_number is not None:
            purchase.invoice_number = data.invoice_number
        
        if data.notes is not None:
            purchase.notes = data.notes
        
        try:
            self.db.commit()
            self.db.refresh(purchase)
            return purchase
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Error al actualizar la compra: {str(e)}")
