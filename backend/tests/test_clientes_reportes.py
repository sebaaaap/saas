"""
test_clientes_reportes.py — Tests de Clientes y Consistencia de Reportes
=========================================================================
  - Validación de formato RUT (Chile)
  - Historial del cliente con KPIs
  - Consistencia entre ventas del día y reporte de caja
"""
import pytest
import re
from datetime import datetime, timedelta
from app.models.base import (
    Customer, Vehicle, VehicleType,
    Ticket, SaleItem, Payment, SaleState, PaymentMethod,
    CashSession, Product, ProductType,
)


# ─── Helper: Validación de RUT chileno ────────────────────────────────────────

def es_rut_valido(rut: str) -> bool:
    """
    Valida formato RUT chileno: 12.345.678-9 o 12345678-9
    Retorna True si el formato es correcto (no valida dígito verificador).
    """
    patron = r"^\d{1,2}(\.\d{3}){2}-[\dkK]$"
    return bool(re.match(patron, rut))


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def cliente_con_vehiculo(db):
    """Crea un cliente con un vehículo asociado."""
    cliente = Customer(
        name="Juan Pérez Soto",
        rut="12.345.678-9",
        phone="+56987654321",
        email="juan.perez@lubricentro.cl",
    )
    db.add(cliente)
    db.commit()

    vehiculo = Vehicle(
        license_plate="ABCD12",
        brand="Toyota",
        model="Yaris",
        year=2020,
        vehicle_type=VehicleType.automovil,
        customer_id=cliente.id,
    )
    db.add(vehiculo)
    db.commit()
    return {"cliente": cliente, "vehiculo": vehiculo}


@pytest.fixture
def ventas_y_sesion(db, cliente_con_vehiculo):
    """
    Crea 2 ventas validadas para el cliente con totales conocidos.
    Total esperado: $10.000 + $15.000 = $25.000
    """
    from app.models.base import CashRegister
    caja = CashRegister(name="Caja Reporte")
    db.add(caja)
    db.flush()
    sesion = CashSession(cash_register_id=caja.id, opening_balance=50000, user_id="admin_test")
    db.add(sesion)

    prod = Product(
        name="Aceite Shell", barcode="SHELL001",
        price=10000, cost=5000, stock_quantity=100,
        product_type=ProductType.STORABLE,
    )
    db.add(prod)
    db.commit()

    cliente = cliente_con_vehiculo["cliente"]
    veh = cliente_con_vehiculo["vehiculo"]

    def _make_ticket(total: float, method: PaymentMethod) -> Ticket:
        t = Ticket(
            ticket_number=f"T-TEST-{int(total)}",
            state=SaleState.VALIDATED,
            total_amount=total,
            tax_amount=total / 1.19 * 0.19,
            subtotal=total / 1.19,
            session_id=sesion.id,
            customer_id=cliente.id,
            vehicle_id=veh.id,
        )
        db.add(t)
        db.flush()
        pago = Payment(ticket_id=t.id, payment_method=method, amount=total)
        db.add(pago)
        return t

    t1 = _make_ticket(10000, PaymentMethod.CASH)
    t2 = _make_ticket(15000, PaymentMethod.CARD)
    db.commit()

    return {"sesion": sesion, "ventas": [t1, t2], "total_esperado": 25000.0}


# ─── Test 1: Validación de Formato RUT ────────────────────────────────────────

@pytest.mark.parametrize("rut,valido", [
    ("12.345.678-9", True),
    ("76.543.210-K", True),
    ("9.999.999-k",  True),
    ("12345678-9",   False),  # Sin puntos → formato incorrecto según estándar
    ("1234.567-8",   False),  # Puntos mal puestos
    ("12.345.678",   False),  # Sin dígito verificador
    ("abc.def.ghi-j",False),  # Letras en parte numérica
    ("",             False),  # Vacío
])
def test_validacion_formato_rut(rut, valido):
    """
    Valida el formato RUT chileno con múltiples casos de borde.
    Si falla aquí, el frontend/backend está aceptando RUTs mal formateados.
    """
    resultado = es_rut_valido(rut)
    assert resultado == valido, (
        f"FALLO para RUT '{rut}': se esperaba {'válido' if valido else 'inválido'}, "
        f"obtuvo {'válido' if resultado else 'inválido'}."
    )


