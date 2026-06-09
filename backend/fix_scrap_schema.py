import psycopg2
import sys

URL = "postgresql://postgres.ttwegmwxgaaygdxqgxwv:basepruebas123@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

sql_statements = [
    "ALTER TABLE products ADD COLUMN is_scrap BOOLEAN DEFAULT FALSE NOT NULL;",
    "ALTER TABLE products ADD COLUMN scrap_parent_id UUID REFERENCES products(id);"
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
