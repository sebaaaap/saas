from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query

from typing import List, Optional
from app.api.deps import get_tenant_session
from app.db.tenant_session import TenantSession
from app.models.base import Customer, Vehicle, Ticket, SaleState, VehicleType
from app.schemas.customers import CustomerCreate, CustomerUpdate, CustomerResponse, VehicleCreate, VehicleUpdate, VehicleResponse
from sqlalchemy import func, desc
from app.api.deps import check_roles
from pydantic import BaseModel

router = APIRouter()

@router.get("/", response_model=List[CustomerResponse])
def get_customers(
    skip: int = 0, 
    limit: int = 100, 
    q: Optional[str] = None,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "vendedor"]))
):
    query = db.tenant_query(Customer)
    if q:
        query = query.filter(
            (Customer.name.ilike(f"%{q}%")) | 
            (Customer.rut.ilike(f"%{q}%"))
        )
    return query.offset(skip).limit(limit).all()

@router.post("/", response_model=CustomerResponse)
def create_customer(
    customer: CustomerCreate, 
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "vendedor"]))
):
    # Check if RUT already exists
    existing = db.tenant_query(Customer).filter(Customer.rut == customer.rut).first()
    if existing:
        raise HTTPException(status_code=400, detail="El RUT ya está registrado")
    
    db_customer = Customer(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: UUID, db: TenantSession = Depends(get_tenant_session)):
    db_customer = db.tenant_query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return db_customer

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: UUID, customer: CustomerUpdate, db: TenantSession = Depends(get_tenant_session)):
    db_customer = db.tenant_query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    update_data = customer.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_customer, key, value)
    
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.delete("/{customer_id}")
def delete_customer(customer_id: UUID, db: TenantSession = Depends(get_tenant_session)):
    db_customer = db.tenant_query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    db.delete(db_customer)
    db.commit()
    return {"status": "ok"}

# --- Vehicles ---

@router.post("/{customer_id}/vehicles", response_model=VehicleResponse)
def add_vehicle(customer_id: UUID, vehicle: VehicleCreate, db: TenantSession = Depends(get_tenant_session)):
    db_customer = db.tenant_query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Check if plate already exists
    existing = db.tenant_query(Vehicle).filter(Vehicle.license_plate == vehicle.license_plate).first()
    if existing:
        raise HTTPException(status_code=400, detail="La patente ya está registrada")
    
    db_vehicle = Vehicle(**vehicle.dict(exclude={"customer_id"}), customer_id=customer_id)
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

