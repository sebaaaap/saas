import os, re

FILES = [
    "/Users/sebastian/Desktop/prototipos/post_full_v1/front/components/pdv/pdv-session-report.tsx",
    "/Users/sebastian/Desktop/prototipos/post_full_v1/front/components/pdv/pdv-order-panel.tsx",
    "/Users/sebastian/Desktop/prototipos/post_full_v1/front/components/pdv/pdv-order-history.tsx",
    "/Users/sebastian/Desktop/prototipos/post_full_v1/front/components/pdv/pdv-payment-modal.tsx",
    "/Users/sebastian/Desktop/prototipos/post_full_v1/front/components/pdv/pdv-close-session.tsx",
    "/Users/sebastian/Desktop/prototipos/post_full_v1/front/app/page.tsx",
]

IMPORT_LINE = 'import { toNum } from "@/lib/utils-numbers"'

# Patron: match values like: foo.toFixed / (bar.baz).toFixed / etc.
# Reemplaza "expr.toFixed(n)" → "toNum(expr).toFixed(n)"
# Casos concretos que aparecen:
#   stats.expectedCash.toFixed(2)  → toNum(stats.expectedCash).toFixed(2)
#   session.openingBalance.toFixed(2)  → toNum(session.openingBalance).toFixed(2)
#   order.total.toFixed / selectedOrder.total.toFixed etc.
#   summary.totalSales.toFixed / pm.total.toFixed etc.
#   line.unitPrice.toFixed / line.subtotal.toFixed
# NO queremos tocar: difference.toFixed / closingCashNum.toFixed / change.toFixed
#   ya que esos son números calculados localmente (ya son number seguros)

# Usamos una lista de prefijos peligrosos (vienen del backend)
DANGEROUS_PREFIXES = [
    "stats.expectedCash",
    "stats.openingBalance",
    "stats.cashSales",
    "stats.cardSales",
    "stats.transferSales",
    "stats.totalSales",
    "stats.totalRefunds",
    "stats.netSales",
    "stats.avgTicket",
    "stats.totalTax",
    "summary.totalSales",
    "summary.avgTicket",
    "summary.totalRefunds",
    "summary.netSales",
    "summary.totalTax",
    "session.openingBalance",
    "order.total",
    "selectedOrder.total",
    "selectedOrder.subtotal",
    "selectedOrder.tax",
    "selectedOrder.amountPaid",
    "o.total",
    "line.unitPrice",
    "line.subtotal",
    "pm.total",
    "cat.total",
    "h.total",
    "p.total",
    r"\(order\.total\s*\|\|\s*0\)",
    r"\(selectedOrder\.total\s*\|\|\s*0\)",
    r"\(selectedOrder\.subtotal\s*\|\|\s*0\)",
    r"\(selectedOrder\.tax\s*\|\|\s*0\)",
    r"\(selectedOrder\.amountPaid\s*\|\|\s*0\)",
    r"\(line\.unitPrice\s*\|\|\s*0\)",
    r"\(line\.subtotal\s*\|\|\s*0\)",
    r"Math\.abs\(order\.total\)",
    r"Math\.abs\(selectedOrder\.total\)",
]

for filepath in FILES:
    if not os.path.exists(filepath):
        print(f"SKIP (no existe): {filepath}")
        continue

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    
    for prefix in DANGEROUS_PREFIXES:
        # Match prefix.toFixed(n) → toNum(prefix).toFixed(n)
        # Escapar el prefijo si no es ya un regex
        if not prefix.startswith(r"(") and not prefix.startswith(r"Math"):
            escaped = re.escape(prefix)
        else:
            escaped = prefix
        content = re.sub(
            rf"({escaped})(\.toFixed\(\d+\))",
            r"toNum(\1)\2",
            content
        )

    changed = content != original

    if changed:
        # Agregar import si no existe
        if IMPORT_LINE not in content:
            # Insertar después de la primera linea de import
            lines = content.split('\n')
            insert_at = 0
            for i, line in enumerate(lines):
                if line.startswith('import '):
                    insert_at = i + 1
            lines.insert(insert_at, IMPORT_LINE)
            content = '\n'.join(lines)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated: {filepath}")
    else:
        print(f"No changes: {filepath}")
