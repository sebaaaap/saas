import sqlite3
import os

db_path = "local_pos.db"

def migrate():
    if not os.path.exists(db_path):
        print(f"Error: No se encontró {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("Iniciando migración de base de datos...")

    try:
        # 1. Crear tabla de categorías si no existe
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS product_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                parent_id INTEGER,
                FOREIGN KEY (parent_id) REFERENCES product_categories (id)
            )
        ''')
        print("- Tabla 'product_categories' verificada/creada.")

        # 2. Añadir columnas nuevas a 'products'
        # Usamos try/except para cada una por si ya existen
        columns_to_add = [
            ("uom", "TEXT DEFAULT 'unidades'"),
            ("category_id", "INTEGER"),
            ("min_stock", "FLOAT DEFAULT 5")
        ]

        for col_name, col_type in columns_to_add:
            try:
                cursor.execute(f"ALTER TABLE products ADD COLUMN {col_name} {col_type}")
                print(f"- Columna '{col_name}' añadida a 'products'.")
            except sqlite3.OperationalError:
                print(f"- Columna '{col_name}' ya existe en 'products'.")

        # 3. Asegurar que stock_quantity sea manejado como FLOAT (SQLite lo permite dinámicamente)
        # No es necesario un alter table para cambiar tipo en SQLite, pero es bueno saberlo.

        conn.commit()
        print("✅ Migración completada con éxito.")
    except Exception as e:
        print(f"❌ Error durante la migración: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