@router.get("/vehicles/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(vehicle_id: UUID, db: TenantSession = Depends(get_tenant_session)):
    db_vehicle = db.tenant_query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return db_vehicle

@router.put("/vehicles/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(vehicle_id: UUID, vehicle: VehicleUpdate, db: TenantSession = Depends(get_tenant_session)):
    db_vehicle = db.tenant_query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    update_data = vehicle.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_vehicle, key, value)
    
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

@router.delete("/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: UUID, db: TenantSession = Depends(get_tenant_session)):
    db_vehicle = db.tenant_query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    db.delete(db_vehicle)
    db.commit()
    return {"status": "ok"}

# --- Stats / History ---
from app.models.base import WorkOrder, SaleItem, WorkOrderItem

@router.get("/{customer_id}/history")
def get_customer_history(customer_id: UUID, db: TenantSession = Depends(get_tenant_session)):
    # Get all tickets for this customer
    from sqlalchemy.orm import joinedload
    tickets = db.tenant_query(Ticket).options(
        joinedload(Ticket.items).joinedload(SaleItem.product),
        joinedload(Ticket.vehicle),
        joinedload(Ticket.branch)
    ).filter(
        Ticket.customer_id == customer_id,
        Ticket.state.in_([SaleState.VALIDATED, SaleState.PAID, SaleState.REFUNDED]) # Show all finalized sales
    ).order_by(Ticket.date_created.desc()).all()
    
    sales_history = []
    for t in tickets:
        sales_history.append({
            "id": t.id,
            "ticket_number": t.ticket_number,
            "date": t.date_created,
            "total": t.total_amount,
            "subtotal": t.subtotal,
            "tax": t.tax_amount,
            "vehicle": t.vehicle.license_plate if t.vehicle else "N/A",
            "state": t.state.value,
            "payment_method": t.payment_method,
            "document_type": getattr(t, 'document_type', "boleta"),
            "branch_name": t.branch.name if getattr(t, 'branch', None) else "Casa Matriz",
            "items": [
                {
                    "product_name": item.product.name,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "subtotal": item.subtotal,
                    "discount": item.discount_percent
                } for item in t.items
            ]
        })
    
    # Get Work Orders for this customer
    work_orders = db.tenant_query(WorkOrder).options(
        joinedload(WorkOrder.vehicle),
        joinedload(WorkOrder.items).joinedload(WorkOrderItem.product),
        joinedload(WorkOrder.tickets),
        joinedload(WorkOrder.branch)
    ).filter(
        WorkOrder.customer_id == customer_id
    ).order_by(WorkOrder.created_at.desc()).all()

    ots_history = []
    for wo in work_orders:
        ots_history.append({
            "id": wo.id,
            "date": wo.created_at,
            "state": wo.state.value,
            "vehicle": wo.vehicle.license_plate if wo.vehicle else "N/A",
            "total": wo.total_amount,
            "financial_progress": float(wo.financial_progress),
            "operational_progress": float(wo.operational_progress),
            "branch_name": wo.branch.name if getattr(wo, 'branch', None) else "Casa Matriz",
            "items": [
                {
                    "product_name": item.product.name if item.product else "N/A",
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "subtotal": item.subtotal,
                    "done": item.done,
                    "is_paid": item.is_paid
                } for item in wo.items
            ],
            "tickets": [
                {
                    "id": t.id,
                    "ticket_number": t.ticket_number,
                    "date": t.date_created,
                    "amount": float(t.total_amount),
                    "payment_method": t.payment_method
                } for t in wo.tickets if t.ticket_type == "OT_PAYMENT" and t.state in [SaleState.PAID, SaleState.VALIDATED] and not t.is_refunded
            ]
        })

    # Get Quotes for this customer
    from app.models.base import Quote, QuoteItem
    quotes = db.tenant_query(Quote).options(
        joinedload(Quote.vehicle),
        joinedload(Quote.items).joinedload(QuoteItem.product),
        joinedload(Quote.branch)
    ).filter(
        Quote.customer_id == customer_id
    ).order_by(Quote.created_at.desc()).all()

    quotes_history = []
    for q in quotes:
        quotes_history.append({
            "id": q.id,
            "date": q.created_at,
            "total": q.total,
            "state": q.state.value,
            "vehicle": q.vehicle.license_plate if q.vehicle else "N/A",
            "branch_name": q.branch.name if getattr(q, 'branch', None) else "Casa Matriz",
            "items": [
                {
                    "product_name": item.product.name if item.product else "N/A",
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "subtotal": item.subtotal
                } for item in q.items
            ]
        })

    # Simple KPIs
    stats = db.tenant_query(Ticket).with_entities(
        func.count(Ticket.id),
        func.sum(Ticket.total_amount)
    ).filter(
        Ticket.customer_id == customer_id,
        Ticket.state.in_([SaleState.VALIDATED, SaleState.PAID])
    ).first()
    
    return {
        "summary": {
            "total_count": stats[0] or 0,
            "total_amount": stats[1] or 0.0
        },
        "sales": sales_history,
        "work_orders": ots_history,
        "quotes": quotes_history
    }


# ── Endpoint: Historial de Vehículo por Patente (PDV Quick View) ────────────

@router.get("/vehicles/plate/{license_plate}/history")
def get_vehicle_history_by_plate(
    license_plate: str,
    limit: int = Query(5, ge=1, le=50, description="Número de visitas a retornar"),
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "vendedor"]))
):
    """
    Retorna el historial de las últimas N visitas de un vehículo por patente.
    Usado en el PDV para consulta rápida sin salir de caja.
    Incluye ventas directas y OTs finalizadas.
    """
    from sqlalchemy.orm import joinedload
    from app.models.base import WorkOrder, WorkOrderItem, SaleItem

    # Buscar el vehículo
    vehicle = db.tenant_query(Vehicle).filter(
        Vehicle.license_plate == license_plate.upper().strip()
    ).first()

    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    customer = vehicle.owner

    # Últimas N ventas directas del vehículo
    tickets = db.tenant_query(Ticket).options(
        joinedload(Ticket.items).joinedload(SaleItem.product)
    ).filter(
        Ticket.vehicle_id == vehicle.id,
        Ticket.state.in_([SaleState.VALIDATED, SaleState.PAID]),
        Ticket.is_refunded == False
    ).order_by(desc(Ticket.date_created)).limit(limit).all()

    visits = []
    for t in tickets:
        visits.append({
            "type": "venta",
            "id": str(t.id),
            "number": t.ticket_number,
            "date": t.date_created.isoformat(),
            "total": float(t.total_amount),
            "items": [
                {"name": item.product.name if item.product else "?",
                 "qty": float(item.quantity),
                 "price": float(item.unit_price)}
                for item in t.items
            ]
        })

    # Últimas N OTs del vehículo
    ots = db.tenant_query(WorkOrder).options(
        joinedload(WorkOrder.items).joinedload(WorkOrderItem.product)
    ).filter(
        WorkOrder.vehicle_id == vehicle.id,
    ).order_by(desc(WorkOrder.created_at)).limit(limit).all()

    for wo in ots:
        visits.append({
            "type": "ot",
            "id": str(wo.id),
            "number": f"OT-{str(wo.id)[:8].upper()}",
            "date": wo.created_at.isoformat(),
            "total": float(wo.total_amount),
            "state": wo.state.value,
            "items": [
                {"name": item.product.name if item.product else "?",
                 "qty": float(item.quantity),
                 "price": float(item.unit_price)}
                for item in wo.items
            ]
        })

    # Ordenar combinado por fecha desc y tomar últimas N
    visits.sort(key=lambda x: x["date"], reverse=True)
    visits = visits[:limit]

    return {
        "vehicle": {
            "id": str(vehicle.id),
            "license_plate": vehicle.license_plate,
            "type": vehicle.vehicle_type.value if vehicle.vehicle_type else "automovil",
            "brand": vehicle.brand,
            "model": vehicle.model,
            "year": vehicle.year,
        },
        "customer": {
            "id": str(customer.id),
            "name": customer.name,
            "phone": customer.phone,
            "email": customer.email,
        } if customer else None,
        "visits": visits,
        "total_visits": len(visits)
    }


