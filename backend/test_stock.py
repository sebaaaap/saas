import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.base import Branch, Product

def add_test_stock():
    db = SessionLocal()
    try:
        branches = db.query(Branch).filter(Branch.is_active == True).all()
        for branch in branches:
            if not branch.is_default:
                products = db.query(Product).filter(
                    Product.branch_id == branch.id,
                    Product.stock_quantity == 0
                ).all()
                for p in products:
                    p.stock_quantity = 50
                print(f"Added 50 stock to {len(products)} products in branch {branch.name}")
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    add_test_stock()
