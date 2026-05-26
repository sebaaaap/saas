import os
import sys
from sqlalchemy.orm import Session
from sqlalchemy import text

sys.path.insert(0, '/Users/sebastian/Desktop/prototipos/saaas/backend')

from app.database import get_db_session
from app.models.base import Company, User, UserRole, Branch, CashRegister
from app.core import security
from app.services.tenant_service import initialize_tenant_defaults
import traceback

db_gen = get_db_session()
db = next(db_gen)

try:
    print("=== TESTING COMPANY CREATION ===")
    
    test_name = "Empresa Test Debug 999"
    test_username = "admin_test_debug_999"
    test_email = "test_debug_999@test.com"
    
    # 1. Check uniqueness
    existing = db.query(Company).filter(Company.name == test_name).first()
    print(f"Company name exists: {existing is not None}")
    
    existing_user = db.query(User).filter(User.username == test_username).first()
    print(f"Username exists: {existing_user is not None}")
    
    # 2. Create Company
    company = Company(
        name=test_name,
        business_name="Test Business",
        email="empresa@test.com",
        subscription_plan="free",
        is_active=True
    )
    db.add(company)
    db.flush()
    print(f"✅ Company created: {company.id}")
    
    # 3. Create Branch
    branch = Branch(
        company_id=company.id,
        name="Casa Matriz",
        is_active=True,
        is_default=True
    )
    db.add(branch)
    db.flush()
    print(f"✅ Branch created: {branch.id}")
    
    # 4. Create User
    admin_user = User(
        company_id=company.id,
        username=test_username,
        email=test_email,
        full_name="Admin Test",
        hashed_password=security.get_password_hash("test123"),
        role=UserRole.admin,
        is_active=True
    )
    db.add(admin_user)
    db.flush()
    print(f"✅ User created: {admin_user.id}")
    
    # 5. Initialize defaults
    initialize_tenant_defaults(db, company.id)
    print("✅ Defaults initialized")
    
    db.commit()
    print("✅ COMMIT SUCCESS - Company creation works!")
    
    # Cleanup
    db.delete(admin_user)
    for item in db.query(CashRegister).filter(CashRegister.company_id == company.id).all():
        db.delete(item)
    db.flush()
    db.delete(branch)
    db.flush()
    db.delete(company)
    db.commit()
    print("✅ Test data cleaned up")
    
except Exception as e:
    db.rollback()
    print(f"\n❌ ERROR: {type(e).__name__}: {e}")
    print("\n--- Full traceback ---")
    traceback.print_exc()

finally:
    db.close()
