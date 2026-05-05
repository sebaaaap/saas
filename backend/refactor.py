import os
import re

APP_DIR = "/Users/sebastian/Desktop/prototipos/post_full_v1/backend/app"

def refactor_schemas():
    schemas_dir = os.path.join(APP_DIR, "schemas")
    for f in os.listdir(schemas_dir):
        if not f.endswith(".py"): continue
        p = os.path.join(schemas_dir, f)
        with open(p, "r") as file:
            c = file.read()
            
        if "from uuid import UUID" not in c and "import uuid" not in c:
            c = "from uuid import UUID\n" + c
            
        # Replace common ID fields
        # Covers: id: int, product_id: int
        c = re.sub(r'\b([a-zA-Z_]*id):\s*int', r'\1: UUID', c)
        # Covers: parent_id: Optional[int]
        c = re.sub(r'\b([a-zA-Z_]*id):\s*Optional\[int\]', r'\1: Optional[UUID]', c)
        # Cover edge cases where there is default value: category_id: Optional[int] = None
        c = re.sub(r'\b([a-zA-Z_]*id):\s*int\s*=', r'\1: UUID =', c)
        
        with open(p, "w") as file:
            file.write(c)

def refactor_apis():
    api_dir = os.path.join(APP_DIR, "api")
    for f in os.listdir(api_dir):
        if not f.endswith(".py"): continue
        p = os.path.join(api_dir, f)
        with open(p, "r") as file:
            c = file.read()
            
        if "from uuid import UUID" not in c:
            c = "from uuid import UUID\n" + c
            
        # Replace DB dependency imports
        c = re.sub(r'from app\.db\.session import get_db', 'from app.database import get_db_session', c)
        # If it was imported like "from app.api import deps", leave it or change deps.py
        c = c.replace('Depends(get_db)', 'Depends(get_db_session)')
        # In params: db: Session = Depends(get_db) -> db: Session = Depends(get_db_session)
        c = re.sub(r'db:\s*Session\s*=\s*Depends\(get_db\)', 'db: Session = Depends(get_db_session)', c)
        c = re.sub(r'db:\s*Session\s*=\s*Depends\(\s*get_db\s*\)', 'db: Session = Depends(get_db_session)', c)
        
        # Replace int and id parameters in API signatures
        # def get_product(product_id: int, ...) -> def get_product(product_id: UUID, ...)
        c = re.sub(r'\b([a-zA-Z_]*id):\s*int', r'\1: UUID', c)
        c = re.sub(r'\b([a-zA-Z_]*id):\s*Optional\[int\]', r'\1: Optional[UUID]', c)
        
        with open(p, "w") as file:
            file.write(c)
            
def refactor_deps():
    p = os.path.join(APP_DIR, "api", "deps.py")
    if os.path.exists(p):
        with open(p, "r") as file:
            c = file.read()
        c = re.sub(r'from app\.db\.session import get_db', 'from app.database import get_db_session', c)
        with open(p, "w") as file:
            file.write(c)

refactor_schemas()
refactor_apis()
refactor_deps()
print("Refactoring done.")
