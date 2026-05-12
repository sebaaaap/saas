"""
API de Gastos Rápidos (Modo Compra en PDV)
- CRUD de categorías de gasto
- Registro de gastos con método de pago
- Impacto en cuadratura de caja
"""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.api.deps import get_tenant_session
from app.db.tenant_session import TenantSession
from app.models.base import (
    Expense, ExpenseCategory, CashSession, PaymentMethod
)
from app.api.deps import check_roles, require_active_session

router = APIRouter()

# ── Schemas ────────────────────────────────────────────────────────────────

class ExpenseCategoryCreate(BaseModel):
    name: str
    color: Optional[str] = "#6366f1"
    icon: Optional[str] = "receipt"

class ExpenseCategoryResponse(BaseModel):
    id: UUID
    name: str
    color: Optional[str]
    icon: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True

class ExpenseCreate(BaseModel):
    category_id: UUID
    amount: float
    payment_method: str  # efectivo | tarjeta | transferencia
    glosa: Optional[str] = None

class ExpenseResponse(BaseModel):
    id: UUID
    category_id: UUID
    category_name: str
    amount: float
    payment_method: str
    glosa: Optional[str]
    date_created: datetime
    session_id: UUID

    class Config:
        from_attributes = True

# ── Expense Categories ─────────────────────────────────────────────────────

@router.get("/categories", response_model=List[ExpenseCategoryResponse])
def get_expense_categories(
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "vendedor"]))
):
    return db.tenant_query(ExpenseCategory).filter(ExpenseCategory.is_active == True).all()

@router.post("/categories", response_model=ExpenseCategoryResponse)
def create_expense_category(
    data: ExpenseCategoryCreate,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin"]))
):
    existing = db.tenant_query(ExpenseCategory).filter(ExpenseCategory.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una categoría con ese nombre")
    cat = ExpenseCategory(name=data.name, color=data.color, icon=data.icon)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

@router.put("/categories/{cat_id}", response_model=ExpenseCategoryResponse)
def update_expense_category(
    cat_id: UUID,
    data: ExpenseCategoryCreate,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin"]))
):
    cat = db.tenant_query(ExpenseCategory).filter(ExpenseCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    cat.name = data.name
    cat.color = data.color
    cat.icon = data.icon
    db.commit()
    db.refresh(cat)
    return cat

@router.delete("/categories/{cat_id}")
def delete_expense_category(
    cat_id: UUID,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin"]))
):
    cat = db.tenant_query(ExpenseCategory).filter(ExpenseCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    # Soft delete
    cat.is_active = False
    db.commit()
    return {"status": "ok"}

# ── Expenses ───────────────────────────────────────────────────────────────

@router.get("/", response_model=List[ExpenseResponse])
def get_expenses(
    session_id: Optional[UUID] = None,
    db: TenantSession = Depends(get_tenant_session),
    current_user = Depends(check_roles(["admin", "vendedor"]))
):
    q = db.tenant_query(Expense)
    if session_id:
        q = q.filter(Expense.session_id == session_id)
    expenses = q.order_by(Expense.date_created.desc()).limit(50).all()
    result = []
    for e in expenses:
        result.append({
            "id": e.id,
            "category_id": e.category_id,
            "category_name": e.category.name if e.category else "—",
            "amount": float(e.amount),
            "payment_method": e.payment_method,
            "glosa": e.glosa,
            "date_created": e.date_created,
            "session_id": e.session_id,
        })
    return result

@router.post("/", response_model=ExpenseResponse)
def create_expense(
    data: ExpenseCreate,
    db: TenantSession = Depends(get_tenant_session),
    active_session: CashSession = Depends(require_active_session)
):
    """
    Registra un gasto desde el PDV.
    Descuenta del saldo de caja correspondiente según payment_method.
    """
    cat = db.tenant_query(ExpenseCategory).filter(ExpenseCategory.id == data.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    expense = Expense(
        category_id=data.category_id,
        amount=data.amount,
        payment_method=data.payment_method,
        glosa=data.glosa,
        session_id=active_session.id,
    )
    db.add(expense)

    # Impactar cuadratura de caja restando del acumulador correcto
    from decimal import Decimal as D
    amount_dec = D(str(data.amount))
    if data.payment_method == "efectivo":
        active_session.total_sales_cash = (active_session.total_sales_cash or D('0')) - amount_dec
    elif data.payment_method == "tarjeta":
        active_session.total_sales_card = (active_session.total_sales_card or D('0')) - amount_dec
    elif data.payment_method == "transferencia":
        active_session.total_sales_transfer = (active_session.total_sales_transfer or D('0')) - amount_dec

    # También actualizar el expected_balance
    active_session.expected_balance = (active_session.expected_balance or D('0')) - amount_dec

    db.commit()
    db.refresh(expense)

    return {
        "id": expense.id,
        "category_id": expense.category_id,
        "category_name": cat.name,
        "amount": float(expense.amount),
        "payment_method": expense.payment_method,
        "glosa": expense.glosa,
        "date_created": expense.date_created,
        "session_id": expense.session_id,
    }
