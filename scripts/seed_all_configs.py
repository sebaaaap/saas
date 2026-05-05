from uuid import uuid4
from app.database import SessionLocal
from app.models.base import PaymentMethodConfig, ExpenseCategory

def seed():
    db = SessionLocal()
    try:
        # 1. Payment Methods
        methods = [
            {"name": "Efectivo", "key": "efectivo", "icon": "Banknote", "description": "Pago en efectivo moneda local"},
            {"name": "Tarjeta", "key": "tarjeta", "icon": "CreditCard", "description": "Pago con tarjeta Débito/Crédito"},
            {"name": "Transferencia", "key": "transferencia", "icon": "Landmark", "description": "Transferencia bancaria directa"},
            {"name": "Crédito Interno", "key": "credito_interno", "icon": "UserCheck", "description": "Crédito otorgado al cliente"},
        ]

        for m in methods:
            exists = db.query(PaymentMethodConfig).filter(PaymentMethodConfig.key == m["key"]).first()
            if not exists:
                db.add(PaymentMethodConfig(**m))
                print(f"Added payment method: {m['name']}")

        # 2. Expense Categories
        categories = [
            {"name": "Propina", "color": "#10b981", "icon": "receipt"},
            {"name": "Abono", "color": "#3b82f6", "icon": "receipt"},
            {"name": "Repuesto imprevisto", "color": "#f59e0b", "icon": "receipt"},
            {"name": "Comida / Colación", "color": "#ef4444", "icon": "receipt"},
            {"name": "Insumos Taller", "color": "#8b5cf6", "icon": "receipt"},
            {"name": "Otro", "color": "#6b7280", "icon": "receipt"},
        ]

        for c in categories:
            exists = db.query(ExpenseCategory).filter(ExpenseCategory.name == c["name"]).first()
            if not exists:
                db.add(ExpenseCategory(**c))
                print(f"Added expense category: {c['name']}")

        db.commit()
    except Exception as e:
        print(f"Error seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
