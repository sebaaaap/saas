from app.database import SessionLocal
from app.models.base import StorageLocation

db = SessionLocal()
locations = db.query(StorageLocation).all()
for loc in locations:
    print(loc.name, loc.company_id, loc.branch_id)
db.close()
