from app.database import engine
from sqlalchemy import text

def cleanup():
    print("🧹 Limpiando columnas obsoletas de cash_sessions...")
    
    obsolete_columns = [
        "name", "start_time", "end_time", "initial_cash", 
        "final_cash", "expected_cash", "is_open"
    ]
    
    with engine.begin() as conn:
        conn.execute(text('SET search_path TO "default", public;'))
        
        for col in obsolete_columns:
            try:
                # Verificar si la columna existe antes de intentar borrarla
                check_sql = text(f"""
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'cash_sessions' 
                    AND table_schema = 'default' 
                    AND column_name = '{col}';
                """)
                exists = conn.execute(check_sql).fetchone()
                
                if exists:
                    conn.execute(text(f'ALTER TABLE cash_sessions DROP COLUMN "{col}" CASCADE;'))
                    print(f"   ✅ Columna '{col}' eliminada.")
                else:
                    print(f"   ℹ️ Columna '{col}' no existe, saltando.")
            except Exception as e:
                print(f"   ⚠️ Error al eliminar '{col}': {e}")

    print("🚀 Limpieza finalizada.")

if __name__ == "__main__":
    cleanup()
