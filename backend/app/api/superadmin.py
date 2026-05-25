"""
Super Admin API
Accessible ONLY for the platform owner (superadmin role).
Manages all tenants (companies), their users, metrics, and onboarding.
"""
import uuid
from uuid import UUID
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, text
import os
import shutil
from pathlib import Path
from pydantic import BaseModel, EmailStr

from app.database import get_db_session
from app.models.base import (
    Company, User, UserRole, Branch, CashRegister,
    Ticket, SaleState, CashSession
)
from app.core import security
from app.services.tenant_service import initialize_tenant_defaults
from app.api.deps import get_current_user

router = APIRouter()

# ─── Guard: only superadmin ────────────────────────────────────────────────

def require_superadmin(current_user: User = Depends(get_current_user)) -> User:
    """Only users with role='superadmin' OR the first platform user can access these endpoints."""
    user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if user_role != "superadmin" and current_user.company_id is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Solo el super administrador de la plataforma puede acceder aquí."
        )
    return current_user

# ─── Schemas ───────────────────────────────────────────────────────────────

class TenantCreate(BaseModel):
    # Company info
    company_name: str
    business_name: Optional[str] = None
    tax_id: Optional[str] = None
    company_email: Optional[str] = None
    company_phone: Optional[str] = None
    subscription_plan: str = "free"
    logo_url: Optional[str] = None
    # First branch
    branch_name: str = "Casa Matriz"
    branch_address: Optional[str] = None
    # Admin user
    admin_username: str
    admin_password: str
    admin_full_name: str
    admin_email: Optional[str] = None

class TenantUpdate(BaseModel):
    company_name: Optional[str] = None
    business_name: Optional[str] = None
    tax_id: Optional[str] = None
    company_email: Optional[str] = None
    subscription_plan: Optional[str] = None
    is_active: Optional[bool] = None

class CompanyMetrics(BaseModel):
    company_id: str
    company_name: str
    is_active: bool
    subscription_plan: str
    created_at: datetime
    total_users: int
    total_branches: int
    total_sales_month: int
    total_revenue_month: float
    last_sale_at: Optional[datetime]
    last_login_at: Optional[datetime]

class TenantDetail(BaseModel):
    id: str
    name: str
    business_name: Optional[str]
    tax_id: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    is_active: bool
    subscription_plan: str
    created_at: datetime
    admin_username: Optional[str]
    admin_email: Optional[str]
    branches: List[dict]
    metrics: dict

# ─── Endpoints ─────────────────────────────────────────────────────────────

@router.get("/tenants", response_model=List[dict])
def list_tenants(
    db: Session = Depends(get_db_session),
    _: User = Depends(require_superadmin)
):
    """List all companies with basic metrics."""
    companies = db.query(Company).order_by(Company.created_at.desc()).all()
    
    result = []
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    for company in companies:
        # Users count
        total_users = db.query(func.count(User.id)).filter(
            User.company_id == company.id
        ).scalar() or 0

        # Branches count
        total_branches = db.query(func.count(Branch.id)).filter(
            Branch.company_id == company.id
        ).scalar() or 0

        # Monthly sales
        monthly_sales = db.query(
            func.count(Ticket.id),
            func.coalesce(func.sum(Ticket.total_amount), 0)
        ).filter(
            Ticket.company_id == company.id,
            Ticket.state.in_([SaleState.PAID, SaleState.VALIDATED]),
            Ticket.date_created >= month_start
        ).first()

        # Last sale
        last_ticket = db.query(Ticket.date_created).filter(
            Ticket.company_id == company.id,
            Ticket.state.in_([SaleState.PAID, SaleState.VALIDATED])
        ).order_by(Ticket.date_created.desc()).first()

        # Admin user
        admin = db.query(User).filter(
            User.company_id == company.id,
            User.role == UserRole.admin
        ).first()

        result.append({
            "id": str(company.id),
            "name": company.name,
            "business_name": company.business_name,
            "tax_id": company.tax_id,
            "email": company.email,
            "phone": company.phone,
            "is_active": company.is_active,
            "subscription_plan": company.subscription_plan,
            "created_at": company.created_at.isoformat(),
            "total_users": total_users,
            "total_branches": total_branches,
            "sales_this_month": monthly_sales[0] if monthly_sales else 0,
            "revenue_this_month": float(monthly_sales[1]) if monthly_sales else 0.0,
            "last_sale_at": last_ticket[0].isoformat() if last_ticket and last_ticket[0] else None,
            "admin_username": admin.username if admin else None,
            "admin_email": admin.email if admin else None,
        })
    
    return result


