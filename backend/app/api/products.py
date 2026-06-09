from uuid import UUID
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from app.database import get_db_session
from app.services.image_service import ImageService
from app.models.base import Product, StorageLocation, ProductBOM
from app.schemas.locations import ProductResponseWithLocation
from pydantic import BaseModel
from typing import List, Optional
from app.api.deps import check_roles, get_tenant_session
from app.db.tenant_session import TenantSession

router = APIRouter()

# Schema simple para creación de producto (MVP)
class ProductCreate(BaseModel):
    name: str
    internal_reference: Optional[str] = None
    barcode: Optional[str] = None
    price: float
    cost: float
    uom: str = "unidades"
    stock_quantity: float = 0
    min_stock: float = 5
    image_path: Optional[str] = None
    category_id: Optional[UUID] = None
    product_type: str = "STORABLE"
    location_id: Optional[UUID] = None
    is_variable_consumption: bool = False
    default_consumption_rate: float = 1.0
    supplier_id: Optional[UUID] = None
    supplier_code: Optional[str] = None
    is_raw_material: bool = False

class BOMLineCreate(BaseModel):
    component_id: UUID
    qty_per_unit: float
    component_uom: Optional[str] = None  # Si no se manda, se toma del producto componente

class BOMLineRead(BOMLineCreate):
    id: UUID
    product_id: UUID
    component_name: str
    
    class Config:
        from_attributes = True

import pandas as pd
import io
import random
from app.models.base import ProductCategory, InventoryMovement, InventoryMovementItem, MovementType, ProductType

@router.post("/upload-image")
def upload_product_image(
    file: UploadFile = File(...),
    current_user = Depends(check_roles(["admin"]))
):
    url = ImageService.save_image(file)
    return {"url": url}

