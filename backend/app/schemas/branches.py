from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class BranchBase(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True
    is_default: bool = False

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None

class BranchResponse(BranchBase):
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserBranchAccessCreate(BaseModel):
    user_id: str
    branch_id: UUID

class UserBranchAccessResponse(BaseModel):
    id: UUID
    user_id: str
    branch_id: UUID
    branch: BranchResponse
    
    class Config:
        from_attributes = True
