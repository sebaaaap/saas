"""
Script de ejemplo para probar el sistema POS completo
Demuestra el flujo completo: Sesión → Venta → Reembolso → Cierre
"""

import requests
import json
from datetime import datetime

API_BASE = "http://localhost:8000/api/v1"

def print_section(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60 + "\n")

def print_json(data):
    print(json.dumps(data, indent=2, default=str))

def check_response(response, action):
    if not response.ok:
        print(f"❌ Error al {action}: {response.status_code}")
        try:
            print(json.dumps(response.json(), indent=2))
        except:
            print(response.text)
        exit(1)
    return response.json()

# ============================================================================
# 1. ABRIR SESIÓN DE CAJA
# ============================================================================
print_section("1. ABRIR SESIÓN DE CAJA")

session_data = {
    "initial_cash": 50000,
    "user_id": "admin"
}

print("Enviando:", json.dumps(session_data, indent=2))
response = requests.post(f"{API_BASE}/sessions/open", json=session_data)
session = check_response(response, "abrir sesión")

print(f"✅ Sesión abierta: {session.get('name', 'SIN NOMBRE')}")
print(f"   ID: {session['id']}")
print(f"   Efectivo inicial: ${session['initial_cash']:,}")
print_json(session)

session_id = session['id']

# ============================================================================
# 2. CREAR VENTA CON PAGOS DIVIDIDOS
# ============================================================================
print_section("2. CREAR VENTA CON PAGOS DIVIDIDOS")

sale_data = {
    "items": [
        {"product_id": 1, "quantity": 2, "price": 10000, "discount_percent": 0},
        {"product_id": 2, "quantity": 1, "price": 5000, "discount_percent": 10}
    ],
    "payments": [
        {"payment_method": "efectivo", "amount": 15000},
        {"payment_method": "tarjeta", "amount": 9500}
    ],
    "session_id": session_id
}

# Crear venta en DRAFT
print("Enviando datos de venta:", json.dumps(sale_data, indent=2))
response = requests.post(f"{API_BASE}/pos/sales", json=sale_data)
sale = check_response(response, "crear venta")

print(f"✅ Venta creada en estado DRAFT")
print(f"   Ticket: {sale['ticket_number']}")
print(f"   Total: ${sale['total_amount']:,}")
print(f"   Estado: {sale['state']}")
print_json(sale)

ticket_id = sale['id']

# Validar venta (ajustar inventario)
print("\n🔄 Validando venta (ajustando inventario)...")
response = requests.post(f"{API_BASE}/pos/sales/{ticket_id}/validate")
sale = check_response(response, "validar venta")

print(f"✅ Venta validada")
print(f"   Estado: {sale['state']}")
print(f"   Fecha validación: {sale['date_validated']}")

# Marcar como pagada
print("\n🔄 Marcando como pagada...")
response = requests.post(f"{API_BASE}/pos/sales/{ticket_id}/pay")
sale = check_response(response, "marcar como pagada")

print(f"✅ Venta completada")
print(f"   Estado: {sale['state']}")

# ============================================================================
# 3. CREAR VENTA RÁPIDA (UN SOLO PAGO)
# ============================================================================
print_section("3. CREAR VENTA RÁPIDA")

quick_sale_data = {
    "items": [
        {"product_id": 3, "quantity": 1, "price": 25000}
    ],
    "payment_method": "efectivo",
    "total_amount": 25000,
    "session_id": session_id
}

response = requests.post(f"{API_BASE}/pos/sales/quick", json=quick_sale_data)
quick_sale = check_response(response, "crear venta rápida")

print(f"✅ Venta rápida completada (DRAFT→VALIDATED→PAID)")
print(f"   Ticket: {quick_sale['ticket_number']}")
print(f"   Total: ${quick_sale['total_amount']:,}")
print(f"   Estado: {quick_sale['state']}")
print_json(quick_sale)

# ============================================================================
# 4. CREAR REEMBOLSO (NOTA DE CRÉDITO)
# ============================================================================
print_section("4. CREAR REEMBOLSO")

refund_data = {
    "original_ticket_id": ticket_id,
    "items": [
        {"product_id": 1, "quantity": 1, "price": 10000}
    ],
    "refund_reason": "devolucion_stock",
    "return_to_stock": True
}

response = requests.post(f"{API_BASE}/pos/refunds", json=refund_data)
refund = check_response(response, "crear reembolso")

print(f"✅ Nota de crédito creada")
print(f"   Ticket original: {refund['original_ticket']['ticket_number']}")
print(f"   Nota de crédito: {refund['credit_note']['ticket_number']}")
print(f"   Monto reembolsado: ${abs(refund['credit_note']['total_amount']):,}")
print(f"   Producto regresó al stock: {refund_data['return_to_stock']}")
print_json(refund)

# ============================================================================
# 5. CONSULTAR RESUMEN DE SESIÓN
# ============================================================================
print_section("5. RESUMEN DE SESIÓN")

response = requests.get(f"{API_BASE}/sessions/{session_id}/summary")
summary = check_response(response, "obtener resumen")

print(f"✅ Resumen de sesión obtenido")
print(f"   Total transacciones: {summary['total_transactions']}")
print(f"   Total ventas: ${summary['total_sales']:,}")
print(f"\n   Desglose por método de pago:")
print(f"   - Efectivo: ${summary['payment_breakdown']['cash']:,}")
print(f"   - Tarjeta: ${summary['payment_breakdown']['card']:,}")
print(f"   - Transferencia: ${summary['payment_breakdown']['transfer']:,}")

# ============================================================================
# 6. CERRAR SESIÓN
# ============================================================================
print_section("6. CERRAR SESIÓN")

close_data = {
    "final_cash": 90000,  # Lo que cuenta el cajero
    "notes": "Todo correcto, sin novedades"
}

response = requests.post(f"{API_BASE}/sessions/{session_id}/close", json=close_data)
closed_session = check_response(response, "cerrar sesión")

print(f"✅ Sesión cerrada")
print(f"   Efectivo inicial: ${closed_session['initial_cash']:,}")
print(f"   Efectivo esperado: ${closed_session['expected_cash']:,}")
print(f"   Efectivo contado: ${closed_session['final_cash']:,}")
print(f"   Diferencia: ${closed_session['difference']:,}")
print(f"   Notas: {closed_session['notes']}")
print_json(closed_session)

# ============================================================================
# RESUMEN FINAL
# ============================================================================
print_section("RESUMEN FINAL")

print("✅ Flujo completo ejecutado exitosamente:")
print("   1. ✓ Sesión abierta")
print("   2. ✓ Venta con pagos divididos creada")
print("   3. ✓ Venta rápida creada")
print("   4. ✓ Reembolso procesado")
print("   5. ✓ Resumen consultado")
print("   6. ✓ Sesión cerrada")
print("\n🎉 Sistema POS funcionando correctamente!")
