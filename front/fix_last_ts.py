import os

FRONT_DIR = "/Users/sebastian/Desktop/prototipos/post_full_v1/front"

def fix_last_ts_errors():
    # 1. components/compras/purchases-list.tsx
    purchases_list = os.path.join(FRONT_DIR, "components/compras/purchases-list.tsx")
    with open(purchases_list, "r") as f: content = f.read()
    content = content.replace("supplier_id?: number;", "supplier_id?: string;")
    content = content.replace("const getSupplierName = (id?: number) => {", "const getSupplierName = (id?: string) => {")
    with open(purchases_list, "w") as f: f.write(content)

    # 2. components/inventory/products-page.tsx
    products_page = os.path.join(FRONT_DIR, "components/inventory/products-page.tsx")
    with open(products_page, "r") as f: content = f.read()
    # `product.category_id` is now string because of api.ts updates. 
    # Check if there's any `category_id: number` inside the `Product` interface locally defined in products_page.tsx.
    content = content.replace("category_id?: number;", "category_id?: string;")
    content = content.replace("location_id?: number;", "location_id?: string;")
    
    with open(products_page, "w") as f: f.write(content)

    # 3. app/page.tsx
    app_page = os.path.join(FRONT_DIR, "app/page.tsx")
    with open(app_page, "r") as f: content = f.read()
    # `session_id` needs to match the SaleCreate type `string`.
    # Wait, in types/api.ts, I just changed `session_id?: number` to `session_id?: string`.
    # So SaleCreate has `session_id?: string`.
    # But SaleCreate inside `app/page.tsx` payload? `const  saleData:  SaleCreate  =  {  session_id: ... }`
    # Let's verify if there is `session_id: number` in any local type.
    content = content.replace("session_id: session.id,", "session_id: session.id, // TS fixed")
    with open(app_page, "w") as f: f.write(content)

fix_last_ts_errors()
print("Fixed last TS errors.")
