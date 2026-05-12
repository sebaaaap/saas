"""
Endpoints para la Ficha de Recepción de Vehículos.
Gestiona: guardado de ficha JSONB, subida de fotos, generación de PDF.
"""
import os
import uuid
import shutil
from pathlib import Path
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from pydantic import BaseModel

from app.api.deps import get_tenant_session
from app.db.tenant_session import TenantSession
from app.models.base import WorkOrder, Base, BaseModel as DBBaseModel

router = APIRouter()

# ─── Upload dir ────────────────────────────────────────────────────────────────
BASE_UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))


# ─── Schemas ───────────────────────────────────────────────────────────────────

class DamageMarkerSchema(BaseModel):
    id: str
    zone: str
    note: str
    photo_url: Optional[str] = None
    coords: dict  # {x: float, y: float}
    view: str     # "top" | "front" | "side"
    type: Optional[str] = "reception"  # "reception" | "dispatch"

class ChecklistItemSchema(BaseModel):
    id: str
    label: str
    status: Optional[str] = None  # "good" | "bad" | "na" | None

class ChecklistGroupSchema(BaseModel):
    title: str
    items: List[ChecklistItemSchema]

class ReceptionFormSchema(BaseModel):
    # Cabecera
    marca: str = ""
    color: str = ""
    modelo: str = ""
    tipo: str = ""
    placa: str = ""
    anio: str = ""
    km_entrega: str = ""
    km_devolucion: str = ""
    fecha_entrega: str = ""
    fecha_devolucion: str = ""
    funcionario_entrega: str = ""
    funcionario_recibe: str = ""
    licencia_entrega: str = ""
    licencia_recibe: str = ""
    # Daños
    markers: List[DamageMarkerSchema] = []
    # Checklist
    checklist: List[ChecklistGroupSchema] = []
    # Combustible
    fuel_level: int = 0
    # Observaciones
    observaciones: str = ""


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.put("/{wo_id}/reception")
def save_reception(
    wo_id: str,
    form: ReceptionFormSchema,
    db: TenantSession = Depends(get_tenant_session),
):
    """
    Guarda la ficha de recepción en el campo JSONB `reception_data` de la OT.
    Si el modelo aún no tiene ese campo, lo almacena en `service_info`.
    """
    wo = db.tenant_query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Orden de trabajo no encontrada")

    # Almacenar en service_info.reception_data (campo JSONB ya existente)
    current_service_info = wo.service_info or {}
    current_service_info["reception_data"] = form.model_dump()
    current_service_info["reception_updated_at"] = datetime.utcnow().isoformat()
    wo.service_info = current_service_info

    db.commit()
    db.refresh(wo)
    return {"ok": True, "message": "Ficha guardada correctamente"}


@router.get("/{wo_id}/reception")
def get_reception(
    wo_id: str,
    db: TenantSession = Depends(get_tenant_session),
):
    """Recupera la ficha de recepción de una OT."""
    wo = db.tenant_query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Orden de trabajo no encontrada")

    reception = (wo.service_info or {}).get("reception_data", None)
    return {"ok": True, "data": reception}


@router.post("/upload-photo")
async def upload_photo(
    file: UploadFile = File(...),
    ot_id: str = Form(...),
    section: str = Form(default="recepcion"),
):
    """
    Recibe una foto y la guarda en:
      uploads/OT_{ot_id}/{section}/{uuid}_{filename}
    Devuelve la ruta relativa para previsualizar en el frontend.
    """
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Tipo de archivo no permitido: {file.content_type}")

    max_size = 10 * 1024 * 1024  # 10 MB
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 10MB")

    # Build path: uploads/OT_{id}/recepcion/
    dest_dir = BASE_UPLOAD_DIR / f"OT_{ot_id}" / section
    dest_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "img.jpg").suffix
    filename = f"{uuid.uuid4().hex}{ext}"
    dest_path = dest_dir / filename

    with open(dest_path, "wb") as f:
        f.write(content)

    # Return relative URL path usable by frontend
    relative_url = f"/uploads/OT_{ot_id}/{section}/{filename}"
    return {"ok": True, "url": relative_url, "filename": filename}


