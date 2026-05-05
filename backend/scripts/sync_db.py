import sys
import os
from pathlib import Path

# Agregar el directorio padre al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.database import engine
from app.models.base import Base

def sync():
    print("🔄 Sincronizando base de datos...")
    
    with engine.begin() as conn:
        # Asegurar que el esquema 'default' existe
        conn.execute(text('CREATE SCHEMA IF NOT EXISTS "default";'))
        print("✅ Esquema 'default' verificado.")
        
        # Establecer el esquema para la creación de tablas
        conn.execute(text('SET search_path TO "default", public;'))
        
        # Crear tablas faltantes
        Base.metadata.create_all(bind=conn)
        print("✅ Tablas creadas/verificadas.")
        
        # Actualizar columnas de cash_sessions si es necesario
        # (SQLAlchemy create_all no agrega columnas a tablas existentes)
        try:
            # Agregar columnas nuevas a cash_sessions si no existen
            conn.execute(text('ALTER TABLE public.cash_sessions ADD COLUMN IF NOT EXISTS cash_register_id UUID;'))
            conn.execute(text('ALTER TABLE public.cash_sessions ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE;'))
            conn.execute(text('ALTER TABLE public.cash_sessions ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;'))
            conn.execute(text('ALTER TABLE public.cash_sessions ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT \'open\';'))
            conn.execute(text('ALTER TABLE public.cash_sessions ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(12, 2) DEFAULT 0.0;'))
            conn.execute(text('ALTER TABLE public.cash_sessions ADD COLUMN IF NOT EXISTS closing_balance NUMERIC(12, 2);'))
            conn.execute(text('ALTER TABLE public.cash_sessions ADD COLUMN IF NOT EXISTS expected_balance NUMERIC(12, 2) DEFAULT 0.0;'))
            conn.execute(text('ALTER TABLE public.cash_sessions ADD COLUMN IF NOT EXISTS user_id VARCHAR;'))
            
            # Hacer cash_register_id obligatorio si ya se agregaron columnas
            # Nota: Esto podría fallar si hay datos existentes sin cash_register_id
            # conn.execute(text('ALTER TABLE public.cash_sessions ALTER COLUMN cash_register_id SET NOT NULL;'))
            
            # Actualizar Ticket.session_id a NOT NULL
            conn.execute(text('ALTER TABLE public.tickets ALTER COLUMN session_id SET NOT NULL;'))

            # Agregar mileage a quotes
            conn.execute(text('ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS mileage NUMERIC(12, 2);'))
            
            # Agregar columna done a work_order_items para persistencia de progreso OT
            conn.execute(text('ALTER TABLE public.work_order_items ADD COLUMN IF NOT EXISTS done BOOLEAN DEFAULT FALSE NOT NULL;'))
            
            print("✅ Columnas de cash_sessions, tickets, quotes y work_order_items actualizadas.")
        except Exception as e:
            print(f"⚠️ Nota sobre columnas: {e}")

    print("🚀 Sincronización finalizada.")

if __name__ == "__main__":
    sync()
