from app.database import SessionLocal
from app.models.base import StorageLocation, Branch, Company

db = SessionLocal()
locations = db.query(StorageLocation).filter(StorageLocation.company_id == None).all()
default_company = db.query(Company).first()
if not default_company:
    print("No company found")
else:
    for loc in locations:
        if loc.branch_id:
            branch = db.query(Branch).filter(Branch.id == loc.branch_id).first()
            if branch:
                loc.company_id = branch.company_id
            else:
                loc.company_id = default_company.id
        else:
            loc.company_id = default_company.id
    db.commit()
    print(f"Fixed {len(locations)} locations")
db.close()
