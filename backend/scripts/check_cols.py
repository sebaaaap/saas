from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cash_sessions' AND table_schema = 'default'"))
    for r in res:
        print(f"{r.column_name}: {r.data_type}")
