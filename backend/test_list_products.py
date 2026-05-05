import sys
from app.api.products import list_products
from app.database import SessionLocal

db = SessionLocal()
try:
    results = list_products(q=None, db=db, current_user=None, branch_id=None)
    print(f"Returned {len(results)} groups")
    for r in results[:5]:
        print(f" - {r.name} (stock: {r.total_stock}, branch: {r.location_id})")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
