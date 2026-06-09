"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"
import { toast } from "sonner"
import { Play, Loader2, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { PdvHeader } from "@/components/pdv/pdv-header"
import { PdvCategories } from "@/components/pdv/pdv-categories"
import { PdvProductGrid } from "@/components/pdv/pdv-product-grid"
import { PdvOrderPanel } from "@/components/pdv/pdv-order-panel"
import { PdvPaymentModal } from "@/components/pdv/pdv-payment-modal"
import { PdvOrderHistory } from "@/components/pdv/pdv-order-history"
import { PdvCloseSession } from "@/components/pdv/pdv-close-session"
// import { PdvOtPaymentModal } from "@/components/pdv/pdv-ot-payment-modal" // OT_HIDDEN
import { PdvOpenSession } from "@/components/pdv/pdv-open-session"
import { PdvRefundModal } from "@/components/pdv/pdv-refund-modal"
import { PdvVehicleHistory } from "@/components/pdv/pdv-vehicle-history"
import { PdvExpenseMode } from "@/components/pdv/pdv-expense-mode"
import { BackendDashboard } from "@/components/backend/backend-dashboard"
import { Sidebar } from "@/components/backend/sidebar"
import CustomersModule from "@/components/backend/customers-module"
import type { ModuleId } from "@/components/backend/backend-dashboard"
import { customers as dummyCustomers, paymentMethods } from "@/components/pdv/pdv-data"
import type {
  Order,
  OrderLine,
  Product,
  Customer,
  NumpadMode,
  PaymentMethod,
} from "@/components/pdv/pdv-types"

import { apiService } from "@/services/apiService"
import { PaymentMethod as ApiPaymentMethod } from "@/types/api"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { toNum } from "@/lib/utils-numbers"

function createEmptyOrder(customer: Customer | null = null): Order {
  return {
    id: `ORD-${Date.now().toString(36).toUpperCase()}`,
    lines: [],
    customer,
    total: 0,
    tax: 0,
    subtotal: 0,
    date: new Date(),
    status: "draft",
  }
}

function calculateLineTotals(lines: OrderLine[]) {
  // El precio YA incluye IVA. 
  // Total = suma de (precio * cantidad)
  // IVA = 19% del Total (según requerimiento de usuario)
  // Subtotal (Neto) = Total - IVA
  const total = lines.reduce((acc, line) => {
    const lineTotal = line.unitPrice * line.quantity * (1 - line.discount / 100)
    return acc + lineTotal
  }, 0)

  const tax = total * 0.19
  const subtotal = total - tax

  return { subtotal, tax, total }
}


export default function AppPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  // Navigation state
  const [currentModule, setCurrentModule] = useState<ModuleId | "backend" | null>(null)

  // Set default module based on role
  useEffect(() => {
    if (!isLoading && user && currentModule === null) {
      console.log("AppPage: Configurando módulo inicial para el rol:", user.role);
      if (user.role === 'vendedor') {
        setCurrentModule('pdv')
      } else {
        setCurrentModule('backend')
      }
    }
  }, [user, isLoading, currentModule])

  // API Data — solo se ejecutan cuando hay un usuario autenticado (null key = SWR no fetcha)
  const { data: apiProducts, error: productsError } = useSWR(user ? "/products/" : null, () => apiService.getProducts())
  const { data: apiCategories } = useSWR(user ? "/categories/" : null, () => apiService.getCategories())
  const { data: activeSession } = useSWR(user ? "/sessions/active" : null, () => apiService.getActiveSession())
  const { data: apiCustomers } = useSWR(user ? "/customers/" : null, () => apiService.getCustomers())

  // PdV state
  const [orders, setOrders] = useState<Order[]>([createEmptyOrder()])
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0)
  const [selectedCategoryId, setSelectedCategoryId] = useState("all")
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [numpadMode, setNumpadMode] = useState<NumpadMode>("quantity")
  const [numpadBuffer, setNumpadBuffer] = useState("")
  const [showPayment, setShowPayment] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showCloseSession, setShowCloseSession] = useState(false)
  const [paidOrders, setPaidOrders] = useState<Order[]>([])
  const [showOpenSession, setShowOpenSession] = useState(false)
  const [showRefund, setShowRefund] = useState(false)
  // const [showOtPayment, setShowOtPayment] = useState(false) // OT_HIDDEN
  const [showVehicleHistory, setShowVehicleHistory] = useState(false)
  const [showExpenseMode, setShowExpenseMode] = useState(false)
  const [refundOrder, setRefundOrder] = useState<Order | null>(null)
  
  // Alert dialog for removing orders
  const [orderToRemoveId, setOrderToRemoveId] = useState<string | null>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState("")

  // Refs to avoid stale closures in event listeners
  const currentOrderIndexRef = useRef(0)
  currentOrderIndexRef.current = currentOrderIndex

  const ordersRef = useRef(orders)
  ordersRef.current = orders

  const currentOrder = orders[currentOrderIndex]

  // Map API Customers to UI
  const mappedApiCustomers = useMemo(() => {
    return (apiCustomers || []).map(c => ({
      id: String(c.id),
      name: c.name,
      rut: c.rut,
      phone: c.phone || "",
      address: c.address || "",
      vehicles: c.vehicles || []
    }))
  }, [apiCustomers])

  // Map API Categories to UI Format
  const mappedCategories = useMemo(() => {
    const iconMap: Record<string, string> = {
      "aceite": "Droplets",
      "lubricante": "Droplets",
      "llanta": "CircleDot",
      "neumatico": "CircleDot",
      "filtro": "Filter",
      "freno": "Disc3",
      "bujia": "Zap",
      "servicio": "Wrench",
      "mecanica": "Wrench",
    }

    const baseCategories = (apiCategories || []).map(cat => {
      const nameLower = cat.name.toLowerCase()
      const iconKey = Object.keys(iconMap).find(key => nameLower.includes(key))

      return {
        id: String(cat.id),
        name: cat.name,
        full_path: cat.full_path || cat.name,
        parent_id: cat.parent_id ? String(cat.parent_id) : null,
        icon: iconKey ? iconMap[iconKey] : "LayoutGrid",
        color: cat.color || "#6366f1"
      }
    })

    return [
      { id: "all", name: "Todos", icon: "LayoutGrid", color: "#6366f1", parent_id: null },
      ...baseCategories
    ]
  }, [apiCategories])

  // Categories shown in the POS bar:
  // Always show "Todos" + root categories (no parent).
  // When a category with children is selected, also show its children so the user can drill down.
  const visibleCategories = useMemo(() => {
    const all = mappedCategories.find(c => c.id === "all")!
    const roots = mappedCategories.filter(c => c.id !== "all" && !c.parent_id)

    if (selectedCategoryId === "all") {
      return [all, ...roots]
    }

    // Find children of the selected category
    const children = mappedCategories.filter(c => c.parent_id === selectedCategoryId)
    if (children.length > 0) {
      // Show: Todos, roots (to go back), then children of selected
      return [all, ...roots, ...children]
    }

    // Selected is a leaf — just show Todos + roots
    return [all, ...roots]
  }, [mappedCategories, selectedCategoryId])

  // Map API Products to UI Format
  const mappedProducts = useMemo(() => {
    return (apiProducts || []).map(p => {
      let catId = "all"
      if (p.category_id) {
        catId = String(p.category_id)
      } else if (p.category) {
        const found = mappedCategories.find(c => c.name.toLowerCase() === p.category?.toLowerCase())
        catId = found ? found.id : String(p.category).toLowerCase()
      }
      const category = mappedCategories.find(c => c.id === catId)
      const categoryColor = category?.color || "#e2e8f0"

      return {
        id: String(p.id),
        name: p.name,
        price: toNum(p.price),
        cost: toNum((p as any).cost || 0),
        categoryId: catId,
        barcode: p.barcode,
        stock: toNum((p as any).available_qty ?? (p as any).total_stock ?? (p as any).stock_quantity ?? 0),
        stockMin: toNum(p.min_stock ?? 5),
        tax: 19,
        color: categoryColor,
        unit: p.uom || "un",
        productType: p.product_type || "STORABLE",
        isVariableConsumption: p.is_variable_consumption || false,
        defaultConsumptionRate: toNum(p.default_consumption_rate || 1),
        isRawMaterial: p.is_raw_material || false,
        isDerived: (p as any).bom_lines && (p as any).bom_lines.length > 0
      }
    })
  }, [apiProducts, mappedCategories])

  // Build the set of all category IDs that are descendants of (or equal to) the selected one
  const descendantCategoryIds = useMemo(() => {
    if (selectedCategoryId === "all") return new Set<string>()
    const result = new Set<string>()
    const queue = [selectedCategoryId]
    while (queue.length > 0) {
      const curr = queue.shift()!
      result.add(curr)
      // Add all direct children
      mappedCategories
        .filter(c => c.parent_id === curr)
        .forEach(child => queue.push(child.id))
    }
    return result
  }, [selectedCategoryId, mappedCategories])

  // Filter products by selected category (including all descendants) + search
  const filteredProducts = useMemo(() => {
    // Find the name of the selected category for text-based matching fallback
    const selectedCat = mappedCategories.find(c => c.id === selectedCategoryId)
    const selectedCatNameLower = selectedCat ? selectedCat.name.toLowerCase() : ""

    const base = mappedProducts.filter(p => {
      const pCatIdLower = String(p.categoryId).toLowerCase()
      
      let matchesCategory =
        selectedCategoryId === "all" ||
        descendantCategoryIds.has(p.categoryId) ||
        pCatIdLower === String(selectedCategoryId).toLowerCase()

      // Text-based fallback for subcategories (e.g. category "Lubricantes/motor" and selected "Lubricantes")
      if (!matchesCategory && selectedCatNameLower && selectedCatNameLower !== "todos") {
        if (pCatIdLower.startsWith(selectedCatNameLower + "/") || pCatIdLower.startsWith(selectedCatNameLower + "-")) {
          matchesCategory = true
        }
      }

      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.includes(searchQuery)

      // EXCLUDE RAW MATERIALS FROM POS
      const isNotRawMaterial = !p.isRawMaterial

      return matchesCategory && matchesSearch && isNotRawMaterial
    })

    return base.map(p => {
      // INVENTARIO EN TIEMPO REAL:
      // El stock de la API (p.stock) ya es el stock real después de cada venta.
      // El backend descuenta inmediatamente en cada POST /sales.
      // Solo restamos lo que hay en el carrito actual (aún no cobrado).
      const lineInCart = orders[currentOrderIndex]?.lines.find(l => l.product.barcode === p.barcode)
      const cartQty = lineInCart ? toNum(lineInCart.quantity) : 0
      const rate = lineInCart ? toNum(lineInCart.consumptionRate) : toNum(p.defaultConsumptionRate || 1)
      const stockToDeduct = cartQty * rate

      return {
        ...p,
        stock: Math.max(0, toNum(p.stock) - stockToDeduct)
      }
    })
  }, [mappedProducts, selectedCategoryId, descendantCategoryIds, searchQuery, orders, currentOrderIndex])

  const updateCurrentOrder = useCallback(
    (updater: (order: Order) => Order) => {
      setOrders((prev) =>
        prev.map((o, i) => (i === currentOrderIndex ? updater(o) : o)),
      )
    },
    [currentOrderIndex],
  )

  // Agregar producto al pedido
  const handleAddProduct = useCallback(
    (product: Product) => {
      console.log("handleAddProduct: Intentando agregar producto", product.name, "Stock:", product.stock);
      // Si es un servicio, no validamos stock
      const isService = product.productType === "SERVICE" || product.categoryId === "servicios" || String(product.categoryId).toLowerCase().includes("serv")

      let targetId = ""
      let stockError = false

      setOrders((prev) => {
        const updated = [...prev]
        const orderIndex = currentOrderIndexRef.current // Use ref for safety
        const order = { ...updated[orderIndex] }
        if (!order) return prev

        const existing = order.lines.find((l) => l.product.barcode === product.barcode)
        let newLines: OrderLine[]

        if (existing) {
          // Validar stock disponible
          const stockNeededForDelta = 1 * toNum(existing.consumptionRate)
          if (!isService && product.stock < stockNeededForDelta) {
            stockError = true
            return prev
          }

          targetId = existing.id
          newLines = order.lines.map((l) =>
            l.id === existing.id
              ? { ...l, quantity: l.quantity + 1, subtotal: (l.quantity + 1) * l.unitPrice * (1 - l.discount / 100) }
              : l
          )
        } else {
          // Si es producto nuevo, validamos que tenga suficiente para 1 consumo
          const stockNeededForDelta = 1 * toNum(product.defaultConsumptionRate || 1)
          if (!isService && product.stock < stockNeededForDelta) {
            stockError = true
            return prev
          }

          targetId = `LN-${Date.now()}`
          newLines = [...order.lines, {
            id: targetId,
            product,
            quantity: 1,
            consumptionRate: product.defaultConsumptionRate || 1,
            unitPrice: product.price,
            discount: 0,
            subtotal: product.price
          }]
        }

        updated[orderIndex] = { ...order, lines: newLines, ...calculateLineTotals(newLines) }
        return updated
      })

      if (stockError) {
        toast.error(`No hay suficiente stock para ${product.name}`)
        return
      }

      setSelectedLineId(targetId)
      setNumpadBuffer("")
      setSearchQuery("") // Clear search
    },
    [],
  )

  const handleBarcodeSearch = useCallback(async (barcode: string) => {
    console.log("handleBarcodeSearch: Buscando barcode", barcode);

    // 1. Prioridad: Búsqueda en memoria
    let productToAdd = mappedProducts.find(p => p.barcode === barcode)

    // 2. Si es Enter manual y no es barcode exacto, tomar primer resultado
    if (!productToAdd && filteredProducts.length > 0) {
      productToAdd = filteredProducts[0]
    }

    if (productToAdd) {
      handleAddProduct(productToAdd)
      toast.success(`${productToAdd.name} agregado`)
      return
    }

    try {
      const product = await apiService.getProductByBarcode(barcode)
      console.log("handleBarcodeSearch: Producto encontrado", product.name);

      // Map API product to POS UI product
      const catId = product.category_id ? String(product.category_id) : (product.category ? String(product.category).toLowerCase() : "all")

      const mappedProduct: Product = {
        id: String(product.id),
        name: product.name,
        price: product.price,
        barcode: product.barcode,
        categoryId: catId,
        stock: (product as any).total_stock || (product as any).stock_quantity || 0,
        tax: 19, // Chile IVA
        color: "bg-card border-border",
        unit: product.uom || "un",
        productType: product.product_type || "STORABLE",
        isVariableConsumption: product.is_variable_consumption || false,
        defaultConsumptionRate: toNum(product.default_consumption_rate || 1),
        stockMin: toNum((product as any).min_stock ?? 5)
      }
      handleAddProduct(mappedProduct)
      toast.success(`${product.name} agregado`)
    } catch (error) {
      console.error("handleBarcodeSearch: Error", error);
      toast.error("Producto no encontrado")
    }
  }, [mappedProducts, filteredProducts, handleAddProduct])

  // Unified Keyboard Handling
  const barcodeBuffer = useRef("")
  const barcodeTimeout = useRef<NodeJS.Timeout | null>(null)
  const lastKeyTime = useRef<number>(0)

  // Lógica del Teclado Numérico (PdV Core)
  const handleNumpadInput = useCallback(
    (value: string) => {
      if (!selectedLineId) return

      setNumpadBuffer((prev) => {
        let next = prev
        if (value === "CE") {
          next = prev.slice(0, -1)
        } else if (value === "C" || value === "Escape") {
          next = ""
        } else {
          if (value === "." && prev.includes(".")) return prev
          next = prev + value
        }

        const val = (next === "" || next === "." || next === "-") ? 0 : Number.parseFloat(next)
        let cappedVal = val
        let wasCapped = false

        setOrders(orders => orders.map((o, idx) => {
          if (idx !== currentOrderIndexRef.current) return o

          const lines = o.lines.map(ln => {
            if (String(ln.id) !== String(selectedLineId)) return ln

            const l = { ...ln }
            if (numpadMode === "quantity") {
              const isService = l.product.productType === "SERVICE" || l.product.categoryId === "servicios" || String(l.product.categoryId).toLowerCase().includes("serv")
              if (!isService) {
                // Calcular stock máximo disponible para este producto
                const productMain = mappedProducts.find(p => String(p.id) === String(l.product.id))
                const dbStock = productMain ? productMain.stock : 0

                // INVENTARIO EN TIEMPO REAL: el stock de la DB ya está actualizado.
                // Solo limitamos por el stock de DB menos lo ya en el carrito en otros items.
                const maxAvailable = Math.max(0, dbStock)

                if (val > maxAvailable) {
                  cappedVal = maxAvailable
                  wasCapped = true
                }
              }
              l.quantity = Math.max(0, cappedVal)
            } else if (numpadMode === "discount") {
              l.discount = Math.min(100, Math.max(0, val))
            } else if (numpadMode === "price") {
              l.unitPrice = val
            } else if (numpadMode === "consumption") {
              l.consumptionRate = Math.max(0, val)
            }

            l.subtotal = l.unitPrice * l.quantity * (1 - l.discount / 100)
            return l
          })
          return { ...o, lines, ...calculateLineTotals(lines) }
        }))

        if (wasCapped) {
          toast.error(`Solo hay ${cappedVal} unidades disponibles`)
          return String(cappedVal)
        }
        return next
      })
    },
    [selectedLineId, numpadMode, mappedProducts, paidOrders],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()
      const diff = now - lastKeyTime.current
      lastKeyTime.current = now

      const isFast = diff < 65
      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

      if (e.key === "Enter") {
        if (barcodeBuffer.current.length > 2) {
          e.preventDefault()
          handleBarcodeSearch(barcodeBuffer.current)
          barcodeBuffer.current = ""
        } else if (isInput && target instanceof HTMLInputElement && target.value.length > 0) {
          e.preventDefault()
          handleBarcodeSearch(target.value)
        }
        return
      }

      const isDigit = e.key >= "0" && e.key <= "9"
      if (isFast || barcodeBuffer.current.length > 0) {
        if (e.key.length === 1) {
          barcodeBuffer.current += e.key

          if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current)
          barcodeTimeout.current = setTimeout(() => {
            barcodeBuffer.current = ""
          }, 500)

          if (isFast) e.preventDefault()
          return
        }
      }

      if (isInput) return

      if (selectedLineId) {
        if (isDigit) {
          e.preventDefault()
          handleNumpadInput(e.key)
        } else if (e.key === "." || e.key === ",") {
          e.preventDefault()
          handleNumpadInput(".")
        } else if (e.key === "Backspace") {
          e.preventDefault()
          handleNumpadInput("CE")
        } else if (e.key === "Escape") {
          e.preventDefault()
          handleNumpadInput("C")
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown, true)
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true)
      if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current)
    }
  }, [handleBarcodeSearch, handleNumpadInput, selectedLineId])

  // --- PERSISTENCE: Restore paid orders when loading an active session ---
  useEffect(() => {
    if (activeSession && apiProducts && apiProducts.length > 0) {
      const fetchSessionSales = async () => {
        try {
          const sales = await apiService.getSalesBySession(activeSession.id)

          const restoredOrders: Order[] = (sales || []).map(sale => {
            const mappedLines: OrderLine[] = (sale.items || []).map(item => {
              // Buscar producto por ID directo O por ID de una de sus ubicaciones (aggregated)
              const apiProd = item.product || apiProducts?.find(p =>
                p.id === item.product_id ||
                (p as any).locations?.some((loc: any) => loc.id === item.product_id)
              )

              const mappedProduct: Product = {
                id: String(item.product_id),
                name: apiProd?.name || `Producto #${item.product_id}`,
                price: item.unit_price ? toNum(item.unit_price) : toNum(apiProd?.price || 0),
                cost: toNum((apiProd as any)?.cost || 0),
                categoryId: apiProd?.category || String(apiProd?.category_id) || "all",
                stock: toNum((apiProd as any)?.total_stock || (apiProd as any)?.stock_quantity || 0),
                tax: 19,
                color: "bg-card border-border",
                unit: apiProd?.uom || "un",
                barcode: apiProd?.barcode || "",
                productType: apiProd?.product_type || "STORABLE"
              }
              return {
                id: `hydrated-${item.id}`,
                product: mappedProduct,
                quantity: toNum(item.quantity),
                unitPrice: toNum(item.unit_price),
                discount: toNum(item.discount_percent),
                consumptionRate: toNum(item.consumption_rate || 1),
                stockReduced: item.stock_reduced ? toNum(item.stock_reduced) : undefined,
                subtotal: toNum(item.subtotal)
              }
            })

            const foundMethod = paymentMethods.find(m =>
              m.type.toLowerCase() === sale.payment_method.toLowerCase() ||
              m.name.toLowerCase() === sale.payment_method.toLowerCase()
            )
            const method = foundMethod || {
              id: `pm_dynamic_${sale.payment_method}`,
              name: sale.payment_method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              icon: "Banknote", // fallback icon
              type: sale.payment_method
            }

            return {
              id: String(sale.id),
              lines: mappedLines,
              customer: sale.customer ? {
                id: String(sale.customer_id),
                name: sale.customer.name,
                rut: sale.customer.rut,
                phone: sale.customer.phone,
                vehicle: sale.customer.vehicle // if available
              } : null,
              total: toNum(sale.total_amount),
              tax: toNum(sale.tax_amount),
              subtotal: toNum(sale.subtotal),
              date: new Date(sale.date_created || sale.date_validated || Date.now()),
              status: sale.state === "reembolsado" ? "refunded" : "paid",
              paymentMethod: method,
              amountPaid: toNum(sale.total_amount),
              returnToStock: sale.return_to_stock,
              originalTicketId: sale.original_ticket_id ? String(sale.original_ticket_id) : undefined,
              documentType: sale.document_type || "boleta",
              comment: sale.comment || "",
            } as Order
          })

          setPaidOrders(restoredOrders)
        } catch (error) {
          console.error("Error fetching session sales:", error)
        }
      }
      fetchSessionSales()
    }
  }, [activeSession?.id, apiProducts])

  // Actualizar cantidad manualmente (+/-)
  const handleUpdateQuantity = useCallback(
    (lineId: string, delta: number) => {
      let stockError = false
      let productName = ""

      setOrders((prev) => {
        const updated = [...prev]
        const orderIndex = currentOrderIndexRef.current
        const order = { ...updated[orderIndex] }
        if (!order) return prev

        const line = order.lines.find(l => l.id === lineId)
        if (!line) return prev

        productName = line.product.name
        const isService = line.product.productType === "SERVICE" || line.product.categoryId === "servicios" || String(line.product.categoryId).toLowerCase().includes("serv")

        // Si estamos incrementando, validamos stock
        if (delta > 0 && !isService) {
          // Buscamos en el grid por barcode para ver el stock consolidado
          const prodInGrid = filteredProducts.find(p => p.barcode === line.product.barcode)
          const availableToIncrement = prodInGrid ? toNum(prodInGrid.stock) : 0

          const stockNeededForDelta = delta * toNum(line.consumptionRate)

          if (availableToIncrement < stockNeededForDelta) {
            stockError = true
            return prev
          }
        }

        const newLines = order.lines
          .map((l) => {
            if (l.id !== lineId) return l
            const newQty = Math.max(0, l.quantity + delta)
            return {
              ...l,
              quantity: newQty,
              subtotal: newQty * l.unitPrice * (1 - l.discount / 100),
            }
          })
          .filter((l) => l.quantity > 0)

        const totals = calculateLineTotals(newLines)
        updated[orderIndex] = { ...order, lines: newLines, ...totals }
        return updated
      })

      if (stockError) {
        toast.error(`Stock insuficiente para ${productName}`)
      }
    },
    [filteredProducts],
  )

  // Remove line
  const handleRemoveLine = useCallback(
    (lineId: string) => {
      updateCurrentOrder((order) => {
        const newLines = order.lines.filter((l) => l.id !== lineId)
        const totals = calculateLineTotals(newLines)
        return { ...order, lines: newLines, ...totals }
      })
      if (selectedLineId === lineId) {
        setSelectedLineId(null)
      }
    },
    [updateCurrentOrder, selectedLineId],
  )

  // New order — preserves customer from current if desired
  const handleNewOrder = useCallback(() => {
    const newOrder = createEmptyOrder()
    setOrders((prev) => [...prev, newOrder])
    setCurrentOrderIndex(ordersRef.current.length)
    setSelectedLineId(null)
    setNumpadBuffer("")
  }, [])

  const confirmOrderRemoval = useCallback((orderId: string) => {
    setOrders(prev => {
      if (prev.length <= 1) {
        return [createEmptyOrder()]
      }
      return prev.filter(o => o.id !== orderId)
    })

    const closingIndex = ordersRef.current.findIndex(o => o.id === orderId)
    const currentIndex = currentOrderIndexRef.current

    if (closingIndex === currentIndex) {
      setCurrentOrderIndex(Math.max(0, ordersRef.current.length - 2))
    } else if (closingIndex < currentIndex) {
      setCurrentOrderIndex(currentIndex - 1)
    }

    setSelectedLineId(null)
    setNumpadBuffer("")
    setOrderToRemoveId(null)
  }, [])

  const handleRemoveOrder = useCallback((orderId: string) => {
    const orderToRemove = ordersRef.current.find(o => o.id === orderId)
    if (!orderToRemove) return

    if (orderToRemove.lines.length > 0) {
      setOrderToRemoveId(orderId)
    } else {
      confirmOrderRemoval(orderId)
    }
  }, [confirmOrderRemoval])

  // Set customer on current order
  const handleSetCurrentOrderCustomer = useCallback((customer: Customer | null) => {
    updateCurrentOrder((order) => ({ ...order, customer }))
  }, [updateCurrentOrder])

  // Select order
  const handleSelectOrder = useCallback(
    (order: Order) => {
      const idx = ordersRef.current.findIndex((o) => o.id === order.id)
      if (idx >= 0) {
        setCurrentOrderIndex(idx)
        setSelectedLineId(null)
        setNumpadBuffer("")
      }
    },
    [],
  )

  // Confirm payment
  const handleConfirmPayment = useCallback(
    async (method: PaymentMethod, amountPaid: number, documentType: string, comment: string) => {
      if (!activeSession) {
        toast.error("No hay una sesión de caja activa.")
        return
      }

      const order = ordersRef.current[currentOrderIndexRef.current]
      if (!order || order.lines.length === 0) {
        toast.error("No hay productos en el pedido.")
        return
      }

      // El backend valida que sum(payments) == total calculado.
      // El total de la venta es lo que se cobra (sin vuelto).
      // El vuelto (amountPaid - order.total) es solo para mostrar en pantalla.
      const saleTotal = Number(order.total)

      const saleData = {
        session_id: activeSession.id,
        items: order.lines.map(line => ({
          product_id: line.product.id,
          quantity: Number(line.quantity),
          price: Number(line.unitPrice),
          discount_percent: Number(line.discount),
          consumption_rate: Number(line.consumptionRate || 1)
        })),
        payments: [{
          payment_method: method.key || method.type || "efectivo",
          amount: saleTotal
        }],
        customer_id: order.customer ? order.customer.id : null,
        vehicle_id: order.customer?.selectedVehicle?.id || null,
        document_type: documentType,
        comment: comment
      }

      try {
        // Paso 1: Crear venta en DRAFT
        const draft = await apiService.createSale(saleData)

        // Paso 2: Validar (reserva inventario, crea trazabilidad)
        await apiService.validateSale(draft.id)

        // Paso 3: Marcar como PAID
        const finalTicket = await apiService.markAsPaid(draft.id)

        toast.success(`Venta #${finalTicket.ticket_number} completada ✓`)

        mutate("/products/")
        mutate("/sessions/active")

        const paidOrder: Order = {
          ...order,
          id: String(finalTicket.id),
          status: "paid",
          paymentMethod: method,
          amountPaid,
          customer: order.customer,  // ← customer vive en la orden, no global
          documentType,
          comment,
        }

        setPaidOrders((prev) => [paidOrder, ...prev])
        setShowPayment(false)

        // Limpiar el pedido pagado y crear uno nuevo vacío
        setTimeout(() => {
          const paidIdx = currentOrderIndexRef.current
          setOrders((prev) => {
            const remaining = prev.filter((_, i) => i !== paidIdx)
            return remaining.length === 0 ? [createEmptyOrder()] : remaining
          })
          setCurrentOrderIndex(0)
          setSelectedLineId(null)
          setNumpadBuffer("")
        }, 500)
      } catch (error: any) {
        const detail = error?.response?.data?.detail
        console.error("Error al procesar la venta:", error)
        toast.error(detail ? `Error: ${detail}` : "Error al procesar la venta")
      }
    },
    [activeSession],  // selectedCustomer ya no es global
  )

  // OT_HIDDEN: Pago de OT desde PDV. La lógica está intacta, solo comentada.
  // const handleConfirmOtPayment = async (amount: number, method: string, otId?: string, itemIds?: string[]) => {
  //   if (!activeSession) { toast.error("No hay sesión activa."); return }
  //   if (!otId) { toast.error("No se ha seleccionado una OT."); return }
  //   try {
  //     await apiService.addWorkOrderPayment(otId, { amount, payment_method: method.toLowerCase(), item_ids: itemIds }, activeSession.id)
  //     toast.success(`Abono a OT por $${amount.toLocaleString("es-CL")} registrado en caja.`)
  //     setShowOtPayment(false)
  //     mutate("/sessions/active")
  //   } catch (error: any) {
  //     toast.error(error.response?.data?.detail || "Error al procesar el abono de OT")
  //   }
  // }

  // Refund
  const handleRefund = useCallback(
    (originalOrder: Order) => {
      setRefundOrder(originalOrder)
      setShowRefund(true)
    },
    [],
  )

  const handleConfirmRefund = async (refundData: {
    items: { product_id: string; quantity: number; price: number }[]
    returnToStock: boolean
    reason: string
  }) => {
    if (!refundOrder) return

    try {
      const response = await apiService.createRefund({
        original_ticket_id: refundOrder.id,
        items: refundData.items,
        refund_reason: refundData.reason,
        return_to_stock: refundData.returnToStock
      })

      toast.success(refundData.returnToStock
        ? `Reembolso procesado — stock repuesto ✓`
        : `Reembolso procesado — artículos enviados a merma ✓`
      )

      // Actualización optimista del cache de SWR para reflejo instantáneo
      // Ajustamos el stock en la cache ANTES del re-fetch para evitar cualquier retraso
      if (refundData.returnToStock) {
        mutate("/products/", (currentProducts: any[] | undefined) => {
          if (!currentProducts) return currentProducts
          return currentProducts.map(p => {
            const refundedItem = refundData.items.find(
              ri => ri.product_id === p.id ||
                ri.product_id === String(p.id)
            )
            if (!refundedItem) return p
            return {
              ...p,
              stock_quantity: (p.stock_quantity || 0) + refundedItem.quantity,
              total_stock: ((p as any).total_stock || 0) + refundedItem.quantity,
            }
          })
        }, { revalidate: true }) // true = también hace re-fetch en background para confirmar
      } else {
        // Merma: el stock ya fue descontado al vender, no cambia para el POS normal
        mutate("/products/")
      }

      mutate("/sessions/active")

      setPaidOrders(prev => prev.map(o =>
        o.id === refundOrder.id ? { ...o, status: "refunded" } : o
      ))

      const cn = response.credit_note
      const creditNoteOrder: Order = {
        id: String(cn.id),
        lines: cn.items.map(item => {
          const apiProd = apiProducts?.find(p => p.id === item.product_id)
          return {
            id: String(item.id),
            product: {
              id: String(item.product_id),
              name: apiProd?.name || `Producto #${item.product_id}`,
              price: toNum(item.unit_price),
              categoryId: apiProd?.category || String(apiProd?.category_id) || "all",
              stock: toNum((apiProd as any)?.total_stock || (apiProd as any)?.stock_quantity || 0),
              tax: 19,
              color: "bg-card border-border",
              barcode: apiProd?.barcode || ""
            },
            quantity: toNum(item.quantity),
            unitPrice: toNum(item.unit_price),
            discount: toNum(item.discount_percent),
            subtotal: toNum(item.subtotal)
          }
        }),
        customer: refundOrder.customer,
        total: toNum(cn.total_amount),
        tax: toNum(cn.tax_amount),
        subtotal: toNum(cn.subtotal),
        date: new Date(cn.date_created),
        status: "refunded",
        paymentMethod: refundOrder.paymentMethod,
        amountPaid: toNum(cn.total_amount),
        returnToStock: cn.return_to_stock,
        originalTicketId: String(cn.original_ticket_id)
      }
      setPaidOrders(prev => [creditNoteOrder, ...prev])
      setShowRefund(false)
    } catch (error: any) {
      console.error("Error al procesar el reembolso:", error)
      const detail = error?.response?.data?.detail
      toast.error(detail ? `Error: ${detail}` : "Error al procesar el reembolso")
    }
  }

  const handleNumpadModeChange = useCallback((mode: NumpadMode) => {
    setNumpadMode(mode)
    setNumpadBuffer("")
  }, [])

  const handleNavigate = useCallback((module: ModuleId) => {
    if (module === "compras") router.push("/compras")
    else if (module === "inventario") router.push("/inventario")
    else if (module === "ajustes" as any) router.push("/ajustes")
    else if (module === "taller" as any) router.push("/quotes-ot")
    else if (module === "reportes") router.push("/dashboard")
    else if (module === "clientes" as any) setCurrentModule("clientes" as any)
    else setCurrentModule(module)
  }, [router])

  const handleConfirmCloseSession = async (finalCash: number, notes: string) => {
    if (!activeSession) return
    try {
      await apiService.closeSession(activeSession.id, finalCash, notes)
      toast.success("Sesión cerrada")
      setPaidOrders([])
      mutate("/sessions/active")
      mutate("/products/")
      setShowCloseSession(false)
      setCurrentModule("backend")
    } catch (error) {
      toast.error("Error al cerrar sesión")
    }
  }

  const handleConfirmOpenSession = async (initialCash: number, registerId: string, userId: string, notes: string) => {
    try {
      await apiService.openSession(initialCash, registerId, userId, notes)
      toast.success("Sesión iniciada")
      setPaidOrders([])
      mutate("/sessions/active")
      mutate("/products/")
      setShowOpenSession(false)
    } catch (error) {
      toast.error("Error al iniciar sesión")
    }
  }

  const uiActiveSession = activeSession ? {
    id: String(activeSession.id),
    name: `Terminal: ${activeSession.cash_register?.name || 'Caja Principal'}`,
    openedAt: new Date(activeSession.opened_at),
    closedAt: activeSession.closed_at ? new Date(activeSession.closed_at) : null,
    openedBy: activeSession.user_id,
    status: activeSession.status as any,
    openingBalance: Number(activeSession.opening_balance),
    closingBalance: Number(activeSession.closing_balance) || null,
    orders: paidOrders,
    notes: activeSession.notes || ""
  } : null

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-[#f8fafc]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
  }

  return (
    <ProtectedRoute>
      {currentModule === null ? (
        <div className="flex h-screen items-center justify-center bg-[#f8fafc]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
      ) : currentModule === "backend" ? (
        <BackendDashboard onNavigate={handleNavigate} />
      ) : currentModule === "clientes" as any ? (
        <CustomersModule onBack={() => setCurrentModule("backend")} />
      ) : !activeSession?.id ? (
        <div className="flex flex-col h-screen bg-[#f8fafc] items-center justify-center p-4 gap-4">
          <h1 className="text-4xl font-black">Punto de Venta</h1>
          <Button onClick={() => setShowOpenSession(true)} size="lg" className="h-20 w-full max-w-md text-xl font-bold bg-primary rounded-2xl">INICIAR JORNADA</Button>
          <button
            onClick={() => setCurrentModule("backend")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium flex items-center gap-1.5 opacity-60 hover:opacity-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
            Volver al Tablero
          </button>
          <PdvOpenSession open={showOpenSession} onClose={() => setShowOpenSession(false)} onConfirm={handleConfirmOpenSession} />
        </div>
      ) : (
        <div className="flex h-screen flex-col overflow-hidden bg-background">
          <PdvHeader
            currentOrder={currentOrder}
            orders={orders}
            paidOrders={paidOrders}
            onNewOrder={handleNewOrder}
            onRemoveOrder={handleRemoveOrder}
            onSelectOrder={handleSelectOrder}
            onOpenHistory={() => setShowHistory(true)}
            onGoToBackend={() => setCurrentModule("backend")}
            onOpenCloseSession={() => setShowCloseSession(true)}
            // onOpenOtPayment={() => setShowOtPayment(true)} // OT_HIDDEN
            onOpenVehicleHistory={() => setShowVehicleHistory(true)}
            onOpenExpenseMode={() => setShowExpenseMode(true)}
            activeSessionName={uiActiveSession?.name}
            userName={user?.full_name || user?.username}
            sessionId={activeSession?.id}
            customersList={mappedApiCustomers}
            onCustomerCreated={() => mutate("/customers/")}
          />

          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className="flex flex-1 flex-col overflow-hidden">
              <PdvCategories categories={visibleCategories} selectedCategoryId={selectedCategoryId} onSelectCategory={setSelectedCategoryId} />
              <div className="flex-1 min-h-0 overflow-hidden p-4 pt-0 flex flex-col">
                <PdvProductGrid
                  products={filteredProducts}
                  selectedCategoryId={selectedCategoryId}
                  onAddProduct={handleAddProduct}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              </div>
            </div>

            <PdvOrderPanel
              order={currentOrder}
              lines={currentOrder?.lines || []}
              subtotal={currentOrder?.subtotal || 0}
              tax={currentOrder?.tax || 0}
              total={currentOrder?.total || 0}
              selectedLineId={selectedLineId}
              onSelectLine={(id) => { setSelectedLineId(id); setNumpadBuffer(""); }}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveLine={handleRemoveLine}
              onPay={() => setShowPayment(true)}
              numpadMode={numpadMode}
              onNumpadModeChange={handleNumpadModeChange}
              onNumpadInput={handleNumpadInput}
              // onCargarOt={() => setShowOtPayment(true)} // OT_HIDDEN
              customersList={mappedApiCustomers}
              onSetCustomer={handleSetCurrentOrderCustomer}
              onCustomerCreated={() => mutate("/customers/")}
            />
          </div>

          <PdvPaymentModal open={showPayment} onClose={() => setShowPayment(false)} total={currentOrder?.total || 0} onConfirmPayment={handleConfirmPayment} />
          {/* OT_HIDDEN: Modal pago de OT — reactivar con OTs */}
          {/* <PdvOtPaymentModal open={showOtPayment} onClose={() => setShowOtPayment(false)} onConfirm={handleConfirmOtPayment} selectedCustomer={currentOrder?.customer ?? null} /> */}
          <PdvOrderHistory open={showHistory} onClose={() => setShowHistory(false)} paidOrders={paidOrders} onRefund={handleRefund} />
          {activeSession && <PdvCloseSession open={showCloseSession} onClose={() => setShowCloseSession(false)} session={uiActiveSession!} onConfirmClose={handleConfirmCloseSession} />}
          <PdvRefundModal open={showRefund} order={refundOrder} onClose={() => setShowRefund(false)} onConfirm={handleConfirmRefund} />
          <PdvVehicleHistory open={showVehicleHistory} onOpenChange={setShowVehicleHistory} initialPlate={currentOrder?.customer?.vehicles?.[0]?.license_plate} />
          <PdvExpenseMode open={showExpenseMode} onOpenChange={setShowExpenseMode} sessionId={activeSession?.id} />
          
          <AlertDialog open={!!orderToRemoveId} onOpenChange={(o) => !o && setOrderToRemoveId(null)}>
            <AlertDialogContent className="sm:max-w-[425px] bg-background border border-border/50 shadow-2xl backdrop-blur-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-bold">Cerrar Orden</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground text-sm">
                  ¿Estás seguro de que deseas eliminar esta orden? Tiene productos agregados y la información se perderá.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => orderToRemoveId && confirmOrderRemoval(orderToRemoveId)} 
                  className="bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg shadow-red-500/20 transition-all font-bold"
                >
                  Cerrar y Descartar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </ProtectedRoute>
  )
}
