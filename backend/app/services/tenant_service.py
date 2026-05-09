from sqlalchemy.orm import Session
from uuid import UUID
from app.models.base import ExpenseCategory, PaymentMethodConfig, CashRegister, Branch

def initialize_tenant_defaults(db: Session, company_id: UUID):
    """
    Initializes default data for a new company/tenant.
    This includes default expense categories, payment methods, and a default cash register.
    """
    
    # 1. Default Expense Categories
    default_expense_categories = [
        {"name": "Propina", "color": "bg-emerald-500", "icon": "receipt", "is_active": True},
        {"name": "Abono", "color": "bg-blue-500", "icon": "receipt", "is_active": True},
        {"name": "Repuesto imprevisto", "color": "bg-amber-500", "icon": "receipt", "is_active": True},
        {"name": "Comida / Colación", "color": "bg-red-500", "icon": "receipt", "is_active": True},
        {"name": "Insumos Taller", "color": "bg-purple-500", "icon": "receipt", "is_active": True},
        {"name": "Otro", "color": "bg-slate-500", "icon": "receipt", "is_active": True},
    ]

    for cat_data in default_expense_categories:
        existing = db.query(ExpenseCategory).filter(
            ExpenseCategory.company_id == company_id,
            ExpenseCategory.name == cat_data["name"]
        ).first()
        if not existing:
            db.add(ExpenseCategory(company_id=company_id, **cat_data))

    # 2. Default Payment Methods
    default_payment_methods = [
        {"name": "Crédito Interno", "key": "credito_interno", "icon": "user-check", "description": "Línea de crédito para clientes", "is_active": True},
        {"name": "Transferencia", "key": "TRANSFERENCIA", "icon": "smartphone", "description": "Transferencia electrónica bancaria", "is_active": True},
        {"name": "Tarjeta", "key": "TARJETA", "icon": "credit-card", "description": "Crédito o Débito (Transbank/Otros)", "is_active": True},
        {"name": "Efectivo", "key": "EFECTIVO", "icon": "wallet", "description": "Pago en efectivo moneda nacional", "is_active": True},
    ]

    for pm_data in default_payment_methods:
        existing = db.query(PaymentMethodConfig).filter(
            PaymentMethodConfig.company_id == company_id,
            PaymentMethodConfig.key == pm_data["key"]
        ).first()
        if not existing:
            db.add(PaymentMethodConfig(company_id=company_id, **pm_data))

    # 3. Default Cash Register (Needs a Branch)
    # Check if there's any branch for the company. If not, maybe create a default one or skip?
    # Since the user requested "at least one caja named Caja Principal", we need a branch first.
    default_branch = db.query(Branch).filter(Branch.company_id == company_id).first()
    if not default_branch:
        default_branch = Branch(
            company_id=company_id,
            name="Sucursal Principal",
            is_active=True
        )
        db.add(default_branch)
        db.flush() # To get the ID
        
    existing_register = db.query(CashRegister).filter(
        CashRegister.company_id == company_id,
        CashRegister.name == "Caja Principal"
    ).first()
    
    if not existing_register:
        db.add(CashRegister(
            company_id=company_id,
            branch_id=default_branch.id,
            name="Caja Principal",
            description="Caja por defecto del sistema",
            is_active=True
        ))

    db.flush()
    print(f"Defaults initialized for company {company_id}")
