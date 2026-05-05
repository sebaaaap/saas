import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.base import Branch, Product, PurchaseItem, SaleItem

def revert_cloned_products():
    db = SessionLocal()
    try:
        default_branch = db.query(Branch).filter(Branch.is_default == True).first()
        if not default_branch:
            print("No default branch.")
            return

        other_branches = db.query(Branch).filter(Branch.id != default_branch.id).all()
        for branch in other_branches:
            products = db.query(Product).filter(Product.branch_id == branch.id).all()
            deleted = 0
            for p in products:
                # Check if referenced
                purchase = db.query(PurchaseItem).filter(PurchaseItem.product_id == p.id).first()
                sale = db.query(SaleItem).filter(SaleItem.product_id == p.id).first()
                if not purchase and not sale:
                    db.delete(p)
                    deleted += 1
            print(f"Deleted {deleted} products from branch {branch.name}")
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    revert_cloned_products()
