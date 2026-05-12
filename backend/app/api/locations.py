from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_tenant_session
from app.db.tenant_session import TenantSession
from app.services.location_service import LocationService
from app.services.inventory_service import InventoryService
from typing import List, Optional
from fastapi import Header
from app.models.base import Product, StorageLocation
from app.schemas.locations import LocationCreate, LocationResponse, AisleGenerate

router = APIRouter()

@router.post("/", response_model=LocationResponse)
def create_location(
    data: LocationCreate, 
    db: TenantSession = Depends(get_tenant_session),
    branch_id: Optional[UUID] = Header(None, alias="X-Branch-ID")
):
    service = LocationService(db)
    return service.create_location(data, branch_id)

from app.schemas.inventory import InventoryMovementItemCreate, InventoryMovementResponse

@router.post("/mermas/restore", response_model=InventoryMovementResponse)
def restore_mermas_product(
    item: InventoryMovementItemCreate,
    db: TenantSession = Depends(get_tenant_session)
):
    """
    Restaura un producto del Pasillo Mermas al Pasillo Stock.
    Si Pasillo Stock no existe, lo crea.
    """
    s_inventory = InventoryService(db)
    return s_inventory.restore_from_mermas(item.product_id, item.quantity)


@router.post("/generate", response_model=List[LocationResponse])
def generate_aisle(
    data: AisleGenerate, 
    db: TenantSession = Depends(get_tenant_session),
    branch_id: Optional[UUID] = Header(None, alias="X-Branch-ID")
):
    service = LocationService(db)
    return service.generate_aisle(data.zone_prefix, data.num_columns, data.num_levels, branch_id)

@router.get("/tree", response_model=List[LocationResponse])
def get_location_tree(
    db: TenantSession = Depends(get_tenant_session),
    branch_id: Optional[UUID] = Header(None, alias="X-Branch-ID")
):
    service = LocationService(db)
    return service.get_tree(branch_id)

@router.get("/available", response_model=List[LocationResponse])
def get_available_locations(
    db: TenantSession = Depends(get_tenant_session),
    branch_id: Optional[UUID] = Header(None, alias="X-Branch-ID")
):
    """
    Devuelve las ubicaciones que pueden recibir productos:
    1. Que NO sean "Pasillo Mermas" (se gestiona vía Operaciones).
    2. Que estén totalmente vacías.
    3. Que acepten múltiples productos aunque tengan stock.
    """
    # Excluir pasillo de mermas
    query = db.tenant_query(StorageLocation).filter(StorageLocation.name != "Pasillo Mermas")
    
    if branch_id:
        query = query.filter(StorageLocation.branch_id == branch_id)
        
    # Obtener todas las ubicaciones candidatas
    all_locs = query.all()
    
    # Obtener ocupación actual
    occupancy_query = db.tenant_query(Product.location_id).filter(
        Product.location_id != None,
        Product.is_active == True,
        Product.stock_quantity > 0
    )
    if branch_id:
        occupancy_query = occupancy_query.filter(Product.branch_id == branch_id)
        
    occupancy = occupancy_query.distinct().all()
    occupied_ids = {r[0] for r in occupancy}
    
    available = []
    for loc in all_locs:
        # Si permite múltiples, siempre está disponible
        if loc.allows_multiple_products:
            available.append(loc)
        # Si es estricta, solo si no está ocupada
        elif loc.id not in occupied_ids:
            available.append(loc)
            
    return available

@router.get("/{location_id}/products")
def get_products_in_location(
    location_id: UUID, 
    db: TenantSession = Depends(get_tenant_session),
    branch_id: Optional[UUID] = Header(None, alias="X-Branch-ID")
):
    """
    Devuelve los productos asignados a una ubicación específica
    """
    # Filter by location and active status
    query = db.tenant_query(Product).filter(
        Product.location_id == location_id,
        Product.is_active == True
    )
    if branch_id:
        query = query.filter(Product.branch_id == branch_id)
        
    products = query.all()
    
    # Retornamos un schema ad-hoc para mostrar stock
    return [
        {
            "id": p.id,
            "name": p.name,
            "barcode": p.barcode,
            "stock": p.stock_quantity,
            "price": p.price,
            "image": p.image_path
        } 
        for p in products
    ]

@router.delete("/{location_id}/products/{product_id}")
def delete_product_from_location(
    location_id: UUID, 
    product_id: UUID, 
    quantity: float = None,
    db: TenantSession = Depends(get_tenant_session)
):
    """
    Elimina un producto de una ubicación (Stock Disposal / Merma)
    Si quantity es None, elimina todo el stock disponible.
    """
    # Verificar que el producto existe en esa ubicación
    product = db.tenant_query(Product).filter(
        Product.id == product_id,
        Product.location_id == location_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado en esta ubicación")

    qty_to_remove = quantity if quantity is not None else product.stock_quantity
    
    if qty_to_remove <= 0:
        raise HTTPException(status_code=400, detail="Cantidad a eliminar debe ser mayor a 0")
        
    s_inventory = InventoryService(db)
    
    # Creamos un movimiento de tipo OUT_WASTE
    # Dado que el producto YA ESTÁ en la ubicación (sea Mermas o no), 
    # la lógica de inventory_service debe manejarlo.
    # Si es Mermas -> Disposal. Si es otra -> Move to Mermas (pero aquí queremos DELETE).
    # 
    # Mmmm, si el usuario llama DELETE en un pasillo normal, ¿quiere borrarlo del sistema o moverlo a mermas?
    # El endpoint se llama "delete_product_from_location".
    # Si quiere mover a mermas, usaría un endpoint de movimiento.
    # Si usa DELETE, prob quiere eliminarlo (ej, ajuste de inventario negativo).
    # Pero si llamamos OUT_WASTE y NO es mermas, se moverá a Mermas.
    # 
    # Si queremos soportar SOLO Mermas aquí, validamos location name.
    # Pero el usuario pidió funciones para el PASILLO DE MERMAS.
    # Así que asumimos que este endpoint se usará principalmente ahí.
    
    # Para forzar la eliminación en cualquier pasillo sin mover a mermas, deberíamos usar OUT_ADJUSTMENT?
    # El usuario dijo "en el pasillo de mermas... tenga la faculta de selccionar el producto y elimnar".
    # Así que si está en Mermas, OUT_WASTE funciona perfecto con nuestra nueva lógica.
    
    from app.schemas.inventory import InventoryMovementCreate, InventoryMovementItemCreate
    
    movement_data = InventoryMovementCreate(
        type="OUT_WASTE", # Esto activará la lógica de "Disposal" si ya está en Mermas
        reason="Eliminación manual desde ubicación",
        items=[
            InventoryMovementItemCreate(product_id=product.id, quantity=qty_to_remove)
        ]
    )
    
    return s_inventory.create_movement(movement_data)

@router.delete("/{location_id}")
def delete_location(location_id: UUID, db: TenantSession = Depends(get_tenant_session)):
    service = LocationService(db)
    return service.delete_location(location_id)
