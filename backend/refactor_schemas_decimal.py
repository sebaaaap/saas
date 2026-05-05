import os
import re

BACKEND_DIR = "/Users/sebastian/Desktop/prototipos/post_full_v1/backend/app"

def refactor_schemas_to_decimal():
    schemas_dir = os.path.join(BACKEND_DIR, "schemas")
    
    for root, _, files in os.walk(schemas_dir):
        for file in files:
            if not file.endswith(".py"):
                continue
                
            filepath = os.path.join(root, file)
            with open(filepath, "r") as f:
                content = f.read()
                
            original_content = content
            
            # Reemplazar 'float' por 'Decimal' despues de los dos puntos
            content = re.sub(r':\s*float', r': Decimal', content)
            # Reemplazar 'Optional[float]'
            content = re.sub(r'Optional\[float\]', r'Optional[Decimal]', content)
            
            if content != original_content:
                # Add import if not present
                if "from decimal import Decimal" not in content:
                    lines = content.split('\n')
                    imports_end = 0
                    for i, line in enumerate(lines):
                        if line.startswith('from ') or line.startswith('import '):
                            imports_end = i
                    lines.insert(imports_end + 1, "from decimal import Decimal")
                    content = "\n".join(lines)
                
                with open(filepath, "w") as f:
                    f.write(content)
                print(f"Updated {filepath}")

if __name__ == "__main__":
    refactor_schemas_to_decimal()
