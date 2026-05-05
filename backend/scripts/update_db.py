#!/usr/bin/env python3
"""
Script simple para actualizar la base de datos SQLite con las nuevas columnas
"""
import sys
import os
import sqlite3

# Path a la base de datos
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "local_pos.db")

def update_database():
    """Agrega las columnas state y notes a la tabla purchases si no existen"""
    
    if not os.path.exists(DB_PATH):
        print(f"⚠️  Base de datos no encontrada en: {DB_PATH}")
        print("   Se creará automáticamente al iniciar el servidor")
        return
    
    print(f"📂 Conectando a: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Verificar si la columna state existe
        cursor.execute("PRAGMA table_info(purchases)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'state' not in columns:
            print("➕ Agregando columna 'state' a tabla purchases...")
            cursor.execute("""
                ALTER TABLE purchases 
                ADD COLUMN state VARCHAR DEFAULT 'DRAFT' NOT NULL
            """)
            print("   ✅ Columna 'state' agregada")
        else:
            print("   ℹ️  Columna 'state' ya existe")
        
        if 'notes' not in columns:
            print("➕ Agregando columna 'notes' a tabla purchases...")
            cursor.execute("""
                ALTER TABLE purchases 
                ADD COLUMN notes VARCHAR
            """)
            print("   ✅ Columna 'notes' agregada")
        else:
            print("   ℹ️  Columna 'notes' ya existe")
        
        conn.commit()
        print("\n✅ Base de datos actualizada correctamente")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🔧 ACTUALIZACIÓN DE BASE DE DATOS")
    print("="*60 + "\n")
    update_database()
    print("\n" + "="*60 + "\n")
