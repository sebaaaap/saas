import os
import re

FRONT_DIR = "/Users/sebastian/Desktop/prototipos/post_full_v1/front"

def process_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original_content = content

    # 1. Type changes
    # Matches: id: number, product_id: number, etc.
    content = re.sub(r'\b([a-zA-Z_]*id):\s*number', r'\1: string', content)
    content = re.sub(r'\b([a-zA-Z_]*Id):\s*number', r'\1: string', content)
    
    # In function signatures: (id: number) -> (id: string)
    content = re.sub(r'\((id):\s*number\)', r'(\1: string)', content)
    
    # 2. parseInt removals
    content = content.replace("parseInt(formData.location_id)", "formData.location_id")
    content = content.replace("parseInt(formData.category_id)", "formData.category_id")
    content = content.replace("const prodId = parseInt(e.target.value);", "const prodId = e.target.value;")
    content = content.replace("parseInt(toLocationId)", "toLocationId")
    content = content.replace("parseInt(selectedSourceInstanceId)", "selectedSourceInstanceId")
    content = content.replace("parseInt(line.product.id)", "line.product.id")
    content = content.replace("parseInt(form.parent_id)", "form.parent_id")
    content = content.replace("parseInt(newItem.product_id)", "newItem.product_id")
    content = content.replace("parseInt(formData.supplier_id)", "formData.supplier_id")
    content = content.replace("p.id === parseInt(e.target.value)", "p.id === e.target.value")
    content = content.replace("original_ticket_id: parseInt(refundOrder.id)", "original_ticket_id: refundOrder.id")
    content = content.replace("parseInt(refundOrder.id)", "refundOrder.id")

    # 3. Any type casting logic
    # In api.ts or types/api.ts
    
    # Fix the edge cases like "(id: number, data: any)"
    content = re.sub(r'\(([a-zA-Z_]*id|ticketId|sessionId|customerId):\s*number', r'(\1: string', content)

    # Some additional edge case for handle delete
    content = re.sub(r'handleDelete = async \((id):\s*number\)', r'handleDelete = async (\1: string)', content)

    if content != original_content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Modified: {filepath}")

def main():
    for root, dirs, files in os.walk(FRONT_DIR):
        if "node_modules" in root or ".next" in root:
            continue
        for file in files:
            if file.endswith(".ts") or file.endswith(".tsx"):
                process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
