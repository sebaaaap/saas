import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import update
from app.db.session import SessionLocal
from app.models.base import Product, SaleItem, QuoteItem, WorkOrderItem

def fix_nulls():
    db = SessionLocal()
    try:
        # Update Products
        db.execute(update(Product).where(Product.is_variable_consumption == None).values(is_variable_consumption=False))
        db.execute(update(Product).where(Product.default_consumption_rate == None).values(default_consumption_rate=1.0))
        
        # Update SaleItems
        db.execute(update(SaleItem).where(SaleItem.consumption_rate == None).values(consumption_rate=1.0))
        db.execute(update(SaleItem).where(SaleItem.stock_reduced == None).values(stock_reduced=SaleItem.quantity))
        
        # Update QuoteItems
        db.execute(update(QuoteItem).where(QuoteItem.consumption_rate == None).values(consumption_rate=1.0))
        db.execute(update(QuoteItem).where(QuoteItem.stock_reduced == None).values(stock_reduced=0.0))
        
        # Update WorkOrderItems
        db.execute(update(WorkOrderItem).where(WorkOrderItem.consumption_rate == None).values(consumption_rate=1.0))
        db.execute(update(WorkOrderItem).where(WorkOrderItem.stock_reduced == None).values(stock_reduced=0.0))
        
        db.commit()
        print("Successfully updated NULL values to defaults.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_nulls()
