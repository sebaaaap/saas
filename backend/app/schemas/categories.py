from uuid import UUID
from pydantic import BaseModel
from typing import List, Optional

class CategoryBase(BaseModel):
    name: str
    color: Optional[str] = None
    parent_id: Optional[UUID] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[UUID] = None

class CategoryResponse(BaseModel):
    id: UUID
    name: str
    color: Optional[str] = None
    parent_id: Optional[UUID] = None
    full_path: Optional[str] = None
    
    class Config:
        from_attributes = True
