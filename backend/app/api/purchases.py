from uuid import UUID
from fastapi import APIRouter, Depends, Query, UploadFile, File, Header

from app.api.deps import get_tenant_session
from app.db.tenant_session import TenantSession
from app.schemas.purchases import PurchaseCreate, PurchaseResponse, PurchaseUpdate, PurchaseItemResponse
from app.services.purchase_service import PurchaseService
from app.api.deps import check_roles
from typing import List, Optional

router = APIRouter()

@router.post("/", response_model=PurchaseResponse)
def create_purchase(
    data: PurchaseCreate, 
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "inventario"])),
    branch_id: Optional[UUID] = Header(None, alias="X-Branch-ID")
):
    """
    Crea una nueva compra en estado BORRADOR.
    No afecta el stock hasta que se confirme.
    """
    service = PurchaseService(db)
    purchase = service.create_purchase(data)

    # Asignar la sucursal activa a la compra recién creada
    if branch_id:
        purchase.branch_id = branch_id
        db.commit()

    items_response = [
        PurchaseItemResponse(
            id=item.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_cost=item.unit_cost,
            subtotal=item.quantity * item.unit_cost
        )
        for item in purchase.items
    ]

    return PurchaseResponse(
        id=purchase.id,
        date_created=purchase.date_created,
        supplier_id=purchase.supplier_id,
        invoice_number=purchase.invoice_number,
        subtotal_net=purchase.subtotal_net,
        tax_amount=purchase.tax_amount,
        total_cost=purchase.total_cost,
        state=purchase.state.name,
        notes=purchase.notes,
        items=items_response
    )