@router.post("/{wo_id}/reception/pdf")
async def export_reception_pdf(
    wo_id: str,
    form: ReceptionFormSchema,
    db: TenantSession = Depends(get_tenant_session),
):
    """
    Genera un PDF de la ficha de recepción.
    Requiere: pip install reportlab pillow
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        import io

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1.5 * cm,
            leftMargin=1.5 * cm,
            topMargin=1.5 * cm,
            bottomMargin=1.5 * cm,
        )

        styles = getSampleStyleSheet()
        PRIMARY = colors.HexColor("#7e4f70")     # hsl(316 20% 44%)
        SECONDARY = colors.HexColor("#009e8f")  # hsl(174 100% 31%)
        LIGHT_GRAY = colors.HexColor("#f1f5f9")
        BORDER = colors.HexColor("#cbd5e1")

        title_style = ParagraphStyle("title", parent=styles["Heading1"], fontSize=13, textColor=PRIMARY, alignment=TA_CENTER, spaceAfter=4)
        section_style = ParagraphStyle("section", parent=styles["Heading2"], fontSize=9, textColor=colors.white, backColor=PRIMARY, spaceBefore=8, spaceAfter=4, leftIndent=4)
        label_style = ParagraphStyle("label", parent=styles["Normal"], fontSize=7, textColor=colors.HexColor("#64748b"), fontName="Helvetica-Bold")
        value_style = ParagraphStyle("value", parent=styles["Normal"], fontSize=8.5, textColor=colors.HexColor("#0f172a"))
        small_style = ParagraphStyle("small", parent=styles["Normal"], fontSize=7, textColor=colors.HexColor("#475569"))

        story = []

        # ── Fetch OT Data ──
        wo = db.tenant_query(WorkOrder).filter(WorkOrder.id == wo_id).first()
        cliente_nombre = "—"
        cliente_rut = "—"
        vehiculo_info = "—"
        placa = form.placa or "—"

        if wo:
            if wo.customer:
                cliente_nombre = wo.customer.name
                cliente_rut = wo.customer.rut
            if wo.vehicle:
                vehiculo_info = f"{wo.vehicle.brand} {wo.vehicle.model}".strip() or "—"
                if not placa or placa == "—":
                    placa = wo.vehicle.license_plate or "—"

        # ── Title ──
        story.append(Paragraph("REGISTRO DE ENTREGA Y RECEPCIÓN DE VEHÍCULO", title_style))
        story.append(Paragraph(f"OT-{wo_id}  •  Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", small_style))
        story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceAfter=8))

        # ── Customer & Vehicle data (from DB) ──
        customer_table_data = [
            [Paragraph("<b>ESTADO OT</b>", label_style), Paragraph(str(wo.state.value if wo else "—").upper(), value_style), 
             Paragraph("<b>CLIENTE</b>", label_style), Paragraph(cliente_nombre, value_style)],
            [Paragraph("<b>RUT</b>", label_style), Paragraph(cliente_rut, value_style), 
             Paragraph("<b>VEHÍCULO</b>", label_style), Paragraph(vehiculo_info, value_style)],
        ]
        ct = Table(customer_table_data, colWidths=[3 * cm, 6 * cm, 3 * cm, 7 * cm])
        ct.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
            ("BACKGROUND", (0, 0), (0, -1), LIGHT_GRAY),
            ("BACKGROUND", (2, 0), (2, -1), LIGHT_GRAY),
            ("PADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(ct)
        story.append(Spacer(1, 8))

        # ── Section 1: Header data ──
        story.append(Paragraph("1. DATOS GENERALES DEL VEHÍCULO", section_style))
        story.append(Spacer(1, 4))

        header_data = [
            ["MARCA", form.marca or "—", "KM RECEPCIÓN", form.km_entrega or "—", "FECHA RECEPCIÓN", form.fecha_entrega or "—"],
            ["COLOR", form.color or "—", "KM DEVOLUCIÓN", form.km_devolucion or "—", "FECHA DEVOLUCIÓN", form.fecha_devolucion or "—"],
            ["MODELO", form.modelo or "—", "AÑO", form.anio or "—", "LIC. N°", form.licencia_recibe or "—"],
            ["TIPO", form.tipo or "—", "FUNC. RECIBE", form.funcionario_recibe or "—", "LIC. N°", form.licencia_entrega or "—"],
            ["PLACA", form.placa or "—", "FUNC. ENTREGA", form.funcionario_entrega or "—", "", ""],
        ]

        header_table = Table(header_data, colWidths=[2.5 * cm, 4 * cm, 3.5 * cm, 4 * cm, 3 * cm, 3.5 * cm])
        header_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
            ("FONTNAME", (4, 0), (4, -1), "Helvetica-Bold"),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#64748b")),
            ("TEXTCOLOR", (2, 0), (2, -1), colors.HexColor("#64748b")),
            ("TEXTCOLOR", (4, 0), (4, -1), colors.HexColor("#64748b")),
            ("BACKGROUND", (0, 0), (0, -1), LIGHT_GRAY),
            ("BACKGROUND", (2, 0), (2, -1), LIGHT_GRAY),
            ("BACKGROUND", (4, 0), (4, -1), LIGHT_GRAY),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
            ("PADDING", (0, 0), (-1, -1), 4),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, LIGHT_GRAY]),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 8))

        # ── Section 2: Checklist ──
        story.append(Paragraph("2. INVENTARIO Y CONTROL DE CONDICIONES GENERALES", section_style))
        story.append(Spacer(1, 4))

        STATUS_MAP = {"good": "✓ BUENO", "bad": "✗ MALO", "na": "— N/A", None: ""}
        STATUS_COLOR = {"good": colors.HexColor("#16a34a"), "bad": colors.HexColor("#dc2626"), "na": colors.HexColor("#94a3b8"), None: colors.black}

        # Build columns from groups
        groups = form.checklist
        max_rows = max(len(g.items) for g in groups) if groups else 0
        col_count = len(groups)

        # Header row
        check_data = [[Paragraph(f"<b>{g.title.upper()}</b>", label_style) for g in groups]]

        for i in range(max_rows):
            row = []
            for g in groups:
                if i < len(g.items):
                    item = g.items[i]
                    status_text = STATUS_MAP.get(item.status, "")
                    status_color = STATUS_COLOR.get(item.status, colors.black)
                    cell = f"{item.label}\n{status_text}" if status_text else item.label
                    p = Paragraph(cell, ParagraphStyle("check_item", parent=styles["Normal"], fontSize=6.5, textColor=status_color if item.status else colors.HexColor("#334155")))
                    row.append(p)
                else:
                    row.append("")
            check_data.append(row)

        col_width = (A4[0] - 3 * cm) / col_count if col_count else 4 * cm
        check_table = Table(check_data, colWidths=[col_width] * col_count)
        check_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 6.5),
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
            ("PADDING", (0, 0), (-1, -1), 3),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(check_table)
        story.append(Spacer(1, 8))

        # ── Section 3: Damage markers ──
        story.append(Paragraph("3. OBSERVACIONES DE DAÑOS Y ESTADO", section_style))
        story.append(Spacer(1, 4))

        if form.markers:
            marker_data = [["#", "ZONA", "DESCRIPCIÓN", "VISTA", "COORDS (x,y)"]]
            for idx, m in enumerate(form.markers, 1):
                marker_data.append([
                    str(idx),
                    m.zone or "Sin zona",
                    m.note or "—",
                    m.view.upper(),
                    f"({m.coords.get('x', 0):.0f}, {m.coords.get('y', 0):.0f})",
                ])
            marker_table = Table(marker_data, colWidths=[1 * cm, 4 * cm, 8 * cm, 2.5 * cm, 3 * cm])
            marker_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#dc2626")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
                ("PADDING", (0, 0), (-1, -1), 4),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fff5f5")]),
            ]))
            story.append(marker_table)
        else:
            story.append(Paragraph("Sin daños registrados.", small_style))

        story.append(Spacer(1, 8))

        # ── Section 4: Fuel & observations ──
        story.append(Paragraph("4. NIVEL DE COMBUSTIBLE Y OBSERVACIONES", section_style))
        story.append(Spacer(1, 4))

        fuel_pct = form.fuel_level
        fuel_label = "E (Vacío)" if fuel_pct <= 5 else "F (Lleno)" if fuel_pct >= 95 else f"{fuel_pct}%"

        fuel_obs_data = [
            [Paragraph("<b>NIVEL COMBUSTIBLE</b>", label_style), Paragraph(f"{fuel_label}", value_style)],
            [Paragraph("<b>OBSERVACIONES</b>", label_style), Paragraph(form.observaciones or "—", value_style)],
        ]
        fuel_table = Table(fuel_obs_data, colWidths=[4 * cm, 15 * cm])
        fuel_table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
            ("BACKGROUND", (0, 0), (0, -1), LIGHT_GRAY),
            ("PADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(fuel_table)
        story.append(Spacer(1, 12))

        # ── Section 5: Photo evidence ──
        photo_markers = [m for m in form.markers if m.photo_url]
        if photo_markers:
            story.append(Paragraph("5. EVIDENCIA FOTOGRÁFICA", section_style))
            story.append(Spacer(1, 4))

            for m in photo_markers:
                photo_path = Path("." + m.photo_url) if m.photo_url.startswith("/") else Path(m.photo_url)
                story.append(Paragraph(f"<b>{m.zone or 'Sin zona'}</b> — {m.note}", small_style))
                if photo_path.exists():
                    try:
                        img = RLImage(str(photo_path), width=8 * cm, height=6 * cm)
                        story.append(img)
                    except Exception:
                        story.append(Paragraph(f"[Imagen no disponible: {m.photo_url}]", small_style))
                else:
                    story.append(Paragraph(f"[Imagen no encontrada en servidor: {m.photo_url}]", small_style))
                story.append(Spacer(1, 4))

        # ── Signatures ──
        story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=12))
        sig_data = [
            ["_______________________________", "_______________________________"],
            [f"Firma: {form.funcionario_entrega or 'Funcionario que entrega'}", f"Firma: {form.funcionario_recibe or 'Funcionario que recibe'}"],
            [f"Lic. N°: {form.licencia_entrega or '—'}", f"Lic. N°: {form.licencia_recibe or '—'}"],
        ]
        sig_table = Table(sig_data, colWidths=[9.5 * cm, 9.5 * cm])
        sig_table.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ("ALIGNMENT", (0, 0), (-1, -1), "CENTER"),
            ("PADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(sig_table)

        doc.build(story)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="ficha_recepcion_OT{wo_id}.pdf"'},
        )

    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="reportlab no está instalado. Ejecuta: pip install reportlab pillow"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")
