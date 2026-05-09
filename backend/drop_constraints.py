import sys
import os
sys.path.append(os.getcwd())
from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text('DROP INDEX IF EXISTS ix_payment_method_configs_name;'))
        conn.execute(text('ALTER TABLE payment_method_configs DROP CONSTRAINT IF EXISTS payment_method_configs_key_key;'))
        conn.execute(text('ALTER TABLE payment_method_configs ADD CONSTRAINT uix_payment_method_company_key UNIQUE (company_id, key);'))
        conn.commit()
        print("Constraints updated successfully!")
    except Exception as e:
        print("Error:", e)
