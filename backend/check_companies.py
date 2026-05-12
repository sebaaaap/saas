from app.database import SessionLocal
from app.models.base import Company

db = SessionLocal()
comps = db.query(Company).all()
for c in comps:
    print(c.id, c.name)
db.close()