@router.post("/import")
async def import_products(
    file: UploadFile = File(...),
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "inventario"])),
    branch_id: Optional[UUID] = Header(None, alias="X-Branch-ID")
):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="El archivo debe ser un Excel (.xlsx o .xls)")
        
    try:
        content = await file.read()
        df = pd.read_excel(io.BytesIO(content))
        
        # Normalizar columnas
        df.columns = [str(c).strip().lower() for c in df.columns]
        
        required_cols = {"nombre", "codigo de barras", "precio venta", "costo", "stock inicial", "categoria"}
        if not required_cols.issubset(set(df.columns)):
            missing = required_cols - set(df.columns)
            raise HTTPException(status_code=400, detail=f"Faltan columnas obligatorias: {missing}. Encontradas: {list(df.columns)}")
            
        movement = None
        user_id = getattr(current_user, "id", None) or getattr(current_user, "username", "admin")
        
        for _, row in df.iterrows():
            name = str(row["nombre"]).strip()
            raw_barcode = str(row.get("codigo de barras", "")).strip()
            
            if pd.isna(name) or not name:
                continue
                
            # Autogeneración de barcode si viene vacío (Simulando un EAN-13 interno con prefijo 200)
            if pd.isna(raw_barcode) or raw_barcode.lower() == "nan" or not raw_barcode:
                barcode = f"200{random.randint(1000000000, 9999999999)}"
            else:
                barcode = raw_barcode
                
                
            price = float(row.get("precio venta") if pd.notna(row.get("precio venta")) else 0)
            cost = float(row.get("costo") if pd.notna(row.get("costo")) else 0)
            stock = float(row.get("stock inicial") if pd.notna(row.get("stock inicial")) else 0)
            category_name = str(row.get("categoria", "")).strip()
            pasillo_path = str(row.get("pasillo", "")).strip()
            min_stock = float(row.get("stock minimo") if pd.notna(row.get("stock minimo")) else 5)
            
            internal_ref = str(row.get("referencia interna", "")).strip()
            if pd.isna(internal_ref) or internal_ref.lower() == "nan" or not internal_ref:
                internal_ref = None
                
            materia_prima = str(row.get("materia prima", "no")).strip().lower()
            is_raw_material = materia_prima in ["si", "sí", "true", "1", "yes"]
            
            # 1. CATEGORIAS (Jerarquía con /)
            cat_obj = None
            if category_name and category_name.lower() != "nan":
                parts = [p.strip() for p in category_name.split("/")]
                parent_id = None
                for part in parts:
                    cat_obj = db.tenant_query(ProductCategory).filter(
                        ProductCategory.name.ilike(part),
                        ProductCategory.parent_id == parent_id
                    ).first()
                    if not cat_obj:
                        colors = ["#e11d48", "#2563eb", "#16a34a", "#ca8a04", "#9333ea", "#0891b2", "#ea580c"]
                        cat_color = random.choice(colors)
                        cat_obj = ProductCategory(name=part, color=cat_color, parent_id=parent_id)
                        db.add(cat_obj)
                        db.flush()
                    parent_id = cat_obj.id

            # 2. UBICACIONES (Jerarquía con /)
            loc_obj = None
            if pasillo_path and pasillo_path.lower() != "nan":
                parts = [p.strip() for p in pasillo_path.split("/")]
                current_path = ""
                parent_id = None
                for part in parts:
                    current_path = f"{current_path}/{part}" if current_path else part
                    loc_obj = db.tenant_query(StorageLocation).filter(
                        StorageLocation.path == current_path,
                        StorageLocation.branch_id == branch_id
                    ).first()
                    if not loc_obj:
                        loc_obj = StorageLocation(
                            name=part, 
                            path=current_path, 
                            parent_id=parent_id,
                            branch_id=branch_id
                        )
                        db.add(loc_obj)
                        db.flush()
                    parent_id = loc_obj.id

            # 3. TIPO PRODUCTO
            prod_type = ProductType.STORABLE
            if category_name and ("servicio" in category_name.lower() or "mano de obra" in category_name.lower()):
                 prod_type = ProductType.SERVICE
                
            # 4. BUSCAR/CREAR PRODUCTO
            product = None
            
            # 4.a Intentar por código de barras si viene en el Excel
            if raw_barcode and raw_barcode.lower() != "nan":
                product = db.tenant_query(Product).filter(
                    Product.barcode == raw_barcode,
                    Product.branch_id == branch_id,
                    Product.is_active == True
                ).first()
                
            # 4.b Si no se encontró (o no venía barcode), intentar por referencia interna
            if not product and internal_ref:
                product = db.tenant_query(Product).filter(
                    Product.internal_reference == internal_ref,
                    Product.branch_id == branch_id,
                    Product.is_active == True
                ).first()
                
            # 4.c Si aún no se encuentra, intentar por coincidencia exacta de nombre
            if not product:
                product = db.tenant_query(Product).filter(
                    Product.name.ilike(name),
                    Product.branch_id == branch_id,
                    Product.is_active == True
                ).first()
            
            # Autogenerar código de barras solo si realmente lo necesitamos
            final_barcode = raw_barcode
            if not final_barcode or final_barcode.lower() == "nan":
                if product and product.barcode:
                    final_barcode = product.barcode # Mantener el que ya tenía
                else:
                    final_barcode = f"200{random.randint(1000000000, 9999999999)}"
            
            is_new = False
            if not product:
                product = Product(
                    name=name,
                    barcode=final_barcode,
                    internal_reference=internal_ref,
                    price=price,
                    cost=cost,
                    stock_quantity=0,
                    min_stock=min_stock,
                    product_type=prod_type,
                    category_id=cat_obj.id if cat_obj else None,
                    category=category_name if cat_obj else None,
                    location_id=loc_obj.id if loc_obj else None,
                    branch_id=branch_id,
                    is_raw_material=is_raw_material
                )
                db.add(product)
                db.flush()
                is_new = True
            else:
                product.name = name
                product.barcode = final_barcode
                product.internal_reference = internal_ref
                product.price = price
                product.cost = cost
                product.min_stock = min_stock
                if cat_obj:
                    product.category_id = cat_obj.id
                    product.category = category_name
                if loc_obj:
                    product.location_id = loc_obj.id
                product.product_type = prod_type
                product.is_raw_material = is_raw_material
                
            # Movimiento Inicial Solo si es nuevo y tiene stock inicial
            if prod_type != ProductType.SERVICE and stock > 0 and is_new:
                if not movement:
                    movement = InventoryMovement(
                        type=MovementType.IN_ADJUSTMENT,
                        reason="Importación masiva Excel inicial",
                        user_id=str(user_id)
                    )
                    db.add(movement)
                    db.flush()
                    
                mov_item = InventoryMovementItem(
                    movement_id=movement.id,
                    product_id=product.id,
                    quantity=stock,
                    stock_before=0,
                    stock_after=stock
                )
                db.add(mov_item)
                product.stock_quantity += stock
                
        db.commit()
        return {"detail": "Importación completada correctamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error leyendo excel: {str(e)}")

