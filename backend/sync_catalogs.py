import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.base import Branch, Product

def sync_catalogs():
    db = SessionLocal()
    try:
        print("Starting catalog synchronization across branches...")
        
        # Obtener la sucursal por defecto (donde probablemente están todos los productos)
        default_branch = db.query(Branch).filter(Branch.is_default == True).first()
        if not default_branch:
            print("No default branch found. Cannot sync.")
            return

        # Obtener todos los productos de la sucursal por defecto
        base_products = db.query(Product).filter(
            Product.branch_id == default_branch.id,
            Product.is_active == True
        ).all()
        
        print(f"Found {len(base_products)} products in default branch ({default_branch.name})")

        # Obtener todas las demás sucursales activas
        other_branches = db.query(Branch).filter(
            Branch.id != default_branch.id,
            Branch.is_active == True
        ).all()

        added_total = 0

        for branch in other_branches:
            print(f"\nProcessing branch: {branch.name}")
            
            # Obtener códigos de barra existentes en esta sucursal para no duplicar
            existing_barcodes = {
                p.barcode for p in db.query(Product.barcode).filter(Product.branch_id == branch.id).all()
            }
            
            added_in_branch = 0
            for base_p in base_products:
                if base_p.barcode not in existing_barcodes:
                    new_p = Product(
                        name=base_p.name,
                        internal_reference=base_p.internal_reference,
                        barcode=base_p.barcode,
                        price=base_p.price,
                        cost=base_p.cost,
                        uom=base_p.uom,
                        is_variable_consumption=base_p.is_variable_consumption,
                        default_consumption_rate=base_p.default_consumption_rate,
                        product_type=base_p.product_type,
                        category_id=base_p.category_id,
                        category=base_p.category,
                        branch_id=branch.id,
                        stock_quantity=0,
                        location_id=None
                    )
                    db.add(new_p)
                    added_in_branch += 1
            
            print(f"Added {added_in_branch} missing products to {branch.name}.")
            added_total += added_in_branch
            
        db.commit()
        print(f"\nSync complete. {added_total} products cloned across branches.")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    sync_catalogs()
