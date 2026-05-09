from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pathlib import Path
import shutil
import uuid

from app.database import get_db_session
from app.models.base import Company, User
from app.api.deps import get_current_user
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    business_name: Optional[str] = None
    tax_id: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    logo_url: Optional[str] = None

@router.get("/me")
def get_my_company(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="El usuario no tiene una empresa asociada")
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    return company

@router.patch("/me")
def update_my_company(
    data: CompanyUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="El usuario no tiene una empresa asociada")
    
    # Solo el admin puede cambiar los datos de la empresa
    if str(current_user.role.value) != "admin":
        raise HTTPException(status_code=403, detail="Permisos insuficientes")

    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(company, key, value)
        
    db.commit()
    db.refresh(company)
    return company

@router.post("/me/logo")
def upload_my_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="El usuario no tiene una empresa asociada")
    
    if str(current_user.role.value) != "admin":
        raise HTTPException(status_code=403, detail="Permisos insuficientes")

    from app.core.config import settings
    from supabase import create_client, Client
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")
        
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase credentials not configured")

    supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"{uuid.uuid4().hex}.{ext}"
    
    try:
        file_bytes = file.file.read()
        res = supabase.storage.from_("logos").upload(
            path=filename,
            file=file_bytes,
            file_options={"content-type": file.content_type}
        )
        
        logo_url = supabase.storage.from_("logos").get_public_url(filename)
    except Exception as e:
        print(f"Error uploading to supabase: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload image")
    
    # Save it automatically to the company
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    company.logo_url = logo_url
    db.commit()
    
    return {"logo_url": logo_url}