@router.post("/", response_model=ProductResponseWithLocation)
def create_product(
    product: ProductCreate, 
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin"])),
    branch_id: Optional[UUID] = Header(None, alias="X-Branch-ID")
):
    if not product.barcode:
        product.barcode = f"200{random.randint(1000000000, 9999999999)}"
        
    query = db.tenant_query(Product).filter(
        Product.barcode == product.barcode,
        Product.is_active == True
    )
    if branch_id:
        query = query.filter(Product.branch_id == branch_id)
    existing_product = query.first()
    
    if existing_product:
        raise HTTPException(
            status_code=400, 
            detail=f"Ya existe un producto activo con el código de barras '{product.barcode}' ({existing_product.name}). "
                   "No se pueden duplicar códigos de barras en el catálogo."
        )

    # 2. Validar location si viene
    if product.location_id:
        loc = db.tenant_query(StorageLocation).filter(
            StorageLocation.id == product.location_id
        ).first()
        if not loc:
            raise HTTPException(status_code=400, detail="Ubicación no válida")
        
        if not loc.allows_multiple_products:
            occupant = db.tenant_query(Product).filter(
                Product.location_id == product.location_id,
                Product.barcode != product.barcode,
                Product.is_active == True,
                Product.stock_quantity > 0
            ).first()
            if occupant:
                raise HTTPException(
                    status_code=400, 
                    detail=f"La ubicación '{loc.name}' es de producto único y ya está ocupada por: {occupant.name}"
                )

    db_product = Product(**product.model_dump(exclude={'supplier_id', 'supplier_code'}))
    if branch_id:
        db_product.branch_id = branch_id
        
    try:
        db.add(db_product)
        db.flush()
        
        if product.supplier_id and product.supplier_code:
            from app.models.base import ProductSupplier
            sup_link = ProductSupplier(
                product_id=db_product.id,
                supplier_id=product.supplier_id,
                supplier_code=product.supplier_code
            )
            db.add(sup_link)
            
        db.commit()
        db.refresh(db_product)
        return db_product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

from sqlalchemy.orm import joinedload
from collections import defaultdict

class ProductLocationDetail(BaseModel):
    id: UUID # ID del registro específico (para operaciones puntuales)
    location_id: UUID
    location_path: Optional[str] = None
    location_name: Optional[str] = None
    stock: float

class ProductAggregatedResponse(BaseModel):
    id: UUID # ID representativo (el primero encontrado)
    name: str
    barcode: str
    price: float
    cost: float
    total_stock: float
    category_id: Optional[UUID]
    product_type: str
    uom: str
    internal_reference: Optional[str]
    locations: List[ProductLocationDetail]
    location_id: Optional[UUID] = None # ID de la ubicación principal (primera encontrada)
    image_path: Optional[str] = None
    is_variable_consumption: bool = False
    default_consumption_rate: float = 1.0
    min_stock: float = 5.0
    suppliers_info: List[dict] = [] # dict mapping to avoid circular import or just simple dict
    is_raw_material: bool = False
    is_scrap: bool = False
    scrap_parent_id: Optional[UUID] = None
    bom_lines: List[BOMLineRead] = []
    available_qty: float = 0.0 # Calculado al vuelo

