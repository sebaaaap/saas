import os
import sys
from sqlalchemy import create_engine, text

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("No DATABASE_URL")
    sys.exit(1)

engine = create_engine(db_url)
with engine.begin() as conn:
    print("Dropping index if exists...")
    conn.execute(text("DROP INDEX IF EXISTS ix_payment_method_configs_name;"))
    print("Dropping constraint if exists...")
    # Also drop the other constraint that might conflict
    conn.execute(text("ALTER TABLE product_categories DROP CONSTRAINT IF EXISTS product_categories_name_key;"))
    print("Done.")
