from uuid import UUID
from typing import Optional
from pydantic import BaseModel
from enum import Enum

class UserRole(str, Enum):
    superadmin = "superadmin"
    admin = "admin"
    vendedor = "vendedor"
    inventario = "inventario"

class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    phone: Optional[str] = None
    full_name: Optional[str] = None
    role: UserRole = UserRole.vendedor
    is_active: bool = True
    branch_id: Optional[UUID] = None  # Sucursal asignada al vendedor

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    branch_id: Optional[UUID] = None

class UserResponse(UserBase):
    id: UUID
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user_role: str
    username: str
    full_name: Optional[str] = None

class TokenData(BaseModel):
    username: Optional[str] = None
