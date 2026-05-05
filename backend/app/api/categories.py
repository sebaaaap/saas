from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db_session
from app.models.base import ProductCategory
from app.schemas.categories import CategoryCreate, CategoryResponse, CategoryUpdate
from typing import List

import random
import colorsys

router = APIRouter()

PREDEFINED_PASTELS = [
    "#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF",
    "#D4A5FF", "#FFC8DD", "#CDB4DB", "#A2D2FF", "#BDE0FE",
    "#F1CBFF", "#E7FFAC", "#FFD1DC", "#AEEEEE", "#FFEFD5"
]

def generate_pastel_color():
    """Genera un color pastel aleatorio basado en HSL"""
    h = random.random()
    # Saturation entre 40-60%, Lightness entre 80-95%
    s = random.uniform(0.4, 0.6)
    l = random.uniform(0.8, 0.95)
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return '#%02x%02x%02x' % (int(r * 255), int(g * 255), int(b * 255))

@router.post("/", response_model=CategoryResponse)
def create_category(data: CategoryCreate, db: Session = Depends(get_db_session)):
    # Si ya trae color, lo usamos, si no, asignamos uno
    color = data.color
    if not color:
        # Obtener colores ya usados
        used_colors = [c.color for c in db.query(ProductCategory.color).all() if c.color]
        
        # Intentar con predefinidos que no estén usados
        available_predefined = [c for c in PREDEFINED_PASTELS if c not in used_colors]
        
        if available_predefined:
            color = random.choice(available_predefined)
        else:
            # Si no hay predefinidos disponibles, generar uno aleatorio
            color = generate_pastel_color()

    db_obj = ProductCategory(
        name=data.name,
        parent_id=data.parent_id,
        color=color
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/", response_model=List[CategoryResponse])
def list_categories(db: Session = Depends(get_db_session)):
    categories = db.query(ProductCategory).all()
    
    needs_commit = False
    used_colors = [c.color for c in categories if c.color]
    
    for cat in categories:
        if not cat.color:
            available_predefined = [c for c in PREDEFINED_PASTELS if c not in used_colors]
            if available_predefined:
                chosen = random.choice(available_predefined)
                cat.color = chosen
                used_colors.append(chosen)
            else:
                chosen = generate_pastel_color()
                cat.color = chosen
                used_colors.append(chosen)
            needs_commit = True
            
    if needs_commit:
        db.commit()
        
    return categories

@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(category_id: UUID, data: CategoryUpdate, db: Session = Depends(get_db_session)):
    db_obj = db.query(ProductCategory).filter(ProductCategory.id == category_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    if data.name is not None:
        db_obj.name = data.name
    if data.color is not None:
        db_obj.color = data.color
    if hasattr(data, 'parent_id') and data.parent_id is not None:
        db_obj.parent_id = data.parent_id
        
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.delete("/{category_id}")
def delete_category(category_id: UUID, db: Session = Depends(get_db_session)):
    db_obj = db.query(ProductCategory).filter(ProductCategory.id == category_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    try:
        db.delete(db_obj)
        db.commit()
        return {"detail": "Categoría eliminada"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="No se puede eliminar la categoría (podría estar en uso)")
