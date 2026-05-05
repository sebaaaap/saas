from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()
url = os.getenv("DATABASE_URL")
engine = create_engine(url)

with engine.connect() as conn:
    schemas = conn.execute(text("SELECT schema_name FROM information_schema.schemata;")).fetchall()
    print("Schemas:", [s[0] for s in schemas])
    tables_default = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='default';")).fetchall()
    print("Tablas en schema 'default':", [t[0] for t in tables_default])
    tables_public = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")).fetchall()
    print("Tablas en schema 'public':", [t[0] for t in tables_public])
