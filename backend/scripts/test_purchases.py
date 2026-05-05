#!/usr/bin/env python3
"""
Script de prueba para el flujo de compras (similar a Odoo)
"""
import sys
import os

# Agregar el directorio raíz al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.base import Product, Supplier, Purchase, PurchaseState
from app.services.purchase_service import PurchaseService
from app.schemas.purchases import PurchaseCreate, PurchaseItemCreate

def test_purchase_flow():
    """
    Prueba el flujo completo de compras:
    1. Crear proveedor
    2. Crear productos
    3. Crear compra en borrador
    4. Confirmar compra (debe incrementar stock)
    """
    db = SessionLocal()
    
    try:
        print("\n" + "="*60)
        print("🧪 PRUEBA DE FLUJO DE COMPRAS (Similar a Odoo)")
        print("="*60 + "\n")
        
        # 1. Crear proveedor
        print("1️⃣  Creando proveedor...")
        supplier = Supplier(
            name="Distribuidora ABC",
            tax_id="12345678-9",
            phone="+56912345678",
            email="ventas@abc.cl"
        )
        db.add(supplier)
        db.commit()
        db.refresh(supplier)
        print(f"   ✅ Proveedor creado: {supplier.name} (ID: {supplier.id})")
        
        # 2. Crear productos
        print("\n2️⃣  Creando productos...")
        product1 = Product(
            name="Coca Cola 1.5L",
            barcode="7790001234567",
            price=1500.0,
            cost=800.0,
            stock_quantity=0,
            product_type="STORABLE"
        )
        product2 = Product(
            name="Papas Lays 150g",
            barcode="7790007654321",
            price=1200.0,
            cost=600.0,
            stock_quantity=0,
            product_type="STORABLE"
        )
        db.add(product1)
        db.add(product2)
        db.commit()
        db.refresh(product1)
        db.refresh(product2)
        print(f"   ✅ Producto 1: {product1.name} (Stock inicial: {product1.stock_quantity})")
        print(f"   ✅ Producto 2: {product2.name} (Stock inicial: {product2.stock_quantity})")
        
        # 3. Crear compra en BORRADOR
        print("\n3️⃣  Creando compra en estado BORRADOR...")
        service = PurchaseService(db)
        
        purchase_data = PurchaseCreate(
            supplier_id=supplier.id,
            invoice_number="FAC-001-2024",
            notes="Primera compra de prueba",
            items=[
                PurchaseItemCreate(
                    product_id=product1.id,
                    quantity=50,
                    unit_cost=750.0
                ),
                PurchaseItemCreate(
                    product_id=product2.id,
                    quantity=100,
                    unit_cost=550.0
                )
            ]
        )
        
        purchase = service.create_purchase(purchase_data)
        print(f"   ✅ Compra creada (ID: {purchase.id})")
        print(f"      Estado: {purchase.state.name}")
        print(f"      Total: ${purchase.total_cost:,.0f}")
        print(f"      Items: {len(purchase.items)}")
        
        # Verificar que el stock NO cambió (aún está en borrador)
        db.refresh(product1)
        db.refresh(product2)
        print(f"\n   📦 Stock después de crear borrador:")
        print(f"      {product1.name}: {product1.stock_quantity} (debe ser 0)")
        print(f"      {product2.name}: {product2.stock_quantity} (debe ser 0)")
        
        # 4. Confirmar compra
        print("\n4️⃣  Confirmando compra...")
        confirmed_purchase = service.confirm_purchase(purchase.id)
        print(f"   ✅ Compra confirmada (ID: {confirmed_purchase.id})")
        print(f"      Estado: {confirmed_purchase.state.name}")
        
        # Verificar que el stock SÍ cambió
        db.refresh(product1)
        db.refresh(product2)
        print(f"\n   📦 Stock después de confirmar:")
        print(f"      {product1.name}: {product1.stock_quantity} (debe ser 50)")
        print(f"      {product2.name}: {product2.stock_quantity} (debe ser 100)")
        
        # Verificar que los costos se actualizaron
        print(f"\n   💰 Costos actualizados:")
        print(f"      {product1.name}: ${product1.cost:,.0f} (debe ser $750)")
        print(f"      {product2.name}: ${product2.cost:,.0f} (debe ser $550)")
        
        # 5. Intentar cancelar una compra confirmada (debe fallar)
        print("\n5️⃣  Intentando cancelar compra confirmada (debe fallar)...")
        try:
            service.cancel_purchase(purchase.id)
            print("   ❌ ERROR: Se pudo cancelar una compra confirmada!")
        except Exception as e:
            print(f"   ✅ Correcto: {str(e)}")
        
        # 6. Crear otra compra y cancelarla en borrador
        print("\n6️⃣  Creando y cancelando compra en borrador...")
        purchase_data2 = PurchaseCreate(
            supplier_id=supplier.id,
            invoice_number="FAC-002-2024",
            items=[
                PurchaseItemCreate(
                    product_id=product1.id,
                    quantity=20,
                    unit_cost=750.0
                )
            ]
        )
        purchase2 = service.create_purchase(purchase_data2)
        print(f"   ✅ Compra creada (ID: {purchase2.id}, Estado: {purchase2.state.name})")
        
        cancelled_purchase = service.cancel_purchase(purchase2.id)
        print(f"   ✅ Compra cancelada (ID: {cancelled_purchase.id}, Estado: {cancelled_purchase.state.name})")
        
        # Verificar que el stock no cambió
        db.refresh(product1)
        print(f"      Stock de {product1.name}: {product1.stock_quantity} (debe seguir en 50)")
        
        print("\n" + "="*60)
        print("✅ TODAS LAS PRUEBAS PASARON CORRECTAMENTE")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_purchase_flow()
