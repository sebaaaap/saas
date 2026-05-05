import os
import re

FRONT_DIR = "/Users/sebastian/Desktop/prototipos/post_full_v1/front"

def fix_remaining_ts_errors():
    # Fix types/api.ts
    api_ts = os.path.join(FRONT_DIR, "types/api.ts")
    with open(api_ts, "r") as f: content = f.read()
    content = re.sub(r'\b([a-zA-Z_]*[iI]d\??):\s*number', r'\1: string', content)
    with open(api_ts, "w") as f: f.write(content)

    # Fix components/inventory/actions-page.tsx
    actions_page = os.path.join(FRONT_DIR, "components/inventory/actions-page.tsx")
    with open(actions_page, "r") as f: content = f.read()
    content = content.replace("const newMap: { [key: number]: any } = {};", "const newMap: { [key: string]: any } = {};")
    content = content.replace("const occupancyMap: { [key: number]: any } = {};", "const occupancyMap: { [key: string]: any } = {};")
    content = content.replace("{ [key: number]: any }", "{ [key: string]: any }")
    with open(actions_page, "w") as f: f.write(content)

    # Fix components/compras/purchases-list.tsx
    purchases_list = os.path.join(FRONT_DIR, "components/compras/purchases-list.tsx")
    with open(purchases_list, "r") as f: content = f.read()
    content = content.replace("id: number;", "id: string;")
    with open(purchases_list, "w") as f: f.write(content)
    
fix_remaining_ts_errors()
print("Fixed remaining TS errors.")
