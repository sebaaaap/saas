from app.database import SessionLocal
from app.models.base import StorageLocation

db = SessionLocal()
locations = db.query(StorageLocation).filter(StorageLocation.company_id.is_(None)).all()
print(f"Null locations: {len(locations)}")
for loc in locations:
    print(loc.id, loc.name)
db.close()