# ── Creación Rápida: Cliente + Vehículo en 1 paso (PDV) ───────────────────

class QuickCreatePayload(BaseModel):
    license_plate: str
    vehicle_type: Optional[str] = "automovil"
    customer_name: str
    contact: str  # teléfono o email — se detecta automáticamente

@router.post("/quick-create")
def quick_create_customer_vehicle(
    payload: QuickCreatePayload,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "vendedor"]))
):
    """
    Crea un cliente + vehículo en un solo paso desde el PDV.
    Flujo: Patente → Nombre del cliente → Teléfono o Email.
    Si la patente ya existe retorna el cliente/vehículo existente.
    """
    plate = payload.license_plate.upper().strip()

    # Si ya existe la patente, retornar el vehículo y su dueño
    existing_vehicle = db.tenant_query(Vehicle).filter(Vehicle.license_plate == plate).first()
    if existing_vehicle:
        return {
            "created": False,
            "customer": {
                "id": str(existing_vehicle.owner.id),
                "name": existing_vehicle.owner.name,
                "phone": existing_vehicle.owner.phone,
                "email": existing_vehicle.owner.email,
                "rut": existing_vehicle.owner.rut,
                "vehicles": [
                    {"id": str(existing_vehicle.id),
                     "license_plate": existing_vehicle.license_plate,
                     "vehicle_type": existing_vehicle.vehicle_type.value}
                ]
            }
        }

    # Detectar si contact es email o teléfono
    contact = payload.contact.strip()
    is_email = "@" in contact
    phone = None if is_email else contact
    email = contact if is_email else None

    # Usar la patente como RUT temporal si no se proporciona RUT
    rut_temp = f"PLACA-{plate}"

    # Crear cliente (verificar si ya existe por nombre+contacto)
    customer = db.tenant_query(Customer).filter(
        Customer.rut == rut_temp
    ).first()

    if not customer:
        customer = Customer(
            name=payload.customer_name,
            rut=rut_temp,
            phone=phone,
            email=email,
        )
        db.add(customer)
        db.flush()  # Obtener ID sin commit

    # Crear vehículo
    vtype_map = {
        "automovil": VehicleType.automovil,
        "motocicleta": VehicleType.motocicleta,
        "camion": VehicleType.camion,
        "furgon": VehicleType.furgon,
        "camioneta": VehicleType.camioneta,
        "otro": VehicleType.otro,
    }
    vtype = vtype_map.get(payload.vehicle_type or "automovil", VehicleType.automovil)

    vehicle = Vehicle(
        license_plate=plate,
        vehicle_type=vtype,
        customer_id=customer.id,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(customer)
    db.refresh(vehicle)

    return {
        "created": True,
        "customer": {
            "id": str(customer.id),
            "name": customer.name,
            "phone": customer.phone,
            "email": customer.email,
            "rut": customer.rut,
            "vehicles": [
                {"id": str(vehicle.id),
                 "license_plate": vehicle.license_plate,
                 "vehicle_type": vehicle.vehicle_type.value}
            ]
        }
    }