@router.get("/", response_model=List[ProductAggregatedResponse])
def list_products(
    q: Optional[str] = None,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "inventario", "vendedor"])),
    branch_id: Optional[UUID] = Header(None, alias="X-Branch-ID")
):
    """
    Lista productos agrupados por código de barras con stock total y detalle de ubicaciones.
    Solo muestra productos del tenant (empresa) del usuario logueado.
    """
    query = db.tenant_query(Product).filter(Product.is_active == True)
    if branch_id:
        query = query.filter(Product.branch_id == branch_id)
    
    if q:
        query = query.filter(
            (Product.name.ilike(f"%{q}%")) | 
            (Product.barcode.ilike(f"%{q}%")) |
            (Product.internal_reference.ilike(f"%{q}%"))
        )
        
    products = query.options(
        joinedload(Product.location), 
        joinedload(Product.suppliers_info),
        joinedload(Product.bom_lines).joinedload(ProductBOM.component)
    ).all()
    
    grouped = defaultdict(list)
    for p in products:
        grouped[p.barcode].append(p)
        
    results = []
    for barcode, items in grouped.items():
        # REGLA: El ID representativo debe ser de una ubicación que NO sea Mermas.
        # Así, si se usa en compras/reabastecimiento, el stock nunca irá a Mermas por defecto.
        non_merma_items = [
            i for i in items
            if i.location is None or i.location.name != "Pasillo Mermas"
        ]
        # Usamos el primero no-merma como referencia; si TODOS están en mermas, usamos el primero disponible.
        primary = non_merma_items[0] if non_merma_items else items[0]
        
        # Calcular stock total SOLO de ubicaciones vendibles (excluir Pasillo Mermas)
        # Si location es None, asumimos vendible (stock general sin asignar)
        total_stock = sum(
            i.stock_quantity for i in items 
            if i.location is None or i.location.name != "Pasillo Mermas"
        )
        
        locs = []
        for i in items:
            if i.location:
                locs.append(ProductLocationDetail(
                    id=i.id,
                    location_id=i.location.id,
                    location_path=i.location.path or i.location.name or "",
                    location_name=i.location.name,
                    stock=i.stock_quantity
                ))
        
        # Manejo seguro del Enum product_type
        p_type = primary.product_type
        if hasattr(p_type, "name"):
            p_type = p_type.name
        elif hasattr(p_type, "value"): # Fallback
            p_type = p_type.value
            
        bom_lines_read = []
        available_from_bom = 0.0
        has_bom = False
        
        try:
            has_bom = len(primary.bom_lines) > 0
            available_from_bom_calc = float("inf") if has_bom else 0.0
            
            for bom in primary.bom_lines:
                if not bom.is_active:
                    continue
                try:
                    bom_lines_read.append(BOMLineRead(
                        id=bom.id,
                        product_id=bom.product_id,
                        component_id=bom.component_id,
                        qty_per_unit=float(bom.qty_per_unit or 0),
                        component_uom=bom.component_uom or "unidades",
                        component_name=bom.component.name if bom.component else "?"
                    ))
                    
                    if bom.component:
                        comp_stock = float(bom.component.stock_quantity or 0)
                        qty_per = float(bom.qty_per_unit or 1)
                        if qty_per > 0:
                            can_make = comp_stock / qty_per
                            available_from_bom_calc = min(available_from_bom_calc, can_make)
                        else:
                            available_from_bom_calc = 0.0
                    else:
                        available_from_bom_calc = 0.0
                except Exception:
                    continue
                    
            if not has_bom or available_from_bom_calc == float("inf"):
                available_from_bom = 0.0
            else:
                available_from_bom = available_from_bom_calc
        except Exception:
            bom_lines_read = []
            available_from_bom = 0.0
            
        # El available qty es la suma del stock propio (por ejemplo devoluciones/cajas sueltas) + lo que se puede hacer
        available_qty = float(total_stock) + float(available_from_bom)
        suppliers_info_list = [{"supplier_id": str(s.supplier_id), "supplier_code": s.supplier_code} for s in primary.suppliers_info]

        results.append(ProductAggregatedResponse(
            id=primary.id,
            name=primary.name,
            barcode=primary.barcode,
            price=float(primary.price),
            cost=float(primary.cost),
            total_stock=float(total_stock),
            category_id=primary.category_id,
            product_type=str(p_type),
            uom=primary.uom,
            internal_reference=primary.internal_reference,
            locations=locs,
            location_id=primary.location_id,
            image_path=primary.image_path,
            is_variable_consumption=primary.is_variable_consumption,
            default_consumption_rate=float(primary.default_consumption_rate) if primary.default_consumption_rate is not None else 1.0,
            min_stock=float(primary.min_stock) if primary.min_stock is not None else 5.0,
            suppliers_info=suppliers_info_list,
            is_raw_material=primary.is_raw_material,
            is_scrap=primary.is_scrap,
            scrap_parent_id=primary.scrap_parent_id,
            bom_lines=bom_lines_read,
            available_qty=available_qty
        ))
    
    return results

