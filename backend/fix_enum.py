from sqlalchemy import create_engine, text
engine = create_engine("postgresql://admin:password123@localhost:5432/pos_db")
with engine.connect() as conn:
    conn.execute(text("ALTER TYPE movementtype ADD VALUE IF NOT EXISTS 'BRANCH_TRANSFER_OUT';"))
    conn.execute(text("ALTER TYPE movementtype ADD VALUE IF NOT EXISTS 'BRANCH_TRANSFER_IN';"))
    conn.commit()
    print("Enum values added.")
