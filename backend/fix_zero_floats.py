import os
import re

BACKEND_DIR = "/Users/sebastian/Desktop/prototipos/post_full_v1/backend/app"

def fix_zero_floats():
    for f_path in ["api/reports.py", "services/session_service.py"]:
        full_path = os.path.join(BACKEND_DIR, f_path)
        if not os.path.exists(full_path):
            continue
            
        with open(full_path, "r") as f:
            content = f.read()
            
        original_content = content
        
        # Reemplazar "or 0.0" con "or Decimal('0.00')"
        content = re.sub(r'or\s+0\.0\b', r"or Decimal('0.00')", content)
        # Reemplazar '= 0.0' con "= Decimal('0.00')" 
        content = re.sub(r'=\s*0\.0\b', r"= Decimal('0.00')", content)
        # Reemplazar += 0.0
        content = re.sub(r'\+=\s*0\.0\b', r"+= Decimal('0.00')", content)
        
        if content != original_content:
            if "from decimal import Decimal" not in content:
                content = "from decimal import Decimal\n" + content
            
            with open(full_path, "w") as f:
                f.write(content)
            print(f"Updated {full_path}")

if __name__ == "__main__":
    fix_zero_floats()
