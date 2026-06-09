import psycopg2
import sys

URL = "postgresql://postgres.ttwegmwxgaaygdxqgxwv:basepruebas123@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

sql_statements = [
    "ALTER TABLE products ALTER COLUMN stock_quantity TYPE NUMERIC(12, 4);",
    "ALTER TABLE products ALTER COLUMN min_stock TYPE NUMERIC(12, 4);",
    "ALTER TABLE sale_items ALTER COLUMN quantity TYPE NUMERIC(12, 4);",
    "ALTER TABLE sale_items ALTER COLUMN stock_reduced TYPE NUMERIC(12, 4);",
    "ALTER TABLE inventory_movement_items ALTER COLUMN quantity TYPE NUMERIC(12, 4);",
    "ALTER TABLE inventory_movement_items ALTER COLUMN stock_before TYPE NUMERIC(12, 4);",
    "ALTER TABLE inventory_movement_items ALTER COLUMN stock_after TYPE NUMERIC(12, 4);",
    "ALTER TABLE purchase_items ALTER COLUMN quantity TYPE NUMERIC(12, 4);",
    "ALTER TABLE work_order_components ALTER COLUMN quantity TYPE NUMERIC(12, 4);",
    "ALTER TABLE quote_items ALTER COLUMN quantity TYPE NUMERIC(12, 4);"
]

try:
    conn = psycopg2.connect(URL)
    conn.autocommit = True
    cursor = conn.cursor()
    for sql in sql_statements:
        print(f"Executing: {sql}")
        try:
            cursor.execute(sql)
            print("Success")
        except Exception as e:
            print(f"Error on {sql}: {e}")
    cursor.close()
    conn.close()
    print("All done.")
except Exception as e:
    print(f"Connection failed: {e}")
