import os
import sys
sys.path.insert(0, '/Users/sebastian/Desktop/prototipos/saaas/backend')

from app.database import get_db_session
from app.models.base import (
    User, Company, Branch, CashRegister, ExpenseCategory, 
    PaymentMethodConfig, ProductCategory, InventoryMovement
)
from sqlalchemy import text
import traceback

db_gen = get_db_session()
db = next(db_gen)

try:
    # Find the test company
    test_user = db.query(User).filter(User.username == "admin_test_debug_999").first()
    if not test_user:
        print("Test user not found, nothing to clean")
    else:
        company_id = test_user.company_id
        print(f"Cleaning test company: {company_id}")
        
        # Delete in dependency order using raw SQL to avoid FK issues
        db.execute(text(f"DELETE FROM expense_categories WHERE company_id = '{company_id}'"))
        db.execute(text(f"DELETE FROM payment_method_configs WHERE company_id = '{company_id}'"))
        db.execute(text(f"DELETE FROM cash_registers WHERE company_id = '{company_id}'"))
        db.execute(text(f"DELETE FROM user_branch_access WHERE user_id IN (SELECT id::varchar FROM users WHERE company_id = '{company_id}'::uuid)"))
        db.execute(text(f"DELETE FROM users WHERE company_id = '{company_id}'"))
        db.execute(text(f"DELETE FROM branches WHERE company_id = '{company_id}'"))
        db.execute(text(f"DELETE FROM companies WHERE id = '{company_id}'"))
        
        db.commit()
        print("✅ Test company cleaned up")

except Exception as e:
    db.rollback()
    print(f"❌ ERROR: {e}")
    traceback.print_exc()
finally:
    db.close()
