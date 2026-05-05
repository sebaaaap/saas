import sys
from app.api.products import list_products
from app.database import SessionLocal
from app.models.base import Branch

db = SessionLocal()
try:
    casa_matriz = db.query(Branch).filter(Branch.is_default == True).first()
    print(f"Casa Matriz ID: {casa_matriz.id}")
    results = list_products(q=None, db=db, current_user=None, branch_id=casa_matriz.id)
    print(f"Returned {len(results)} groups for Casa Matriz")
    
    sucursal = db.query(Branch).filter(Branch.is_default == False).first()
    print(f"Sucursal ID: {sucursal.id}")
    results_sucursal = list_products(q=None, db=db, current_user=None, branch_id=sucursal.id)
    print(f"Returned {len(results_sucursal)} groups for Sucursal")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