@router.put("/{product_id}", response_model=ProductResponseWithLocation)
def update_product(
    product_id: UUID, 
    product_data: ProductCreate, 
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin"]))
):
    """
    Actualiza un producto.
    Si hay múltiples ubicaciones (mismo barcode), sincroniza los campos comunes (precio, nombre, etc.)
    La ubicación y stock se actualizan solo para el ID específico si se proporcionan.
    """
    db_product = db.tenant_query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Obtener todos los productos con el mismo barcode en la misma sucursal para mantener coherencia
    siblings = db.tenant_query(Product).filter(
        Product.barcode == db_product.barcode,
        Product.branch_id == db_product.branch_id
    ).all()
    
    update_data = product_data.model_dump(exclude_unset=True)
    
    # Campos que se deben sincronizar en todas las instancias
    shared_fields = {
        'name', 'price', 'cost', 'category_id', 'product_type', 
        'uom', 'internal_reference', 'image_path', 'min_stock', 'barcode',
        'is_variable_consumption', 'default_consumption_rate', 'is_raw_material'
    }

    try:
        # 1. Actualizar campos compartidos en TODOS los hermanos
        for sibling in siblings:
            for key, value in update_data.items():
                if key in shared_fields:
                    setattr(sibling, key, value)
        
        # 2. Actualizar campos específicos SOLO en el target (si vienen en el payload)
        # Nota: El modal actual manda todo, así que update_data tendrá location_id y stock.
        # Asumimos que si se edita desde el modal, se está editando la instancia "principal" o seleccionada.
        if 'location_id' in update_data:
             if update_data['location_id'] is not None:
                 loc = db.tenant_query(StorageLocation).filter(
                     StorageLocation.id == update_data['location_id']
                 ).first()
                 if not loc:
                     raise HTTPException(status_code=400, detail="Ubicación no válida")
                 
                 if not loc.allows_multiple_products:
                     occupant = db.tenant_query(Product).filter(
                         Product.location_id == loc.id,
                         Product.barcode != db_product.barcode,
                         Product.is_active == True,
                         Product.stock_quantity > 0
                     ).first()
                     
                     if occupant:
                         raise HTTPException(
                             status_code=400, 
                             detail=f"La ubicación '{loc.name}' es de producto único y ya está ocupada por '{occupant.name}'. No se puede mover este producto aquí."
                         )
             
             db_product.location_id = update_data['location_id']
             
        if 'stock_quantity' in update_data:
             db_product.stock_quantity = update_data['stock_quantity']

        db.commit()
        db.refresh(db_product)
        return db_product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{product_id}")
def delete_product(
    product_id: UUID, 
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin"]))
):
    """
    Realiza un borrado lógico (is_active=False) del producto y sus ubicaciones.
    Esto permite mantener el historial de ventas y movimientos sin errores de integridad.
    """
    db_product = db.tenant_query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    siblings = db.tenant_query(Product).filter(
        Product.barcode == db_product.barcode,
        Product.branch_id == db_product.branch_id
    ).all()
    
    # Validar que el stock total sea cero antes de permitir la desactivación
    total_stock = sum(s.stock_quantity for s in siblings)
    if total_stock > 0.0001: # Usamos un umbral pequeño para evitar problemas de precisión con floats
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar el producto '{db_product.name}' porque aún tiene {total_stock} unidades en stock. "
                   f"Debe rebajar el stock a cero (por ejemplo, enviándolo a mermas y eliminándolo desde allí) antes de desactivarlo."
        )
    
    try:
        for sibling in siblings:
            sibling.is_active = False
            # Opcional: Podríamos liberar la ubicación si quisiéramos que quede vacía
            # sibling.location_id = None 
        db.commit()
        return {"detail": f"Producto '{db_product.name}' desactivado correctamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"No se puede desactivar el producto: {str(e)}")

# --- Nuevas rutas para BOM ---

@router.get("/{product_id}/bom", response_model=List[BOMLineRead])
def get_bom(
    product_id: UUID,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "inventario", "vendedor"]))
):
    from app.models.base import ProductBOM
    bom_lines = db.tenant_query(ProductBOM).options(joinedload(ProductBOM.component)).filter(
        ProductBOM.product_id == product_id,
        ProductBOM.is_active == True
    ).all()
    
    results = []
    for bom in bom_lines:
        results.append(BOMLineRead(
            id=bom.id,
            product_id=bom.product_id,
            component_id=bom.component_id,
            qty_per_unit=float(bom.qty_per_unit),
            component_uom=bom.component_uom,
            component_name=bom.component.name if bom.component else "?"
        ))
    return results

