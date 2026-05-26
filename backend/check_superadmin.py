import os
import sys
sys.path.insert(0, '/Users/sebastian/Desktop/prototipos/saaas/backend')

from app.database import get_db_session
from app.models.base import User, UserRole
import traceback

db_gen = get_db_session()
db = next(db_gen)

try:
    print("=== CHECKING USERS IN PRODUCTION ===")
    
    users = db.query(User).all()
    print(f"Total users: {len(users)}")
    print()
    
    for u in users:
        role_val = u.role.value if hasattr(u.role, 'value') else str(u.role)
        print(f"  username={u.username!r:20} role={role_val!r:12} company_id={str(u.company_id)[:8] if u.company_id else 'NULL':8} is_active={u.is_active}")
    
    print()
    # Check require_superadmin logic
    print("=== CHECKING SUPERADMIN ACCESS LOGIC ===")
    for u in users:
        role_val = u.role.value if hasattr(u.role, 'value') else str(u.role)
        is_superadmin_role = role_val == "superadmin"
        has_no_company = u.company_id is None
        # This is the guard logic from superadmin.py:
        # if user_role != "superadmin" AND company_id is not None → blocked
        would_be_blocked = (role_val != "superadmin") and (u.company_id is not None)
        print(f"  {u.username!r}: role={role_val!r}, company_id={'set' if u.company_id else 'NULL'} → {'❌ BLOCKED' if would_be_blocked else '✅ ALLOWED'}")

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    traceback.print_exc()
finally:
    db.close()
