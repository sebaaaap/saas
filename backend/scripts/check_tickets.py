from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'tickets' AND table_schema = 'default' AND column_name = 'session_id'"))
    for r in res:
        print(f"{r.column_name}: Nullable={r.is_nullable}")
