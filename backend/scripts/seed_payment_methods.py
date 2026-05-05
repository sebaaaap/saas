from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.base import PaymentMethodConfig

def seed_payment_methods():
    db = SessionLocal()
    try:
        defaults = [
            {"name": "Efectivo", "key": "efectivo", "icon": "Wallet", "description": "Pago en efectivo moneda nacional"},
            {"name": "Tarjeta", "key": "tarjeta", "icon": "CreditCard", "description": "Crédito o Débito (Transbank/Otros)"},
            {"name": "Transferencia", "key": "transferencia", "icon": "Smartphone", "description": "Transferencia electrónica bancaria"},
            {"name": "Crédito Interno", "key": "credito_interno", "icon": "UserCheck", "description": "Deuda acumulada por el cliente"},
        ]
        
        for d in defaults:
            exists = db.query(PaymentMethodConfig).filter(PaymentMethodConfig.key == d["key"]).first()
            if not exists:
                pm = PaymentMethodConfig(**d)
                db.add(pm)
        
        db.commit()
        print("✅ Métodos de pago inicializados correctamente.")
    except Exception as e:
        print(f"❌ Error al inicializar métodos de pago: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_payment_methods()
