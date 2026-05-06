import sys
import os
sys.path.append(os.getcwd())

from sqlalchemy import create_engine, select, Column, Integer, String, event, ForeignKey
from sqlalchemy.orm import declarative_base, Session, with_loader_criteria
import contextvars

Base = declarative_base()

class TenantModel(Base):
    __abstract__ = True
    company_id = Column(Integer)

class User(TenantModel):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String)

class Product(TenantModel):
    __tablename__ = 'products'
    id = Column(Integer, primary_key=True)
    name = Column(String)
    user_id = Column(Integer, ForeignKey('users.id'))

engine = create_engine('sqlite:///:memory:')
Base.metadata.create_all(engine)

current_company_id = contextvars.ContextVar('current_company_id', default=None)

@event.listens_for(Session, "do_orm_execute")
def _add_tenant_filter(execute_state):
    company_id = current_company_id.get()
    if company_id is None:
        return
        
    if execute_state.is_select :
        execute_state.statement = execute_state.statement.options(
            with_loader_criteria(
                TenantModel,
                lambda cls: cls.company_id == company_id,
                include_aliases=True
            )
        )

@event.listens_for(Session, "before_flush")
def receive_before_flush(session, flush_context, instances):
    company_id = current_company_id.get()
    if not company_id:
        return
    for instance in session.new:
        if isinstance(instance, TenantModel):
            if not getattr(instance, 'company_id', None):
                instance.company_id = company_id

with Session(engine) as session:
    session.add_all([
        User(id=1, company_id=1, name="User A"), User(id=2, company_id=2, name="User B"),
        Product(id=1, company_id=1, name="Prod A", user_id=1), Product(id=2, company_id=2, name="Prod B", user_id=2)
    ])
    session.commit()

with Session(engine) as session:
    current_company_id.set(1)
    
    # Test read
    users = session.query(User).all()
    print("Users for company 1:", [u.name for u in users])
    
    products = session.query(Product).join(User).all()
    print("Products for company 1:", [p.name for p in products])
    
    # Test insert
    new_user = User(id=3, name="User A2")
    session.add(new_user)
    session.commit()
    
    print("New user company_id:", new_user.company_id)