@router.post("/{product_id}/bom", response_model=BOMLineRead)
def add_bom_line(
    product_id: UUID,
    line: BOMLineCreate,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "inventario"]))
):
    from app.models.base import ProductBOM, Product
    product = db.tenant_query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto padre no encontrado")
        
    component = db.tenant_query(Product).filter(Product.id == line.component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Componente no encontrado")
        
    if product_id == line.component_id:
        raise HTTPException(status_code=400, detail="Un producto no puede ser componente de sí mismo")
        
    # Check si ya existe (evitar duplicados, mejor actualizar si existe)
    existing = db.tenant_query(ProductBOM).filter(
        ProductBOM.product_id == product_id,
        ProductBOM.component_id == line.component_id
    ).first()
    
    if existing:
        existing.qty_per_unit = line.qty_per_unit
        existing.component_uom = line.component_uom or component.uom or "unidades"
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        bom = existing
    else:
        bom = ProductBOM(
            product_id=product_id,
            component_id=line.component_id,
            qty_per_unit=line.qty_per_unit,
            component_uom=line.component_uom or component.uom or "unidades"
        )
        db.add(bom)
        db.commit()
        db.refresh(bom)
        
    return BOMLineRead(
        id=bom.id,
        product_id=bom.product_id,
        component_id=bom.component_id,
        qty_per_unit=float(bom.qty_per_unit),
        component_uom=bom.component_uom,
        component_name=component.name
    )

@router.delete("/{product_id}/bom/{bom_id}")
def delete_bom_line(
    product_id: UUID,
    bom_id: UUID,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "inventario"]))
):
    from app.models.base import ProductBOM
    bom = db.tenant_query(ProductBOM).filter(
        ProductBOM.id == bom_id,
        ProductBOM.product_id == product_id
    ).first()
    if not bom:
        raise HTTPException(status_code=404, detail="Línea BOM no encontrada")
        
    db.delete(bom)
    db.commit()
    return {"detail": "Componente eliminado de la receta"}

class ScrapTransferRequest(BaseModel):
    quantity: float

@router.post("/{product_id}/separate-scrap")
def separate_scrap(
    product_id: UUID,
    request: ScrapTransferRequest,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "inventario", "vendedor"]))
):
    """
    Separa una cantidad de stock de un producto Padre (Materia prima) hacia un producto 'Sobrante'.
    Si el producto sobrante no existe, lo crea automáticamente.
    """
    if request.quantity <= 0:
        raise HTTPException(status_code=400, detail="La cantidad a separar debe ser mayor a 0")
        
    parent = db.tenant_query(Product).filter(Product.id == product_id, Product.is_active == True).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Producto padre no encontrado")
        
    if not parent.is_raw_material:
        raise HTTPException(status_code=400, detail="Solo se pueden separar sobrantes de materias primas")
        
    if float(parent.stock_quantity) < request.quantity:
        raise HTTPException(status_code=400, detail=f"Stock insuficiente. Stock actual: {parent.stock_quantity}")
        
    # Buscar el producto sobrante vinculado (o buscar por nombre si no hay id directo)
    scrap_product = db.tenant_query(Product).filter(
        Product.scrap_parent_id == parent.id,
        Product.is_scrap == True
    ).first()
    
    if not scrap_product:
        # Crear el producto sobrante
        scrap_product = Product(
            name=f"Sobrante de {parent.name}",
            barcode=f"SCRAP-{parent.barcode}",
            internal_reference=f"SCRAP-{parent.internal_reference}" if parent.internal_reference else None,
            price=0,
            cost=parent.cost,
            uom=parent.uom,
            stock_quantity=0,
            product_type=parent.product_type,
            category_id=parent.category_id,
            category=parent.category,
            location_id=parent.location_id,
            branch_id=parent.branch_id,
            is_raw_material=False,
            is_scrap=True,
            scrap_parent_id=parent.id,
            is_active=True
        )
        db.add(scrap_product)
        db.flush()
        
    # Restar al padre y sumar al sobrante
    parent.stock_quantity = float(parent.stock_quantity) - request.quantity
    scrap_product.stock_quantity = float(scrap_product.stock_quantity) + request.quantity
    
    # Registrar el movimiento de inventario para trazabilidad
    user_id_str = str(getattr(current_user, "id", None) or getattr(current_user, "username", "admin"))
    
    movement = InventoryMovement(
        type=MovementType.INTERNAL_TRANSFER,
        reason=f"Separación de sobrante manual",
        user_id=user_id_str
    )
    db.add(movement)
    db.flush()
    
    # Salida del padre
    db.add(InventoryMovementItem(
        movement_id=movement.id,
        product_id=parent.id,
        quantity=request.quantity,
        stock_before=float(parent.stock_quantity) + request.quantity,
        stock_after=float(parent.stock_quantity)
    ))
    
    # Entrada al sobrante
    db.add(InventoryMovementItem(
        movement_id=movement.id,
        product_id=scrap_product.id,
        quantity=request.quantity,
        stock_before=float(scrap_product.stock_quantity) - request.quantity,
        stock_after=float(scrap_product.stock_quantity)
    ))
    
    db.commit()
    
    return {"detail": "Sobrante separado exitosamente", "parent_stock": float(parent.stock_quantity), "scrap_stock": float(scrap_product.stock_quantity)}
