from sqlalchemy import Column, String, Boolean
from app.models.base import BaseModel

class Company(BaseModel):
    __tablename__ = "companies"
    
    name = Column(String, index=True, nullable=False)
    business_name = Column(String, nullable=True)
    tax_id = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    subscription_plan = Column(String, default="free")
