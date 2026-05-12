"""
Reset de contraseñas en LOCAL y PRODUCCIÓN (Supabase).
Uso: python reset_passwords.py

Requiere la contraseña de la DB de Supabase.
Cómbiala en SUPABASE_DB_PASSWORD abajo.
"""
import os
from passlib.context import CryptContext
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
# 1. Contraseña de tu DB de Supabase (la que usas en el dashboard)
SUPABASE_DB_PASSWORD = "TU_PASSWORD_SUPABASE_AQUI"   # <── cambia esto

# 2. Nuevas contraseñas para cada usuario
new_passwords = {
    "superadmin":     "SuperAdmin2024!",
    "admin":          "Admin2024!",
    "cliente_b":      "ClienteB2024!",
    "cliente_c":      "ClienteC2024!",
    "cliente_prueba": "Prueba2024!",
}
# ─────────────────────────────────────────────────────────────────────────────

# URLs de conexión
LOCAL_DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://admin:password123@localhost:5432/pos_db"
)

# Supabase usa el project ref: ttwegmwxgaaygdxqgxwv
PROD_DB_URL = (
    f"postgresql://postgres:{SUPABASE_DB_PASSWORD}"
    f"@db.ttwegmwxgaaygdxqgxwv.supabase.co:5432/postgres"
)


def reset_passwords(label: str, db_url: str):
    print(f"\n{'='*50}")
    print(f"  📦  {label}")
    print(f"{'='*50}")
    try:
        engine = create_engine(db_url, connect_args={"connect_timeout": 10})
        with engine.begin() as conn:
            for username, password in new_passwords.items():
                hashed = pwd_context.hash(password)
                result = conn.execute(
                    text("UPDATE users SET hashed_password = :hash WHERE username = :user"),
                    {"hash": hashed, "user": username}
                )
                status = "✅" if result.rowcount else "⚠️  (no encontrado)"
                print(f"  {status}  {username:20s}  →  {password}")
    except Exception as e:
        print(f"  ❌  Error conectando: {e}")


if __name__ == "__main__":
    reset_passwords("LOCAL (localhost:5432)", LOCAL_DB_URL)

    if "TU_PASSWORD_SUPABASE_AQUI" in PROD_DB_URL:
        print("\n⚠️  Skipping producción: edita SUPABASE_DB_PASSWORD en reset_passwords.py primero.")
    else:
        reset_passwords("PRODUCCIÓN (Supabase)", PROD_DB_URL)

    print("\n\n📋 CREDENCIALES FINALES:")
    print(f"{'─'*40}")
    for user, pwd in new_passwords.items():
        print(f"  {user:20s}  /  {pwd}")
    print(f"{'─'*40}")
    print("✅ Listo.\n")
