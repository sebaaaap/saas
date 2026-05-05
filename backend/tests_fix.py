import os
import re

BACKEND_DIR = "/Users/sebastian/Desktop/prototipos/post_full_v1/backend/"

def convert_tests_to_decimal():
    """Busca y convierte floats manuales a Decimal y soluciona serialización UUID en tests."""
    tests_dir = os.path.join(BACKEND_DIR, "tests")
    
    for root, _, files in os.walk(tests_dir):
        for file in files:
            if not file.endswith(".py"):
                continue
                
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
                
            original_content = content
            
            # 1. UUID serialization: session_id: session.id -> str(session.id)
            # En la función _quick_sale_payload de test_pos.py
            content = content.replace('"session_id": session.id,', '"session_id": str(session.id),')
            content = content.replace('"product_id": producto.id,', '"product_id": str(producto.id),')
            
            # 2. Decimal * float issues: 
            # neto = producto.price * cantidad
            # total_con_iva = neto * 1.19
            # Lo castearemos a float antes de enviar para JSON.
            # En Python: float(producto.price) * cantidad
            content = content.replace('neto = producto.price * cantidad', 'neto = float(producto.price) * float(cantidad)')
            content = content.replace('total_con_iva = neto * 1.19', 'total_con_iva = float(neto) * 1.19')
            content = content.replace('"price": producto.price', '"price": float(producto.price)')
            
            # Otros cálculos problemáticos en test de reembolsos, inventario
            # "price": p.price -> "price": float(p.price)
            content = content.replace('"price": p.price', '"price": float(p.price)')
            content = content.replace('"price": t.items[0].unit_price', '"price": float(t.items[0].unit_price)')
            content = content.replace('"price": item.unit_price', '"price": float(item.unit_price)')
            
            # IDs problemáticos
            content = content.replace('"original_ticket_id": ticket.id', '"original_ticket_id": str(ticket.id)')
            content = content.replace('f"/api/v1/pos/sales/{ticket.id}/validate"', 'f"/api/v1/pos/sales/{str(ticket.id)}/validate"')
            content = content.replace('f"/api/v1/pos/sales/{ticket.id}/pay"', 'f"/api/v1/pos/sales/{str(ticket.id)}/pay"')
            content = content.replace('ticket_id=ticket.id', 'ticket_id=str(ticket.id)')
            
            if content != original_content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Updated {filepath}")

if __name__ == "__main__":
    convert_tests_to_decimal()
