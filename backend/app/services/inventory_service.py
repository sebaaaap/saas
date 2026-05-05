from sqlalchemy.orm import Session
from app.models.base import InventoryMovement, InventoryMovementItem, Product, MovementType
from app.schemas.inventory import InventoryMovementCreate, InventoryMovementItemCreate
from fastapi import HTTPException

class InventoryService:
    def __init__(self, db: Session):
        self.db = db

    def _get_or_create_merma_location(self, branch_id=None) -> int:
        from app.models.base import StorageLocation
        query = self.db.query(StorageLocation).filter(StorageLocation.name == "Pasillo Mermas")
        if branch_id:
            query = query.filter(StorageLocation.branch_id == branch_id)
        else:
            query = query.filter(StorageLocation.branch_id == None)
            
        merma_loc = query.first()
        if not merma_loc:
            merma_loc = StorageLocation(
                name="Pasillo Mermas",
                zone="Virtual",
                path="Virtual/Mermas",
                allows_multiple_products=True, # Mermas siempre acepta múltiples SKU
                branch_id=branch_id
            )
            self.db.add(merma_loc)
            self.db.flush()
        return merma_loc.id

    def _get_or_create_stock_location(self, branch_id=None) -> int:
        from app.models.base import StorageLocation
        # Intentamos buscar "Pasillo Stock" o simplemente "Stock" si el usuario lo prefiere, pero usaremos "Pasillo Stock" para consistencia
        query = self.db.query(StorageLocation).filter(StorageLocation.name == "Pasillo Stock")
        if branch_id:
            query = query.filter(StorageLocation.branch_id == branch_id)
        else:
            query = query.filter(StorageLocation.branch_id == None)
            
        stock_loc = query.first()
        if not stock_loc:
            stock_loc = StorageLocation(
                name="Pasillo Stock",
                zone="General",
                path="General/Stock",
                branch_id=branch_id
            )
            self.db.add(stock_loc)
            self.db.flush()
        return stock_loc.id

    def _get_or_create_traslados_location(self, branch_id=None) -> int:
        from app.models.base import StorageLocation
        query = self.db.query(StorageLocation).filter(StorageLocation.name == "Traslados")
        if branch_id:
            query = query.filter(StorageLocation.branch_id == branch_id)
        else:
            query = query.filter(StorageLocation.branch_id == None)
            
        stock_loc = query.first()
        if not stock_loc:
            stock_loc = StorageLocation(
                name="Traslados",
                zone="General",
                path="General/Traslados",
                branch_id=branch_id
            )
            self.db.add(stock_loc)
            self.db.flush()
        return stock_loc.id

    def _transfer_stock(self, product: Product, quantity: float, to_location_id: int) -> tuple[Product, Product]:
        """
        Ejecuta la lógica de transferencia de stock.
        Retorna (producto_origen, producto_destino_o_actualizado).
        Si el producto origen se borra (fusión total), producto_origen será el objeto borrado (pero con ID válido).
        """
        # Buscar si ya existe el mismo producto ACTIVO en la ubicación de destino
        target_product = self.db.query(Product).filter(
            Product.barcode == product.barcode,
            Product.location_id == to_location_id,
            Product.is_active == True
        ).first()

        # VALIDACIÓN DE RESTRICCIÓN DE UBICACIÓN (SI ES ESTRICTA)
        from app.models.base import StorageLocation
        target_loc = self.db.query(StorageLocation).filter(StorageLocation.id == to_location_id).first()
        
        if target_loc and not target_loc.allows_multiple_products:
            # Si no permite múltiples, verificamos si hay OTRO producto (diferente barcode) con stock > 0
            other_occupant = self.db.query(Product).filter(
                Product.location_id == to_location_id,
                Product.barcode != product.barcode,
                Product.is_active == True,
                Product.stock_quantity > 0
            ).first()
            
            if other_occupant:
                raise HTTPException(
                    status_code=400, 
                    detail=f"La ubicación '{target_loc.name}' es de producto único y está ocupada por '{other_occupant.name}'. No se permiten múltiples productos aquí."
                )

        # Caso traslado total (o mayor al stock disponible)
        if quantity >= product.stock_quantity:
            qty_to_move = product.stock_quantity # Movemos todo lo que hay
            
            if target_product:
                # Si existe en destino: Sumar al destino y DESACTIVAR el origen (Fusión lógica)
                target_product.stock_quantity += qty_to_move
                
                # En lugar de borrar físicamente, desactivamos para no romper el historial de movimientos
                product.stock_quantity = 0
                product.is_active = False
                
                return (target_product, target_product) 
            else:
                # Si NO existe en destino: Mover el registro completo (cambiar location_id)
                product.location_id = to_location_id
                return (product, product)
        
        else:
            # Caso traslado parcial
            # 1. Restar del producto origen
            product.stock_quantity -= quantity
            
            if target_product:
                 # 2. Si existe, sumar
                target_product.stock_quantity += quantity
                return (product, target_product) 
            else:
                # 3. Si no existe, crear clon
                new_product = Product(
                    name=product.name,
                    internal_reference=product.internal_reference,
                    barcode=product.barcode,
                    price=product.price,
                    cost=product.cost,
                    uom=product.uom,
                    product_type=product.product_type,
                    category_id=product.category_id,
                    image_path=product.image_path,
                    min_stock=product.min_stock,
                    is_active=product.is_active,
                    location_id=to_location_id,
                    stock_quantity=quantity
                )
                self.db.add(new_product)
                self.db.flush()
                return (product, new_product)

    def restore_from_mermas(self, product_id: int, quantity: float) -> InventoryMovement:
        """
        Restaura stock desde Pasillo Mermas a Pasillo Stock.
        """
        # 1. Validar producto
        product = self.db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
            
        # 2. Obtener ubicaciones
        merma_id = self._get_or_create_merma_location(product.branch_id)
        stock_id = self._get_or_create_stock_location(product.branch_id)
        
        if product.location_id != merma_id:
            raise HTTPException(status_code=400, detail="El producto no está en Pasillo Mermas")
            
        # 3. Validar cantidad
        if product.stock_quantity < quantity:
             raise HTTPException(status_code=400, detail="Stock insuficiente en Mermas para restaurar")

        # 4. Crear Movimiento (Reutilizamos la lógica de INTERNAL_TRANSFER validando IDs)
        # Construimos el objeto InventoryMovementCreate
        
        data = InventoryMovementCreate(
            type="INTERNAL_TRANSFER",
            reason="Restauración desde Mermas",
            to_location_id=stock_id,
            items=[
                InventoryMovementItemCreate(product_id=product_id, quantity=quantity)
            ]
        )
        
        return self.create_movement(data)

    def create_movement(self, data: InventoryMovementCreate) -> InventoryMovement:
        # Convertir string a Enum
        try:
            mov_type = MovementType[data.type]
        except KeyError:
            raise HTTPException(status_code=400, detail=f"Tipo de movimiento inválido: {data.type}")

        movement = InventoryMovement(
            type=mov_type,
            reason=data.reason
        )
        self.db.add(movement)
        self.db.flush()

        for item in data.items:
            product = self.db.query(Product).filter(Product.id == item.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")

            # Capturar stock antes del movimiento para trazabilidad
            stock_before = product.stock_quantity
            final_product_for_log = product # Por defecto logueamos el producto original
            
            # Actualizar Stock
            if "IN_" in mov_type.name:
                product.stock_quantity += item.quantity
            
            elif mov_type == MovementType.OUT_WASTE:
                # MERCANCÍA DAÑADA -> MOVER A PASILLO MERMAS
                merma_loc_id = self._get_or_create_merma_location(product.branch_id)
                
                # Verify if product is ALREADY in Mermas
                if product.location_id == merma_loc_id:
                    # DISPOSAL FROM MERMAS (Eliminación definitiva)
                    if product.stock_quantity < item.quantity:
                         # Ajustamos para evitar negativos o permitimos parcial
                         pass # Dejamos que la validación ocurra o asumimos que frontend sabe
                    
                    product.stock_quantity -= item.quantity
                    if product.stock_quantity < 0: product.stock_quantity = 0

                    # Si llega a 0, lo desactivamos (Soft Delete) para que "desaparezca"
                    if product.stock_quantity <= 0.0001:
                        product.is_active = False

                    final_product_for_log = product
                else:
                    # MOVER A MERMAS (Transferencia)
                    # Validar stock
                    if product.stock_quantity < item.quantity:
                         raise HTTPException(status_code=400, detail=f"Stock insuficiente para merma de {product.name}")

                    # Ejecutar traslado a mermas
                    origin_p, dest_p = self._transfer_stock(product, item.quantity, merma_loc_id)
                    
                    # Si hubo fusión (origen borrado), usamos el destino para el log
                    if origin_p.id == dest_p.id and origin_p != product:
                         final_product_for_log = dest_p
                    elif origin_p == dest_p: # Movimiento total sin fusión
                         final_product_for_log = dest_p

            elif mov_type == MovementType.INTERNAL_TRANSFER:
                if not data.to_location_id:
                    raise HTTPException(status_code=400, detail="Se requiere 'to_location_id' para traslados internos")
                
                if product.stock_quantity < item.quantity:
                     raise HTTPException(status_code=400, detail=f"Stock insuficiente para traslado de {product.name}")

                origin_p, dest_p = self._transfer_stock(product, item.quantity, data.to_location_id)
                
                if origin_p.id == dest_p.id: # Fusión o mov total
                    final_product_for_log = dest_p
                
            elif "OUT_" in mov_type.name:
                # Salida pura (Venta, Ajuste de Salida) -> Desaparece
                if product.stock_quantity < item.quantity:
                    if mov_type != MovementType.OUT_ADJUSTMENT:
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Stock insuficiente para {product.name}. Disp: {product.stock_quantity}"
                        )
                product.stock_quantity -= item.quantity

            inv_item = InventoryMovementItem(
                movement_id=movement.id,
                product_id=final_product_for_log.id,
                quantity=item.quantity, 
                stock_before=stock_before,
                stock_after=final_product_for_log.stock_quantity # Esto puede ser confuso si se movió, pero es lo que hay
            )
            self.db.add(inv_item)

        try:
            self.db.commit()
            self.db.refresh(movement)
            return movement
        except Exception as e:
            self.db.rollback()
            raise e
    def transfer_between_branches(self, data: 'InterBranchTransferCreate', user_id: str = None) -> InventoryMovement:
        """
        Transfiere stock entre sucursales.
        Crea dos movimientos: uno de SALIDA en origen y uno de ENTRADA en destino.
        """
        # 1. Crear movimiento de salida en origen
        exit_movement = InventoryMovement(
            type=MovementType.BRANCH_TRANSFER_OUT,
            reason=f"Hacia sucursal {data.to_branch_id}: {data.reason or ''}",
            user_id=user_id
        )
        self.db.add(exit_movement)
        
        # 2. Crear movimiento de entrada en destino
        entry_movement = InventoryMovement(
            type=MovementType.BRANCH_TRANSFER_IN,
            reason=f"Desde sucursal {data.from_branch_id}: {data.reason or ''}",
            user_id=user_id
        )
        self.db.add(entry_movement)
        self.db.flush()

        for item_req in data.items:
            # Producto origen
            source_p = self.db.query(Product).filter(
                Product.id == item_req.product_id,
                Product.branch_id == data.from_branch_id
            ).first()
            
            if not source_p:
                raise HTTPException(status_code=404, detail=f"Producto {item_req.product_id} no encontrado en origen")
            
            if source_p.stock_quantity < item_req.quantity:
                raise HTTPException(status_code=400, detail=f"Stock insuficiente en origen para {source_p.name}")

            # 3. Restar stock en origen
            stock_before_exit = source_p.stock_quantity
            source_p.stock_quantity -= item_req.quantity
            
            exit_item = InventoryMovementItem(
                movement_id=exit_movement.id,
                product_id=source_p.id,
                quantity=item_req.quantity,
                stock_before=stock_before_exit,
                stock_after=source_p.stock_quantity
            )
            self.db.add(exit_item)

            # 4. Buscar o crear producto en destino
            target_p = self.db.query(Product).filter(
                Product.barcode == source_p.barcode,
                Product.branch_id == data.to_branch_id,
                Product.is_active == True
            ).first()

            if not target_p:
                # Si no existe en destino, crear clon en el pasillo "Traslados" de destino
                target_loc_id = self._get_or_create_traslados_location(data.to_branch_id)
                target_p = Product(
                    name=source_p.name,
                    barcode=source_p.barcode,
                    internal_reference=source_p.internal_reference,
                    price=source_p.price,
                    cost=source_p.cost,
                    uom=source_p.uom,
                    product_type=source_p.product_type,
                    category_id=source_p.category_id, # Asumimos categorías globales o compartidas
                    image_path=source_p.image_path,
                    min_stock=source_p.min_stock,
                    branch_id=data.to_branch_id,
                    location_id=target_loc_id,
                    stock_quantity=0
                )
                self.db.add(target_p)
                self.db.flush()

            # 5. Sumar stock en destino
            stock_before_entry = target_p.stock_quantity
            target_p.stock_quantity += item_req.quantity
            
            entry_item = InventoryMovementItem(
                movement_id=entry_movement.id,
                product_id=target_p.id,
                quantity=item_req.quantity,
                stock_before=stock_before_entry,
                stock_after=target_p.stock_quantity
            )
            self.db.add(entry_item)

        try:
            self.db.commit()
            return exit_movement # Retornamos el de salida como referencia
        except Exception as e:
            self.db.rollback()
            raise e
