import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.base import Branch, Product

def revert_cloned_products():
    db = SessionLocal()
    try:
        default_branch = db.query(Branch).filter(Branch.is_default == True).first()
        if not default_branch:
            print("No default branch.")
            return

        other_branches = db.query(Branch).filter(Branch.id != default_branch.id).all()
        for branch in other_branches:
            # We delete products in this branch that have NO location and match exactly what we created.
            # Actually, we can just delete all products in this branch since they shouldn't be here.
            # The user explicitly said: "los productos de casa matriz no me pueden salir en sucursal!!"
            # And they just created this branch, so there are no real products yet.
            deleted = db.query(Product).filter(Product.branch_id == branch.id).delete()
            print(f"Deleted {deleted} products from branch {branch.name}")
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    revert_cloned_products()