@router.post("/upload-sii")
async def upload_sii_excel(
    file: UploadFile = File(...),
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "inventario"])),
    branch_id: Optional[UUID] = Header(None, alias="X-Branch-ID")
):
    """
    Parsea el Excel de Libro de Compras SII.
    - Auto-crea proveedores por RUT si no existen (sin duplicados)
    - Detecta facturas ya importadas por folio + supplier_id
    - Retorna cada factura con su supplier_id y flag already_imported
    """
    import pandas as pd
    import io
    from app.models.base import Supplier, Purchase
    from fastapi import HTTPException

    content = await file.read()

    try:
        df = pd.read_excel(io.BytesIO(content), header=None)
    except Exception:
        raise HTTPException(status_code=400, detail="Archivo Excel inválido o corrupto")

    # ── 1. Parsear el Excel ──────────────────────────────────────────────────
    invoices = []
    current_invoice = None
    parsing_items = False
    item_keys = []

    for idx, row in df.iterrows():
        col0 = str(row[0]).strip() if pd.notnull(row[0]) else ""

        if col0 == "TipoDTE":
            header_keys = row.tolist()
            val_row = df.iloc[idx + 1].tolist()
            invoice_data = {
                str(k).strip(): v
                for k, v in zip(header_keys, val_row)
                if pd.notnull(k) and str(k).strip()
            }
            current_invoice = {
                "supplier_rut": str(invoice_data.get("RutEmisor", "")).strip(),
                "supplier_name": str(invoice_data.get("RazonSocialEmisor", "")).strip(),
                "invoice_number": str(invoice_data.get("Folio", "")).strip(),
                "date_created": invoice_data.get("FechaEmision"),
                "total_neto": invoice_data.get("Total-Neto"),
                "total_iva": invoice_data.get("Total-IVA"),
                "total_monto": invoice_data.get("Total-MontoTotal"),
                "items": [],
            }
            invoices.append(current_invoice)
            parsing_items = False

        elif col0 == "DETALLE":
            item_keys = row.tolist()
            parsing_items = True

        elif parsing_items:
            if pd.isnull(row[1]) and pd.isnull(row[2]) and pd.isnull(row[3]):
                parsing_items = False
                continue

            if pd.notnull(row[1]):
                def _cv(val):
                    return None if (val is None or (isinstance(val, float) and pd.isnull(val))) else val

                item_data = {
                    str(k).strip(): v
                    for k, v in zip(item_keys, row.tolist())
                    if pd.notnull(k) and str(k).strip()
                }
                if "Codigo" in item_data and pd.notnull(item_data["Codigo"]):
                    current_invoice["items"].append({
                        "code":            str(item_data["Codigo"]).strip(),
                        "name":            str(item_data.get("Descripcion", "")),
                        "quantity":        _cv(item_data.get("Cantidad")),
                        "price":           _cv(item_data.get("Precio")),
                        "discount_pct":    _cv(item_data.get("Descuento %")),
                        "discount_amount": _cv(item_data.get("Descuento $")),
                        "final_price":     _cv(item_data.get("Monto-Item")),
                    })

    # ── 2. Auto-crear proveedores por RUT (upsert) ───────────────────────────
    supplier_id_by_rut: dict[str, str] = {}

    for inv in invoices:
        rut = inv["supplier_rut"]
        if not rut or rut == "nan" or rut in supplier_id_by_rut:
            continue

        existing = db.tenant_query(Supplier).filter(Supplier.tax_id == rut).first()
        if existing:
            supplier_id_by_rut[rut] = str(existing.id)
        else:
            new_sup = Supplier(
                name=inv["supplier_name"],
                tax_id=rut,
            )
            db.add(new_sup)
            db.flush()
            supplier_id_by_rut[rut] = str(new_sup.id)

    db.commit()

    # ── 3. Detectar folios ya importados (ignorando los cancelados) ───────────
    from app.models.base import PurchaseState
    # Recopilar todos los folios que vienen en el archivo
    all_folios = [inv["invoice_number"] for inv in invoices if inv["invoice_number"] not in ("", "nan")]

    existing_purchases_q = (
        db.tenant_query(Purchase.invoice_number)
        .filter(Purchase.invoice_number.in_(all_folios))
        .filter(Purchase.state != PurchaseState.CANCELLED)
    )
    if branch_id:
        existing_purchases_q = existing_purchases_q.filter(Purchase.branch_id == branch_id)
    existing_purchases = existing_purchases_q.all()
    already_imported_folios = {row[0] for row in existing_purchases}

    # ── 4. Agrupar por proveedor y anotar estado ─────────────────────────────
    suppliers_map: dict = {}

    for inv in invoices:
        rut = inv["supplier_rut"]
        if not rut or rut == "nan":
            continue

        # Normalizar fecha
        date_val = inv["date_created"]
        inv["date_created"] = str(date_val) if pd.notnull(date_val) else None

        # Anotar supplier_id y estado de duplicado
        inv["supplier_id"] = supplier_id_by_rut.get(rut)
        inv["already_imported"] = inv["invoice_number"] in already_imported_folios

        if rut not in suppliers_map:
            suppliers_map[rut] = {
                "rut": rut,
                "name": inv["supplier_name"],
                "supplier_id": inv["supplier_id"],
                "invoices": [],
            }
        suppliers_map[rut]["invoices"].append(inv)

    # Añadir branch_id a cada factura para que el front lo incluya al confirmar
    for inv in invoices:
        inv["branch_id"] = str(branch_id) if branch_id else None

    return {"suppliers": list(suppliers_map.values())}


@router.get("/", response_model=List[PurchaseResponse])
def list_purchases(
    state: Optional[str] = Query(None, description="Filtrar por estado: DRAFT, CONFIRMED, CANCELLED"),
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "inventario"])),
    branch_id: Optional[UUID] = Header(None, alias="X-Branch-ID")
):
    """
    Lista compras de la sucursal activa, opcionalmente filtradas por estado.
    """
    service = PurchaseService(db)
    purchases = service.list_purchases(state=state, branch_id=branch_id)

    return [
        PurchaseResponse(
            id=p.id,
            date_created=p.date_created,
            supplier_id=p.supplier_id,
            invoice_number=p.invoice_number,
            subtotal_net=p.subtotal_net,
            tax_amount=p.tax_amount,
            total_cost=p.total_cost,
            state=p.state.name,
            notes=p.notes,
            items=[
                PurchaseItemResponse(
                    id=item.id,
                    product_id=item.product_id,
                    quantity=item.quantity,
                    unit_cost=item.unit_cost,
                    subtotal=item.quantity * item.unit_cost
                )
                for item in p.items
            ]
        )
        for p in purchases
    ]

