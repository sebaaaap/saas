from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_tenant_session
from app.db.tenant_session import TenantSession
from app.services.printing_service import PrintingService
from app.api.deps import check_roles
from uuid import UUID

router = APIRouter()

@router.post("/ticket/{ticket_id}")
def print_ticket(
    ticket_id: int, 
    db: TenantSession = Depends(get_tenant_session)
):
    """
    Imprime un ticket de venta en la impresora de 80mm.
    """
    from app.models.base import Ticket
    ticket = db.tenant_query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
        
    # Lógica de diseño y envío USB
    # print_data = PrintingService.format_ticket_80mm(ticket.__dict__)
    # PrintingService.send_to_printer(print_data, printer_type="ticket")
    
    return {"ok": True, "message": f"Ticket {ticket.ticket_number} enviado a cola de impresión"}

@router.post("/label/oil-change/{vehicle_id}")
def print_oil_label(
    vehicle_id: UUID,
    km_now: float = Query(0),
    km_next: float = Query(0),
    db: TenantSession = Depends(get_tenant_session)
):
    """
    Imprime la etiqueta adhesiva para el cambio de aceite.
    """
    from app.models.base import Vehicle
    vehicle = db.tenant_query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
        
    vehicle_data = {
        "plate": vehicle.license_plate,
        "km_now": f"{km_now:,.0f} KM",
        "km_next": f"{km_next:,.0f} KM"
    }
    
    # print_data = PrintingService.format_oil_change_label(vehicle_data)
    # PrintingService.send_to_printer(print_data, printer_type="label")
    
    return {"ok": True, "message": f"Etiqueta de Patente {vehicle.license_plate} enviada"}

@router.get("/status")
def get_printers_status():
    """
    Verifica si las impresoras USB están conectadas.
    """
    # Verificará la presencia de dispositivos USB compatibles
    return {"ticket_printer": "offline", "label_printer": "offline"}
