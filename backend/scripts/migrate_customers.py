import sqlite3
import os

DB_PATH = "local_pos_new.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        print("Creating table customers...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                rut TEXT UNIQUE NOT NULL,
                address TEXT,
                phone TEXT,
                email TEXT
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_customers_id ON customers (id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_customers_name ON customers (name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_customers_rut ON customers (rut)")

        print("Creating table vehicles...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vehicles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_plate TEXT UNIQUE NOT NULL,
                brand TEXT,
                model TEXT,
                year INTEGER,
                vehicle_type TEXT DEFAULT 'automovil',
                color TEXT,
                vin TEXT,
                customer_id INTEGER NOT NULL,
                FOREIGN KEY (customer_id) REFERENCES customers (id)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_vehicles_id ON vehicles (id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_vehicles_license_plate ON vehicles (license_plate)")

        print("Updating table tickets...")
        cursor.execute("PRAGMA table_info(tickets)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if "customer_id" not in columns:
            print("Adding customer_id to tickets...")
            cursor.execute("ALTER TABLE tickets ADD COLUMN customer_id INTEGER REFERENCES customers (id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_tickets_customer_id ON tickets (customer_id)")
        
        if "vehicle_id" not in columns:
            print("Adding vehicle_id to tickets...")
            cursor.execute("ALTER TABLE tickets ADD COLUMN vehicle_id INTEGER REFERENCES vehicles (id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_tickets_vehicle_id ON tickets (vehicle_id)")

        conn.commit()
        print("Migration completed successfully.")
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
