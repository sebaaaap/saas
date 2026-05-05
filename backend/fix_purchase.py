import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import DATABASE_URL
from app.models.base import Purchase, PurchaseState, Product, InventoryMovement

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

from sqlalchemy import text
db.execute(text("SET search_path TO \"default\", public;"))
db.commit()

# Encontrar la compra
purchases = db.query(Purchase).filter(Purchase.invoice_number == "722148").all()
for p in purchases:
    print(f"Encontrada compra ID: {p.id}, Estado: {p.state}")
    if p.state == PurchaseState.CONFIRMED:
        # Revertir stock
        for item in p.items:
            prod = db.query(Product).filter(Product.id == item.product_id).first()
            if prod:
                prod.stock_quantity -= item.quantity
                print(f"Revertido stock de {prod.name}: -{item.quantity}")
        
        # Eliminar movimientos de inventario asociados
        movs = db.query(InventoryMovement).filter(InventoryMovement.purchase_id == p.id).all()
        for m in movs:
            db.delete(m)
            
        p.state = PurchaseState.CANCELLED
        print("Compra cancelada.")

db.commit()
print("Listo.")
