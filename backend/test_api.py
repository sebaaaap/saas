from app.database import SessionLocal
from app.models.base import Product
db = SessionLocal()
try:
    prods = db.query(Product).all()
    print(f"Total products: {len(prods)}")
    active_prods = db.query(Product).filter(Product.is_active == True).all()
    print(f"Active products: {len(active_prods)}")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
