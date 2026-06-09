from decimal import Decimal
import os
import sys

# Add backend to path
sys.path.append("/Users/sebastian/Desktop/prototipos/saaas/backend")

try:
    from app.schemas.inventory import InventoryMovementItemCreate
    from pydantic import ValidationError
    
    item = InventoryMovementItemCreate(product_id="123e4567-e89b-12d3-a456-426614174000", quantity=1.5)
    print("item.quantity type:", type(item.quantity))
    
    stock_quantity = 0.0 # Like float from DB
    try:
        stock_quantity -= item.quantity
        print("Success:", stock_quantity)
    except Exception as e:
        print("Error float - Decimal:", e)
        
except Exception as e:
    print("Other Error:", e)
