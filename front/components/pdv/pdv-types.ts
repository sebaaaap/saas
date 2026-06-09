export interface Product {
  id: string
  name: string
  price: number
  cost?: number
  categoryId: string
  barcode?: string
  image?: string
  stock: number
  stockMin?: number
  tax: number // percentage
  color: string
  unit?: string // "pza", "lt", "servicio", etc.
  productType?: string // "SERVICE", "STORABLE"
  isVariableConsumption?: boolean
  defaultConsumptionRate?: number
  isRawMaterial?: boolean
  isDerived?: boolean
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  parent_id?: string | null
  full_path?: string
}

export interface OrderLine {
  id: string
  product: Product
  quantity: number
  unitPrice: number
  discount: number
  consumptionRate: number
  stockReduced?: number
  subtotal: number
  error?: string // Message for specific line errors (e.g. "Stock Insuficiente")
}

export interface Order {
  id: string
  lines: OrderLine[]
  customer: Customer | null
  total: number
  tax: number
  subtotal: number
  date: Date
  status: "draft" | "paid" | "refunded" | "cancelled"
  paymentMethod?: PaymentMethod
  amountPaid?: number
  refundedFrom?: string
  returnToStock?: boolean
  originalTicketId?: string
  isWorkOrder?: boolean
  financialProgress?: number
  operationalProgress?: number
  workOrderState?: string
  documentType?: string
  comment?: string
}

export interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  rfc?: string
  rut?: string
  vehicle?: string
}

export interface PaymentMethod {
  id: string
  name: string
  icon: string
  key: string
  type: string // "cash", "card", "transfer", "custom", etc.
}

export type NumpadMode = "quantity" | "price" | "discount" | "consumption"

// --- Session Types (Odoo-style) ---

export interface PosSession {
  id: string
  name: string // e.g. "Sesion 001"
  openedAt: Date
  closedAt: Date | null
  openedBy: string
  status: "open" | "closing" | "closed"
  openingBalance: number // Cash at session start
  closingBalance: number | null // Cash counted at end
  orders: Order[]
  notes: string
}

export interface SessionSummary {
  totalOrders: number
  totalSales: number
  totalRefunds: number
  totalTax: number
  netSales: number // totalSales - totalRefunds
  avgTicket: number
  paymentBreakdown: {
    method: string
    type: string
    count: number
    total: number
  }[]
  productBreakdown: {
    productId: string
    productName: string
    quantity: number
    total: number
  }[]
  categoryBreakdown: {
    categoryId: string
    categoryName: string
    total: number
    count: number
  }[]
  hourlyBreakdown: {
    hour: string
    count: number
    total: number
  }[]
}

export type PdvView = "tablero" | "pedidos" | "sesiones"
