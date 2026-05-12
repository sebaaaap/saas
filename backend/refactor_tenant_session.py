import os
import re

api_dir = "/Users/sebastian/Desktop/prototipos/saaas/backend/app/api"
skip_files = ["auth.py", "companies.py", "superadmin.py", "deps.py", "locations.py", "inventory.py", "products.py"]

for filename in os.listdir(api_dir):
    if not filename.endswith(".py") or filename in skip_files:
        continue
        
    filepath = os.path.join(api_dir, filename)
    with open(filepath, "r") as f:
        content = f.read()
        
    original = content
    
    # Imports
    content = content.replace("from app.database import get_db_session", "from app.api.deps import get_tenant_session\nfrom app.db.tenant_session import TenantSession")
    content = content.replace("from sqlalchemy.orm import Session", "")
    
    # Fix double imports if any
    content = content.replace("from app.api.deps import get_tenant_session\nfrom app.api.deps import get_tenant_session", "from app.api.deps import get_tenant_session")
    
    # Dependencies
    content = content.replace("db: Session = Depends(get_db_session)", "db: TenantSession = Depends(get_tenant_session)")
    content = content.replace("db:Session = Depends(get_db_session)", "db: TenantSession = Depends(get_tenant_session)")
    
    # Queries
    content = content.replace("db.query(", "db.tenant_query(")
    
    if content != original:
        with open(filepath, "w") as f:
            f.write(content)
        print(f"Refactored {filename}")

