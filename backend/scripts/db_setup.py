#!/usr/bin/env python3
"""
Script para aplicar migraciones y preparar la base de datos
"""
import sys
import os

# Agregar el directorio raíz al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from alembic.config import Config
from alembic import command
from app.models.base import Base
from app.db.session import engine

def run_migrations():
    """Ejecuta las migraciones de Alembic"""
    print("🔄 Aplicando migraciones...")
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
    print("✅ Migraciones aplicadas correctamente")

def create_tables():
    """Crea todas las tablas (alternativa si no hay migraciones)"""
    print("🔄 Creando tablas...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tablas creadas correctamente")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Gestión de base de datos")
    parser.add_argument("--migrate", action="store_true", help="Aplicar migraciones")
    parser.add_argument("--create", action="store_true", help="Crear tablas directamente")
    
    args = parser.parse_args()
    
    if args.migrate:
        run_migrations()
    elif args.create:
        create_tables()
    else:
        print("Uso: python scripts/db_setup.py --migrate  o  --create")
