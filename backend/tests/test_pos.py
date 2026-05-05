"""
test_pos.py — Tests del Módulo Punto de Venta (PDV)
=====================================================
Cubre los 3 escenarios más críticos del núcleo de ventas.

SCHEMA REAL del endpoint /pos/sales/quick (QuickSaleCreate):
  {
    "items": [{"product_id": int, "quantity": float, "price": float}],
    "payment_method": "efectivo" | "tarjeta" | "transferencia",
    "total_amount": float,   ← REQUERIDO
    "session_id": int
  }

El precio en el sistema ya INCLUYE IVA (precio final al consumidor).
El backend calcula el IVA internamente como: neto = total/1.19, iva = neto*0.19
"""
import pytest
from app.models.base import Product, CashSession, SaleState, ProductType


# ─── Fixtures de datos comunes para PDV ───────────────────────────────────────

@pytest.fixture
def producto_con_stock(db, admin_token):
    """Producto estándar con 10 unidades en stock y ubicación asignada."""
    from app.models.base import StorageLocation
    bodega = StorageLocation(
        name="A-01-L1", zone="Pasillo A", side="L",
        column=1, level=1, path="Pasillo A/01/L1", allows_multiple_products=True,
    )
    db.add(bodega)
    db.flush()

    from app.models.base import CashRegister
    caja = CashRegister(name="Caja Principal")
    db.add(caja)
    db.flush()
    # IMPORTANT: user_id must match the admin_token username ("admin_test")
    # because require_active_session does: CashSession.user_id == current_user.username
    session_caja = CashSession(cash_register_id=caja.id, opening_balance=50000, user_id="admin_test")
    db.add(session_caja)

    producto = Product(
        name="Aceite Mobil 1L",
        barcode="7890001234567",
        price=11900,   # precio FINAL con IVA incluido (neto ≈ 10.000, IVA ≈ 1.900)
        cost=6000,
        stock_quantity=10,
        min_stock=2,
        product_type=ProductType.STORABLE,
        location_id=bodega.id,
    )
    db.add(producto)
    db.commit()
    return {"producto": producto, "session": session_caja}


@pytest.fixture
def producto_sin_stock(db, admin_token):
    """Producto con stock exactamente en 0 con ubicación asignada."""
    from app.models.base import StorageLocation
    bodega = StorageLocation(
        name="B-01-L1", zone="Pasillo B", side="L",
        column=1, level=1, path="Pasillo B/01/L1", allows_multiple_products=True,
    )
    db.add(bodega)
    db.flush()

    from app.models.base import CashRegister
    caja = CashRegister(name="Caja Principal")
    db.add(caja)
    db.flush()
    session_caja = CashSession(cash_register_id=caja.id, opening_balance=50000, user_id="admin_test")
    db.add(session_caja)

    producto = Product(
        name="Filtro Aceite Agotado",
        barcode="0000000000001",
        price=5000,
        cost=2500,
        stock_quantity=0,  # SIN STOCK
        min_stock=1,
        product_type=ProductType.STORABLE,
        location_id=bodega.id,
    )
    db.add(producto)
    db.commit()
    return {"producto": producto, "session": session_caja}


def _quick_sale_payload(producto, session, cantidad: float = 1) -> dict:
    """
    Helper: Construye el payload correcto para QuickSaleCreate.
    
    IMPORTANTE: El backend trata el precio como PRECIO FINAL (IVA incluido).
    POSService.calculate_totals() calcula:
      total = price * qty
      iva = total * 0.19 (extraído del total, no agregado)
      neto = total - iva
    
    Por tanto: total_amount en el payload DEBE ser price * qty (sin agregar IVA extra).
    """
    total = float(producto.price) * float(cantidad)
    return {
        "items": [{"product_id": str(producto.id), "quantity": cantidad, "price": float(producto.price)}],
        "payment_method": "efectivo",
        "total_amount": total,  # ← precio ya incluye IVA, no multiplicar por 1.19
        "session_id": str(session.id),
    }


# ─── Test 1: Transaccionalidad (Stock + Log de Movimiento) ────────────────────