@router.get("/tenants/{company_id}", response_model=dict)
def get_tenant_detail(
    company_id: UUID,
    db: Session = Depends(get_db_session),
    _: User = Depends(require_superadmin)
):
    """Get full detail of a single company."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    branches = db.query(Branch).filter(Branch.company_id == company_id).all()
    users = db.query(User).filter(User.company_id == company_id).all()
    registers = db.query(CashRegister).filter(CashRegister.company_id == company_id).all()

    # Last 6 months sales breakdown
    monthly_data = []
    for i in range(5, -1, -1):
        month_dt = datetime.utcnow().replace(day=1) - timedelta(days=30 * i)
        month_start = month_dt.replace(day=1, hour=0, minute=0, second=0)
        month_end = (month_start + timedelta(days=32)).replace(day=1)
        
        sales_data = db.query(
            func.count(Ticket.id),
            func.coalesce(func.sum(Ticket.total_amount), 0)
        ).filter(
            Ticket.company_id == company_id,
            Ticket.state.in_([SaleState.PAID, SaleState.VALIDATED]),
            Ticket.date_created >= month_start,
            Ticket.date_created < month_end
        ).first()

        monthly_data.append({
            "month": month_start.strftime("%b %Y"),
            "sales": sales_data[0] if sales_data else 0,
            "revenue": float(sales_data[1]) if sales_data else 0.0,
        })

    return {
        "id": str(company.id),
        "name": company.name,
        "business_name": company.business_name,
        "tax_id": company.tax_id,
        "email": company.email,
        "phone": company.phone,
        "is_active": company.is_active,
        "subscription_plan": company.subscription_plan,
        "created_at": company.created_at.isoformat(),
        "branches": [{"id": str(b.id), "name": b.name, "is_active": b.is_active} for b in branches],
        "users": [{"id": str(u.id), "username": u.username, "full_name": u.full_name, "role": u.role.value, "is_active": u.is_active} for u in users],
        "cash_registers": [{"id": str(r.id), "name": r.name} for r in registers],
        "monthly_data": monthly_data,
    }


@router.post("/upload-logo")
def upload_logo(
    file: UploadFile = File(...),
    _: User = Depends(require_superadmin)
):
    from app.core.config import settings
    from supabase import create_client, Client
    import uuid
    import mimetypes

    """Uploads a logo image to Supabase Storage."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")
        
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase credentials not configured")

    supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"{uuid.uuid4().hex}.{ext}"
    
    # Upload to Supabase Storage
    try:
        file_bytes = file.file.read()
        res = supabase.storage.from_("logos").upload(
            path=filename,
            file=file_bytes,
            file_options={"content-type": file.content_type}
        )
        
        # Get public URL
        public_url = supabase.storage.from_("logos").get_public_url(filename)
        return {"logo_url": public_url}
    except Exception as e:
        print(f"Error uploading to supabase: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload image")