def test_crear_cliente_rut_duplicado_retorna_400(client, db, admin_token, cliente_con_vehiculo):
    """
    ESCENARIO: Se intenta registrar un 2do cliente con el mismo RUT.
    ESPERADO: HTTP 400 — El RUT debe ser único en el sistema.
    """
    cliente = cliente_con_vehiculo["cliente"]

    payload = {
        "name": "Otro Juan",
        "rut": cliente.rut,  # RUT duplicado intencional
        "phone": "+56900000000",
    }

    resp = client.post(
        "/api/v1/customers/",
        json=payload,
        headers={"Authorization": admin_token},
    )

    assert resp.status_code == 400, (
        f"FALLO: Debería retornar 400 por RUT duplicado, obtuvo {resp.status_code}.\n"
        "El sistema permite RUTs duplicados → integridad de datos comprometida."
    )


# ─── Test 2: Historial del Cliente ────────────────────────────────────────────

def test_historial_cliente_retorna_kpis_correctos(client, db, admin_token, ventas_y_sesion, cliente_con_vehiculo):
    """
    ESCENARIO: Cliente con 2 ventas validadas por $10.000 y $15.000.
    ESPERADO en /customers/{id}/history:
      - summary.total_count = 2
      - summary.total_amount = 25.000
      - La lista 'sales' tiene 2 elementos
    """
    cliente = cliente_con_vehiculo["cliente"]
    total_esperado = ventas_y_sesion["total_esperado"]

    resp = client.get(
        f"/api/v1/customers/{cliente.id}/history",
        headers={"Authorization": admin_token},
    )

    assert resp.status_code == 200, f"Esperado 200, obtenido {resp.status_code}: {resp.text}"
    data = resp.json()

    summary = data.get("summary", {})
    assert summary["total_count"] == 2, (
        f"FALLO: Debería haber 2 ventas en historial, hay {summary['total_count']}."
    )
    assert abs(summary["total_amount"] - total_esperado) < 1.0, (
        f"FALLO: Total del historial debería ser {total_esperado}, es {summary['total_amount']}."
    )

    sales = data.get("sales", [])
    assert len(sales) == 2, f"FALLO: 'sales' debería tener 2 elementos, tiene {len(sales)}."


# ─── Test 3: Consistencia Ventas Diarias vs Reporte de Caja ──────────────────

def test_suma_ventas_coincide_con_reporte_caja(client, db, admin_token, ventas_y_sesion):
    """
    ESCENARIO: Hay 2 ventas validadas con total $25.000 en la sesión de caja.
    ESPERADO: El reporte /reports/sales/summary retorna gross_sales = 25.000.

    Si gross_sales ≠ 25.000, hay una inconsistencia contable en los reportes.
    Este es el "test de cierre de caja": lo que se vendió = lo que reporta el sistema.
    """
    total_esperado = ventas_y_sesion["total_esperado"]

    resp = client.get(
        "/api/v1/reports/sales/summary",
        headers={"Authorization": admin_token},
    )

    assert resp.status_code == 200, f"Error en el reporte: {resp.status_code} - {resp.text}"
    data = resp.json()

    gross_sales = data.get("kpis", {}).get("gross_sales", -1)
    total_tickets = data.get("kpis", {}).get("total_tickets", -1)

    assert abs(gross_sales - total_esperado) < 1.0, (
        f"FALLO CONSISTENCIA CONTABLE:\n"
        f"  Ventas registradas en BDD:  ${total_esperado:,.0f}\n"
        f"  Reportado en gross_sales:   ${gross_sales:,.0f}\n"
        f"  Diferencia: ${abs(gross_sales - total_esperado):,.0f}\n"
        f"  → El reporte miente. Hay un bug en /reports/sales/summary."
    )
    assert total_tickets == 2, (
        f"FALLO: Reporte dice {total_tickets} tickets, pero hay 2 ventas validadas."
    )
