import os
import re

FRONT_DIR = "/Users/sebastian/Desktop/prototipos/post_full_v1/front"

def fix_ts_errors():
    # 1. app/page.tsx
    app_page = os.path.join(FRONT_DIR, "app/page.tsx")
    with open(app_page, "r") as f: content = f.read()
    content = content.replace("amountPaid: string", "amountPaid: number")
    content = content.replace("price: string", "price: number")
    content = content.replace("discount_percent: string", "discount_percent: number")
    with open(app_page, "w") as f: f.write(content)

    # 2. components/pdv/pdv-payment-modal.tsx
    payment_modal = os.path.join(FRONT_DIR, "components/pdv/pdv-payment-modal.tsx")
    with open(payment_modal, "r") as f: content = f.read()
    content = content.replace("amountPaid: string", "amountPaid: number")
    content = content.replace("amountPaid?: string", "amountPaid?: number")
    with open(payment_modal, "w") as f: f.write(content)

    # 3. components/compras/purchases-list.tsx
    purchases_list = os.path.join(FRONT_DIR, "components/compras/purchases-list.tsx")
    with open(purchases_list, "r") as f: content = f.read()
    content = content.replace("const getSupplierName = (id: number)", "const getSupplierName = (id: string)")
    content = content.replace("const getProductName = (id: number)", "const getProductName = (id: string)")
    content = content.replace("editingId === null", "editingId === null") # just to be safe if any
    with open(purchases_list, "w") as f: f.write(content)

    # 4. components/compras/suppliers-page.tsx
    suppliers_page = os.path.join(FRONT_DIR, "components/compras/suppliers-page.tsx")
    with open(suppliers_page, "r") as f: content = f.read()
    content = content.replace("useState<number | null>(null)", "useState<string | null>(null)")
    with open(suppliers_page, "w") as f: f.write(content)

    # 5. components/inventory/actions-page.tsx
    actions_page = os.path.join(FRONT_DIR, "components/inventory/actions-page.tsx")
    with open(actions_page, "r") as f: content = f.read()
    content = content.replace("{ [key: number]: ", "{ [key: string]: ")
    with open(actions_page, "w") as f: f.write(content)

    # 6. components/inventory/products-page.tsx
    products_page = os.path.join(FRONT_DIR, "components/inventory/products-page.tsx")
    with open(products_page, "r") as f: content = f.read()
    content = content.replace("useState<number | null>(null)", "useState<string | null>(null)")
    content = content.replace("useState<number[]>([])", "useState<string[]>([])")
    content = content.replace("import { UUID } from \"crypto\"", "")  # just in case
    with open(products_page, "w") as f: f.write(content)

    # 7. components/shared/product-modal.tsx
    product_modal = os.path.join(FRONT_DIR, "components/shared/product-modal.tsx")
    with open(product_modal, "r") as f: content = f.read()
    content = content.replace("editingId: number | null;", "editingId: string | null;")
    content = content.replace("occupiedLocationIds: number[];", "occupiedLocationIds: string[];")
    with open(product_modal, "w") as f: f.write(content)

    # 8. components/pdv/pdv-refund-modal.tsx
    pdv_refund = os.path.join(FRONT_DIR, "components/pdv/pdv-refund-modal.tsx")
    with open(pdv_refund, "r") as f: content = f.read()
    content = content.replace("quantity: string", "quantity: number")
    content = content.replace("price: string", "price: number")
    with open(pdv_refund, "w") as f: f.write(content)

fix_ts_errors()
print("Fixed TS errors.")
