"""
Script de inicialización de base de datos
Crea una base de datos nueva con datos de prueba
"""

import sys
import os
from pathlib import Path

# Agregar el directorio padre al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.base import Base, Product, ProductCategory, StorageLocation, ProductType
from datetime import datetime

# Crear base de datos nueva
DB_PATH = "local_pos_new.db"
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)
    print(f"✓ Base de datos anterior eliminada: {DB_PATH}")

DATABASE_URL = f"sqlite:///./{DB_PATH}"
engine = create_engine(DATABASE_URL, echo=False)

# Crear todas las tablas
Base.metadata.create_all(bind=engine)
print("✓ Tablas creadas exitosamente")

# Crear sesión
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    # Crear ubicaciones de almacenamiento
    print("\n📦 Creando ubicaciones de almacenamiento...")
    locations = [
        StorageLocation(id=1, name="Tienda Principal", path="Tienda Principal"),
        StorageLocation(id=2, name="Bodega", path="Bodega"),
        StorageLocation(id=3, name="Exhibición", path="Tienda Principal/Exhibición"),
    ]
    db.add_all(locations)
    db.commit()
    print(f"   ✓ {len(locations)} ubicaciones creadas")

    # Crear categorías
    print("\n📂 Creando categorías...")
    categories = [
        ProductCategory(id=1, name="Aceites y Lubricantes"),
        ProductCategory(id=2, name="Llantas y Neumáticos"),
        ProductCategory(id=3, name="Repuestos"),
        ProductCategory(id=4, name="Accesorios"),
    ]
    db.add_all(categories)
    db.commit()
    print(f"   ✓ {len(categories)} categorías creadas")

    # Crear productos de prueba
    print("\n🛍️  Creando productos de prueba...")
    products = [
        # Aceites
        Product(
            id=1,
            name="Aceite Motor 5W-30 Sintético 1L",
            barcode="7891234567890",
            price=18900,
            cost=12000,
            stock_quantity=45,
            min_stock=10,
            category="Aceites y Lubricantes",
            category_id=1,
            location_id=1,
            product_type=ProductType.STORABLE,
            internal_reference="ACE-5W30-1L",
            is_active=True
        ),
        Product(
            id=2,
            name="Aceite Motor 10W-40 Semi-sintético 1L",
            barcode="7891234567891",
            price=14500,
            cost=9000,
            stock_quantity=60,
            min_stock=15,
            category="Aceites y Lubricantes",
            category_id=1,
            location_id=1,
            product_type=ProductType.STORABLE,
            internal_reference="ACE-10W40-1L",
            is_active=True
        ),
        Product(
            id=3,
            name="Aceite Motor 20W-50 Mineral 1L",
            barcode="7891234567892",
            price=9500,
            cost=6000,
            stock_quantity=80,
            min_stock=20,
            category="Aceites y Lubricantes",
            category_id=1,
            location_id=1,
            product_type=ProductType.STORABLE,
            internal_reference="ACE-20W50-1L",
            is_active=True
        ),
        # Llantas
        Product(
            id=4,
            name="Llanta 185/65 R15",
            barcode="7891234567893",
            price=125000,
            cost=85000,
            stock_quantity=16,
            min_stock=4,
            category="Llantas y Neumáticos",
            category_id=2,
            location_id=2,
            product_type=ProductType.STORABLE,
            internal_reference="LLA-185-65-R15",
            is_active=True
        ),
        Product(
            id=5,
            name="Llanta 205/55 R16",
            barcode="7891234567894",
            price=165000,
            cost=110000,
            stock_quantity=12,
            min_stock=4,
            category="Llantas y Neumáticos",
            category_id=2,
            location_id=2,
            product_type=ProductType.STORABLE,
            internal_reference="LLA-205-55-R16",
            is_active=True
        ),
        # Repuestos
        Product(
            id=6,
            name="Filtro de Aceite Universal",
            barcode="7891234567895",
            price=8500,
            cost=5000,
            stock_quantity=50,
            min_stock=10,
            category="Repuestos",
            category_id=3,
            location_id=1,
            product_type=ProductType.STORABLE,
            internal_reference="FIL-ACE-UNI",
            is_active=True
        ),
        Product(
            id=7,
            name="Filtro de Aire Motor",
            barcode="7891234567896",
            price=12000,
            cost=7500,
            stock_quantity=35,
            min_stock=8,
            category="Repuestos",
            category_id=3,
            location_id=1,
            product_type=ProductType.STORABLE,
            internal_reference="FIL-AIRE-MOT",
            is_active=True
        ),
        Product(
            id=8,
            name="Filtro de Gasolina",
            barcode="7891234567897",
            price=9500,
            cost=6000,
            stock_quantity=40,
            min_stock=10,
            category="Repuestos",
            category_id=3,
            location_id=1,
            product_type=ProductType.STORABLE,
            internal_reference="FIL-GAS",
            is_active=True
        ),
        # Accesorios
        Product(
            id=9,
            name="Limpiador de Inyectores 500ml",
            barcode="7891234567898",
            price=15000,
            cost=9000,
            stock_quantity=25,
            min_stock=5,
            category="Accesorios",
            category_id=4,
            location_id=1,
            product_type=ProductType.CONSUMABLE,
            internal_reference="LIM-INY-500",
            is_active=True
        ),
        Product(
            id=10,
            name="Aditivo para Motor 250ml",
            barcode="7891234567899",
            price=18000,
            cost=11000,
            stock_quantity=30,
            min_stock=8,
            category="Accesorios",
            category_id=4,
            location_id=1,
            product_type=ProductType.CONSUMABLE,
            internal_reference="ADI-MOT-250",
            is_active=True
        ),
    ]
    
    db.add_all(products)
    db.commit()
    print(f"   ✓ {len(products)} productos creados")

    print("\n" + "="*60)
    print("✅ Base de datos inicializada exitosamente!")
    print("="*60)
    print(f"\n📊 Resumen:")
    print(f"   - Ubicaciones: {len(locations)}")
    print(f"   - Categorías: {len(categories)}")
    print(f"   - Productos: {len(products)}")
    print(f"\n📁 Base de datos: {DB_PATH}")
    print(f"\n🚀 Para usar esta base de datos, actualiza DATABASE_URL en .env:")
    print(f"   DATABASE_URL=sqlite:///./{DB_PATH}")
    print("\n💡 Códigos de barras de prueba:")
    for p in products[:5]:
        print(f"   {p.barcode} - {p.name} (${p.price:,})")

except Exception as e:
    db.rollback()
    print(f"\n❌ Error al inicializar base de datos: {e}")
    raise
finally:
    db.close()
