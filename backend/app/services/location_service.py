from app.db.tenant_session import TenantSession
from app.models.base import StorageLocation, Product
from app.schemas.locations import LocationCreate
from fastapi import HTTPException
from uuid import UUID

class LocationService:
    def __init__(self, db: TenantSession):
        self.db = db

    def create_location(self, data: LocationCreate, branch_id: UUID = None) -> StorageLocation:
        # Calcular path
        path = data.name
        if data.parent_id:
            parent = self.db.tenant_query(StorageLocation).filter(StorageLocation.id == data.parent_id).first()
            if not parent:
                raise HTTPException(status_code=404, detail="Ubicación padre no encontrada")
            path = f"{parent.path}/{data.name}"

        location = StorageLocation(
            name=data.name,
            zone=data.zone,
            side=data.side,
            column=data.column,
            level=data.level,
            parent_id=data.parent_id,
            path=path,
            allows_multiple_products=data.allows_multiple_products,
            branch_id=branch_id
        )
        self.db.add(location)
        self.db.commit()
        self.db.refresh(location)
        return location

    def generate_aisle(self, zone_prefix: str, num_columns: int, num_levels: int, branch_id: UUID = None):
        """
        Genera masivamente ubicaciones siguiendo la matriz del taller.
        Ej: A-01-L1...A-10-R7
        Lado: Izquierdo (L) para Impares, Derecho (R) para Pares.
        """
        locations = []
        for col in range(1, num_columns + 1):
            # Lado: Izquierdo para Impares, Derecho para Pares
            side = "L" if col % 2 != 0 else "R"
            for lvl in range(1, num_levels + 1):
                # Formato: A-01-L1
                name = f"{zone_prefix}-{col:02d}-{side}{lvl}"
                
                # Evitar duplicados si ya existe
                query = self.db.tenant_query(StorageLocation).filter(StorageLocation.name == name)
                if branch_id:
                    query = query.filter(StorageLocation.branch_id == branch_id)
                existing = query.first()
                if existing:
                    continue
                
                location = StorageLocation(
                    name=name,
                    zone=f"Pasillo {zone_prefix}",
                    side=side,
                    column=col,
                    level=lvl,
                    path=f"{zone_prefix}/{col:02d}/{side}{lvl}",
                    allows_multiple_products=False,
                    branch_id=branch_id
                )
                self.db.add(location)
                locations.append(location)
        
        self.db.commit()
        return locations

    def get_tree(self, branch_id: UUID = None):
        # Para la matriz, quizás prefieramos una lista plana o agrupada por zona.
        # Por ahora mantenemos compatibilidad con el árbol.
        query = self.db.tenant_query(StorageLocation).filter(StorageLocation.parent_id == None)
        if branch_id:
            query = query.filter(StorageLocation.branch_id == branch_id)
        return query.all()

    def delete_location(self, location_id: int):
        location = self.db.tenant_query(StorageLocation).filter(StorageLocation.id == location_id).first()
        if not location:
            raise HTTPException(status_code=404, detail="Ubicación no encontrada")

        # IDs de la ubicación y todos sus descendientes usando el path
        descendants = self.db.tenant_query(StorageLocation).filter(
            StorageLocation.path.like(f"{location.path}/%")
        ).all()
        
        all_ids = [location.id] + [d.id for d in descendants]

        # Verificar si hay productos en estas ubicaciones
        products_count = self.db.tenant_query(Product).filter(Product.location_id.in_(all_ids)).count()
        if products_count > 0:
            raise HTTPException(
                status_code=400, 
                detail="No se puede eliminar: la ubicación o sus sub-ubicaciones contienen productos. Por favor, realice un traslado de los productos antes de eliminar el pasillo/zona."
            )

        # Eliminar todas las ubicaciones (descendientes + la actual)
        try:
            self.db.tenant_query(StorageLocation).filter(StorageLocation.id.in_(all_ids)).delete(synchronize_session=False)
            self.db.commit()
            return {"message": "Ubicación y sub-ubicaciones eliminadas correctamente"}
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Error al eliminar: {str(e)}")