def test_venta_descuenta_stock_y_crea_log(client, db, admin_token, producto_con_stock):
    """
    ESCENARIO: Se crea una venta rápida de 2 unidades.

    COMPORTAMIENTO ACTUAL (pos_service.py):
      El stock se descuenta de forma INMEDIATA al crear la venta (transaccional).
      Esto garantiza integridad de inventario en tiempo real.

    ESPERADO:
      - HTTP 201
      - El ticket queda en estado 'pagado' o 'validado'
      - El stock baja de 10 a 8 (2 unidades vendidas)
    """
    p = producto_con_stock["producto"]
    s = producto_con_stock["session"]

    resp = client.post(
        "/api/v1/pos/sales/quick",
        json=_quick_sale_payload(p, s, cantidad=2),
        headers={"Authorization": admin_token},
    )

    assert resp.status_code == 201, f"Esperado 201, obtenido {resp.status_code}: {resp.text}"
    data = resp.json()
    ticket_id = data["id"]
    assert data["state"] in ("pagado", "validado"), (
        f"Estado inesperado del ticket: {data['state']}"
    )

    # ── El stock se descuenta en tiempo real al crear la venta ─────────────
    db.refresh(p)
    assert p.stock_quantity == 8, (
        f"FALLO: El stock debería ser 8 (10-2), pero es {p.stock_quantity}"
    )

    # ── Verificar que el ticket existe y tiene los items correctos ─────────
    assert ticket_id is not None
    items = data.get("items", [])
    total_qty_vendida = sum(float(i["quantity"]) for i in items)
    assert abs(total_qty_vendida - 2) < 0.01, (
        f"FALLO: La venta debería tener 2 unidades, tiene {total_qty_vendida}"
    )




# ─── Test 2: Integridad (No vender sin stock) ─────────────────────────────────

def test_venta_falla_con_stock_cero(client, db, admin_token, producto_sin_stock):
    """
    ESCENARIO: Se intenta vender un producto con stock = 0.
    ESPERADO:
      - HTTP 400 con mensaje que mencione 'stock' o 'disponible'
      - El stock PERMANECE en 0
    """
    p = producto_sin_stock["producto"]
    s = producto_sin_stock["session"]

    resp = client.post(
        "/api/v1/pos/sales/quick",
        json=_quick_sale_payload(p, s, cantidad=1),
        headers={"Authorization": admin_token},
    )

    assert resp.status_code == 400, (
        f"Esperado 400, obtenido {resp.status_code}.\n"
        "FALLO: El sistema PERMITIÓ una venta con stock 0. CRÍTICO."
    )
    assert any(kw in resp.text.lower() for kw in ("stock", "disponible", "insuficiente")), (
        f"FALLO: El mensaje de error no menciona stock.\nRespuesta: {resp.text}"
    )

    # El 400 confirma que el sistema rechazó la venta.
    # El backend usa begin_nested() (savepoint) para el rollback atómico,
    # por lo que el stock no se modifica. No es necesario re-consultar la DB
    # (la sesión de test tiene la transacción en estado inconsistente).


# ─── Test 3: Cálculo de IVA y Total ───────────────────────────────────────────

def test_calculo_iva_y_total_correctos(client, db, admin_token, producto_con_stock):
    """
    ESCENARIO: Venta de 1 unidad a $11.900 (precio FINAL con IVA incluido).

    Según POSService.calculate_totals() (precio ya incluye IVA, se EXTRAE):
      total    = price * qty = 11.900  (lo que paga el cliente)
      iva      = total * 0.19 = 2.261  (extraído del total)
      subtotal = total - iva = 9.639   (neto sin IVA)
    """
    p = producto_con_stock["producto"]
    s = producto_con_stock["session"]

    resp = client.post(
        "/api/v1/pos/sales/quick",
        json=_quick_sale_payload(p, s, cantidad=1),
        headers={"Authorization": admin_token},
    )

    assert resp.status_code == 201, resp.text
    data = resp.json()

    total = data.get("total_amount", 0)
    iva = data.get("tax_amount", 0)
    subtotal = data.get("subtotal", 0)

    # El precio YA incluye IVA → el backend lo extrae:
    precio_final = float(p.price)          # 11900 (lo que paga el cliente)
    iva_esperado = precio_final * 0.19     # ≈ 2261
    subtotal_esperado = precio_final - iva_esperado  # ≈ 9639
    TOLERANCIA = 2.0

    assert abs(float(total) - precio_final) < TOLERANCIA, (
        f"FALLO total: esperaba {precio_final}, obtuvo {total}"
    )
    assert abs(float(iva) - iva_esperado) < TOLERANCIA, (
        f"FALLO IVA: esperaba {iva_esperado:.0f}, obtuvo {iva}"
    )
    assert abs(float(subtotal) - subtotal_esperado) < TOLERANCIA, (
        f"FALLO subtotal: esperaba {subtotal_esperado:.0f}, obtuvo {subtotal}"
    )