@router.post("/tenants", response_model=dict, status_code=201)
def create_tenant(
    data: TenantCreate,
    db: Session = Depends(get_db_session),
    _: User = Depends(require_superadmin)
):
    """
    Create a new tenant (company) with:
    - A default branch (Casa Matriz)
    - An admin user
    - Default expense categories, payment methods, and a cash register
    """
    # 1. Check company name uniqueness
    existing = db.query(Company).filter(Company.name == data.company_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una empresa con ese nombre")

    # 2. Check username and email uniqueness globally
    existing_user = db.query(User).filter(User.username == data.admin_username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")
        
    if data.admin_email:
        existing_email = db.query(User).filter(User.email == data.admin_email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")

    # 3. Create Company
    company = Company(
        name=data.company_name,
        business_name=data.business_name,
        tax_id=data.tax_id,
        email=data.company_email,
        phone=data.company_phone,
        subscription_plan=data.subscription_plan,
        logo_url=data.logo_url,
        is_active=True
    )
    db.add(company)
    db.flush()  # Get company.id

    # 4. Create default Branch
    branch = Branch(
        company_id=company.id,
        name=data.branch_name,
        address=data.branch_address,
        is_active=True,
        is_default=True
    )
    db.add(branch)
    db.flush()

    # 5. Create admin User
    admin_user = User(
        company_id=company.id,
        username=data.admin_username,
        email=data.admin_email,
        full_name=data.admin_full_name,
        hashed_password=security.get_password_hash(data.admin_password),
        role=UserRole.admin,
        is_active=True
    )
    db.add(admin_user)
    db.flush()

    # 6. Initialize defaults (expense cats, payment methods, caja principal)
    initialize_tenant_defaults(db, company.id)

    db.commit()

    return {
        "id": str(company.id),
        "name": company.name,
        "admin_username": data.admin_username,
        "message": f"Empresa '{company.name}' creada exitosamente con usuario admin '{data.admin_username}'"
    }


@router.patch("/tenants/{company_id}", response_model=dict)
def update_tenant(
    company_id: UUID,
    data: TenantUpdate,
    db: Session = Depends(get_db_session),
    _: User = Depends(require_superadmin)
):
    """Update company info or toggle active status."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(company, field, value)

    db.commit()
    db.refresh(company)
    return {"id": str(company.id), "name": company.name, "is_active": company.is_active}


@router.post("/tenants/{company_id}/reset-password", response_model=dict)
def reset_admin_password(
    company_id: UUID,
    new_password: str,
    db: Session = Depends(get_db_session),
    _: User = Depends(require_superadmin)
):
    """Reset the admin password for a tenant."""
    admin = db.query(User).filter(
        User.company_id == company_id,
        User.role == UserRole.admin
    ).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin no encontrado para esta empresa")

    admin.hashed_password = security.get_password_hash(new_password)
    db.commit()
    return {"message": f"Contraseña del admin '{admin.username}' actualizada correctamente"}


@router.get("/metrics/overview", response_model=dict)
def platform_overview(
    db: Session = Depends(get_db_session),
    _: User = Depends(require_superadmin)
):
    """High-level platform metrics for the super admin dashboard."""
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_companies = db.query(func.count(Company.id)).scalar() or 0
    active_companies = db.query(func.count(Company.id)).filter(Company.is_active == True).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    
    total_sales_month = db.query(func.count(Ticket.id)).filter(
        Ticket.state.in_([SaleState.PAID, SaleState.VALIDATED]),
        Ticket.date_created >= month_start
    ).scalar() or 0

    total_revenue_month = db.query(func.coalesce(func.sum(Ticket.total_amount), 0)).filter(
        Ticket.state.in_([SaleState.PAID, SaleState.VALIDATED]),
        Ticket.date_created >= month_start
    ).scalar() or 0

    # Active sessions right now
    active_sessions = db.query(func.count(CashSession.id)).filter(
        CashSession.status == "open"
    ).scalar() or 0

    # Sales last 7 days
    week_data = []
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).date()
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        count = db.query(func.count(Ticket.id)).filter(
            Ticket.state.in_([SaleState.PAID, SaleState.VALIDATED]),
            Ticket.date_created >= day_start,
            Ticket.date_created <= day_end
        ).scalar() or 0
        week_data.append({"day": day.strftime("%a %d"), "sales": count})

    return {
        "total_companies": total_companies,
        "active_companies": active_companies,
        "inactive_companies": total_companies - active_companies,
        "total_users": total_users,
        "active_sessions_now": active_sessions,
        "sales_this_month": total_sales_month,
        "revenue_this_month": float(total_revenue_month),
        "sales_last_7_days": week_data,
    }
