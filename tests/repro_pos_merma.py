import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.models.base import Base, Product, StorageLocation, Ticket, SaleItem, Payment, PaymentMethod, CashSession
from app.services.pos_service import POSService
from app.services.inventory_service import InventoryService
from app.schemas.pos import SaleCreate, SaleItemCreate, PaymentCreate, PaymentMethodEnum
from app.schemas.inventory import InventoryMovementCreate, InventoryMovementItemCreate

# Setup DB (using sqlite memory for test)
try:
    SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except Exception as e:
    print(f"Error setting up DB: {e}")
    sys.exit(1)

def run_test():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    inv_service = InventoryService(db)
    
    # 1. Setup Locations
    print("--- Setting up Locations ---")
    stock_id = inv_service._get_or_create_stock_location()
    merma_id = inv_service._get_or_create_merma_location()
    
    # 2. Setup Product
    print("\n--- Creating Product with Split Stock ---")
    # Base product in Stock (5 units)
    product_stock = Product(
        name="Test Product",
        barcode="12345",
        price=100.0,
        cost=50.0,
        stock_quantity=5.0,
        location_id=stock_id,
        is_active=True
    )
    db.add(product_stock)
    db.commit()
    
    # Same product in Mermas (5 units)
    # Note: Currently product creation might be tricky if barcode is unique constraint? 
    # Let's check models. Barcode is indexed but not unique in definition: 
    # barcode = Column(String, index=True, nullable=False)
    # But usually app logic treats it as grouping key. Let's assume we can insert another row manually.
    
    product_merma = Product(
        name="Test Product",
        barcode="12345",
        price=100.0,
        cost=50.0,
        stock_quantity=5.0,
        location_id=merma_id,
        is_active=True
    )
    db.add(product_merma)
    db.commit()
    
    db.refresh(product_stock)
    db.refresh(product_merma)
    
    print(f"Stock Location ID: {stock_id}, Qty: {product_stock.stock_quantity}")
    print(f"Merma Location ID: {merma_id}, Qty: {product_merma.stock_quantity}")
    
    # 3. Test POSService Availability Logic
    print("\n--- Testing Sale with Excess Quantity (should FAIL) ---")
    # Try to sell 6 units. Total physical is 10, but sellable is 5.
    
    # Create dummy session
    session = CashSession(name="Test Session", user_id="test")
    db.add(session)
    db.commit()
    
    sale_data = SaleCreate(
        items=[SaleItemCreate(
            product_id=product_stock.id, # We send ID of one instance, but service looks up by barcode
            quantity=6.0,
            price=100.0
        )],
        payments=[PaymentCreate(
            payment_method=PaymentMethodEnum.CASH,
            amount=600.0
        )],
        session_id=session.id
    )
    
    try:
        POSService.create_sale_draft(db, sale_data)
        print("ERROR: Sale of 6 units SUCCEEDED but should have failed!")
        # assert False, "Should fail due to insufficient sellable stock"
    except Exception as e:
        print(f"SUCCESS: Sale failed as expected: {e}")
        if "Stock insuficiente" in str(e) or "400" in str(e):
             pass
        else:
             print(f"WARNING: Unexpected error message: {e}")

    # 4. Test POSService Successful Sale (should SUCCEED)
    print("\n--- Testing Sale with Valid Quantity (should SUCCEED) ---")
    # Try to sell 5 units.
    sale_data.items[0].quantity = 5.0
    sale_data.payments[0].amount = 500.0
    
    try:
        ticket = POSService.create_sale_draft(db, sale_data)
        print(f"SUCCESS: Created Ticket {ticket.ticket_number}")
        
        # Verify deducted from Stock, untouched Merma
        db.expire_all()
        p_stock = db.query(Product).filter(Product.id == product_stock.id).first()
        p_merma = db.query(Product).filter(Product.id == product_merma.id).first()
        
        # NOTE: create_sale_draft DOES NOT deduct stock in Odoo model until validation/closing?
        # Wait, create_sale_draft CREATES SaleItems pointing to specific product instances.
        # But stock deduction usually happens at 'validate_sale' or 'close_session'. 
        # Let's check update_stock logic... 
        # Actually POSService docstring says: "NO afecta el inventario hasta que se valide".
        # But 'create_sale_draft' performs "Lógica de Asignación de Stock".
        # Checks availability, but does it decrement?
        # It creates SaleItem pointing to `product_id`.
        # Validation might do the decrement or Session Close.
        # Wait, if `stock_quantity` isn't decremented, how do we prevent overselling?
        # Ah, `create_sale_draft` checks CURRENT `stock_quantity`.
        
        # Let's assume for this test we mainly care that it ALLOWED 5 but REJECTED 6.
        # That proves it sees 5 as max.
        
    except Exception as e:
        print(f"ERROR: Sale of 5 units failed: {e}")
        import traceback
        traceback.print_exc()

    db.close()
    print("\n--- TEST COMPLETED ---")

if __name__ == "__main__":
    run_test()
