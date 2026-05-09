import sys
import os
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models.base import Company, User, Branch
from app.services.tenant_service import initialize_tenant_defaults

db = SessionLocal()
try:
    # Check if we have a default company
    company = db.query(Company).filter(Company.name == "Mi Primera Empresa SaaS").first()
    if not company:
        company = Company(
            name="Mi Primera Empresa SaaS",
            business_name="Vankai Labs Demo",
            email="admin@saas.com"
        )
        db.add(company)
        db.commit()
        db.refresh(company)
        print("Company created:", company.id)
    else:
        print("Company exists:", company.id)
        
    # Initialize defaults for this company (Expenses, Payment Methods, Cash Register)
    initialize_tenant_defaults(db, company.id)
        
    # Assign admin to this company
    admin = db.query(User).filter(User.username == "admin").first()
    if admin and not admin.company_id:
        admin.company_id = company.id
        db.commit()
        print("Admin user assigned to company!")
        
    # Also assign all existing data to this company to avoid data loss
    from app.models.base import Branch, Product, Ticket, Customer, ProductCategory, Supplier, StorageLocation
    
    for branch in db.query(Branch).all():
        if not branch.company_id:
            branch.company_id = company.id
    
    for product in db.query(Product).all():
        if not product.company_id:
            product.company_id = company.id
            
    for ticket in db.query(Ticket).all():
        if not ticket.company_id:
            ticket.company_id = company.id
    
    for cat in db.query(ProductCategory).all():
        if not cat.company_id:
            cat.company_id = company.id
    
    for supplier in db.query(Supplier).all():
        if not supplier.company_id:
            supplier.company_id = company.id
    
    for loc in db.query(StorageLocation).all():
        if not loc.company_id:
            loc.company_id = company.id
            
    db.commit()
    print("All existing data migrated to the first tenant successfully!")

except Exception as e:
    print("Error:", e)
    db.rollback()
finally:
    db.close()