@router.get("/{purchase_id}", response_model=PurchaseResponse)
def get_purchase(
    purchase_id: UUID,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "inventario"])),
    branch_id: Optional[UUID] = Header(None, alias="X-Branch-ID")
):
    """
    Obtiene los detalles de una compra de la sucursal activa.
    """
    service = PurchaseService(db)
    purchase = service.get_purchase(purchase_id, branch_id=branch_id)

    return PurchaseResponse(
        id=purchase.id,
        date_created=purchase.date_created,
        supplier_id=purchase.supplier_id,
        invoice_number=purchase.invoice_number,
        subtotal_net=purchase.subtotal_net,
        tax_amount=purchase.tax_amount,
        total_cost=purchase.total_cost,
        state=purchase.state.name,
        notes=purchase.notes,
        items=[
            PurchaseItemResponse(
                id=item.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                subtotal=item.quantity * item.unit_cost
            )
            for item in purchase.items
        ]
    )

@router.post("/{purchase_id}/confirm", response_model=PurchaseResponse)
def confirm_purchase(
    purchase_id: UUID,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin"]))
):
    """
    Confirma una compra: cambia estado, actualiza costos, genera movimiento e incrementa stock.
    La sucursal se toma directamente de la compra (ya fue asignada al crearla).
    """
    service = PurchaseService(db)
    purchase = service.confirm_purchase(purchase_id)

    return PurchaseResponse(
        id=purchase.id,
        date_created=purchase.date_created,
        supplier_id=purchase.supplier_id,
        invoice_number=purchase.invoice_number,
        subtotal_net=purchase.subtotal_net,
        tax_amount=purchase.tax_amount,
        total_cost=purchase.total_cost,
        state=purchase.state.name,
        notes=purchase.notes,
        items=[
            PurchaseItemResponse(
                id=item.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                subtotal=item.quantity * item.unit_cost
            )
            for item in purchase.items
        ]
    )

@router.post("/{purchase_id}/cancel", response_model=PurchaseResponse)
def cancel_purchase(
    purchase_id: UUID,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin"]))
):
    """
    Cancela una compra (solo si está en borrador).
    """
    service = PurchaseService(db)
    purchase = service.cancel_purchase(purchase_id)

    return PurchaseResponse(
        id=purchase.id,
        date_created=purchase.date_created,
        supplier_id=purchase.supplier_id,
        invoice_number=purchase.invoice_number,
        subtotal_net=purchase.subtotal_net,
        tax_amount=purchase.tax_amount,
        total_cost=purchase.total_cost,
        state=purchase.state.name,
        notes=purchase.notes,
        items=[
            PurchaseItemResponse(
                id=item.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                subtotal=item.quantity * item.unit_cost
            )
            for item in purchase.items
        ]
    )

@router.patch("/{purchase_id}", response_model=PurchaseResponse)
def update_purchase(
    purchase_id: UUID,
    data: PurchaseUpdate,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "inventario"]))
):
    """
    Actualiza una compra (solo si está en borrador).
    """
    service = PurchaseService(db)
    purchase = service.update_purchase(purchase_id, data)

    return PurchaseResponse(
        id=purchase.id,
        date_created=purchase.date_created,
        supplier_id=purchase.supplier_id,
        invoice_number=purchase.invoice_number,
        subtotal_net=purchase.subtotal_net,
        tax_amount=purchase.tax_amount,
        total_cost=purchase.total_cost,
        state=purchase.state.name,
        notes=purchase.notes,
        items=[
            PurchaseItemResponse(
                id=item.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                subtotal=item.quantity * item.unit_cost
            )
            for item in purchase.items
        ]
    )
