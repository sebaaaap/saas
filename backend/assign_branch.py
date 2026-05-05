from app.database import SessionLocal
from app.models.base import Branch, Product, StorageLocation, CashRegister, Ticket, Purchase, WorkOrder, Quote

db = SessionLocal()

# Check if a branch exists
main_branch = db.query(Branch).filter(Branch.is_default == True).first()
if not main_branch:
    main_branch = db.query(Branch).first()

if not main_branch:
    main_branch = Branch(name="Casa Matriz (Principal)", is_active=True, is_default=True)
    db.add(main_branch)
    db.commit()
    db.refresh(main_branch)

print(f"Assigning NULL branch_ids to Branch: {main_branch.name} (ID: {main_branch.id})")

models_to_update = [Product, StorageLocation, CashRegister, Ticket, Purchase, WorkOrder, Quote]

for model in models_to_update:
    updated = db.query(model).filter(model.branch_id == None).update({"branch_id": main_branch.id}, synchronize_session=False)
    print(f"Updated {updated} records for {model.__name__}")

db.commit()
print("Done.")
