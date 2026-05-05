"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { PosSession, SessionSummary, Order } from "./pdv-types"
import { toNum } from "@/lib/utils-numbers"
import { categories } from "./pdv-data"
import {
  BarChart3,
  ShoppingBag,
  CreditCard,
  FileText,
  TrendingUp,
  TrendingDown,
  Receipt,
  DollarSign,
  Hash,
  Clock,
  User,
  Car,
  Banknote,
  ArrowLeftRight,
  Printer,
  Download,
  ChevronRight,
  Package,
  RotateCcw,
} from "lucide-react"

type ReportTab = "resumen" | "pedidos" | "pagos" | "detalle"

interface PdvSessionReportProps {
  session: PosSession
  onClose: () => void
}

function computeSummary(session: PosSession): SessionSummary {
  const paidOrders = session.orders.filter((o) => o.status === "paid")
  const refundOrders = session.orders.filter((o) => o.status === "refunded" && o.refundedFrom)

  const totalSales = paidOrders.reduce((acc, o) => acc + o.total, 0)
  const totalRefunds = refundOrders.reduce((acc, o) => acc + Math.abs(o.total), 0)
  const totalTax = paidOrders.reduce((acc, o) => acc + o.tax, 0)
  const netSales = totalSales - totalRefunds
  const avgTicket = paidOrders.length > 0 ? totalSales / paidOrders.length : 0

  // Payment breakdown
  const paymentMap = new Map<string, { method: string; type: string; count: number; total: number }>()
  for (const o of paidOrders) {
    if (o.paymentMethod) {
      const key = o.paymentMethod.id
      const existing = paymentMap.get(key)
      if (existing) {
        existing.count += 1
        existing.total += o.total
      } else {
        paymentMap.set(key, {
          method: o.paymentMethod.name,
          type: o.paymentMethod.type,
          count: 1,
          total: o.total,
        })
      }
    }
  }

  // Product breakdown
  const productMap = new Map<string, { productId: string; productName: string; quantity: number; total: number }>()
  for (const o of paidOrders) {
    for (const line of o.lines) {
      const key = line.product.id
      const existing = productMap.get(key)
      if (existing) {
        existing.quantity += line.quantity
        existing.total += line.subtotal
      } else {
        productMap.set(key, {
          productId: line.product.id,
          productName: line.product.name,
          quantity: line.quantity,
          total: line.subtotal,
        })
      }
    }
  }

  // Category breakdown
  const catMap = new Map<string, { categoryId: string; categoryName: string; total: number; count: number }>()
  for (const o of paidOrders) {
    for (const line of o.lines) {
      const key = line.product.categoryId
      const cat = categories.find((c) => c.id === key)
      const existing = catMap.get(key)
      if (existing) {
        existing.count += line.quantity
        existing.total += line.subtotal
      } else {
        catMap.set(key, {
          categoryId: key,
          categoryName: cat?.name ?? key,
          total: line.subtotal,
          count: line.quantity,
        })
      }
    }
  }

  // Hourly breakdown
  const hourMap = new Map<string, { hour: string; count: number; total: number }>()
  for (const o of paidOrders) {
    const h = o.date.getHours()
    const key = `${h.toString().padStart(2, "0")}:00`
    const existing = hourMap.get(key)
    if (existing) {
      existing.count += 1
      existing.total += o.total
    } else {
      hourMap.set(key, { hour: key, count: 1, total: o.total })
    }
  }

  return {
    totalOrders: paidOrders.length,
    totalSales,
    totalRefunds,
    totalTax,
    netSales,
    avgTicket,
    paymentBreakdown: Array.from(paymentMap.values()),
    productBreakdown: Array.from(productMap.values()).sort((a, b) => b.total - a.total),
    categoryBreakdown: Array.from(catMap.values()).sort((a, b) => b.total - a.total),
    hourlyBreakdown: Array.from(hourMap.values()).sort((a, b) => a.hour.localeCompare(b.hour)),
  }
}

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)

const formatTime = (date: Date) =>
  new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)

function getPaymentIcon(type?: string) {
  switch (type) {
    case "cash":
      return <Banknote className="h-4 w-4" />
    case "card":
      return <CreditCard className="h-4 w-4" />
    case "transfer":
      return <ArrowLeftRight className="h-4 w-4" />
    default:
      return <Banknote className="h-4 w-4" />
  }
}

export function PdvSessionReport({ session, onClose }: PdvSessionReportProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>("resumen")
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const summary = useMemo(() => computeSummary(session), [session])

  const tabs: { id: ReportTab; label: string; icon: typeof BarChart3 }[] = [
    { id: "resumen", label: "Resumen", icon: BarChart3 },
    { id: "pedidos", label: "Pedidos", icon: ShoppingBag },
    { id: "pagos", label: "Pagos", icon: CreditCard },
    { id: "detalle", label: "Detalle de Venta", icon: FileText },
  ]

  const selectedOrder = selectedOrderId
    ? session.orders.find((o) => o.id === selectedOrderId)
    : null

  const elapsed = session.closedAt
    ? session.closedAt.getTime() - session.openedAt.getTime()
    : Date.now() - session.openedAt.getTime()
  const hours = Math.floor(elapsed / 3600000)
  const minutes = Math.floor((elapsed % 3600000) / 60000)

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Report Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <div className="h-5 w-px bg-border" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground">{session.name}</h1>
              <Badge
                variant={session.status === "open" ? "default" : "secondary"}
                className="h-5 rounded-full px-2 text-[10px]"
              >
                {session.status === "open" ? "Abierta" : "Cerrada"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {formatDate(session.openedAt)} &middot; {hours}h {minutes}m &middot; {session.openedBy}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-lg bg-transparent">
            <Printer className="h-3.5 w-3.5" />
            Imprimir
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-lg bg-transparent">
            <Download className="h-3.5 w-3.5" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border bg-card px-6">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id)
                setSelectedOrderId(null)
              }}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "resumen" && <ResumenTab summary={summary} session={session} />}
        {activeTab === "pedidos" && (
          <PedidosTab
            orders={session.orders}
            selectedOrderId={selectedOrderId}
            onSelectOrder={setSelectedOrderId}
            selectedOrder={selectedOrder ?? null}
          />
        )}
        {activeTab === "pagos" && <PagosTab summary={summary} orders={session.orders} />}
        {activeTab === "detalle" && <DetalleTab summary={summary} />}
      </div>
    </div>
  )
}

// --- RESUMEN TAB ---
function ResumenTab({ summary, session }: { summary: SessionSummary; session: PosSession }) {
  const maxHourly = Math.max(...summary.hourlyBreakdown.map((h) => h.total), 1)

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label="Ventas Totales"
            value={`$${toNum(summary.totalSales).toFixed(2)}`}
            icon={TrendingUp}
            accent="text-success"
            bgAccent="bg-success/10"
          />
          <KpiCard
            label="Pedidos"
            value={summary.totalOrders.toString()}
            icon={ShoppingBag}
            accent="text-primary"
            bgAccent="bg-primary/10"
          />
          <KpiCard
            label="Ticket Promedio"
            value={`$${toNum(summary.avgTicket).toFixed(2)}`}
            icon={Receipt}
            accent="text-secondary"
            bgAccent="bg-secondary/10"
          />
          <KpiCard
            label="Reembolsos"
            value={`$${toNum(summary.totalRefunds).toFixed(2)}`}
            icon={TrendingDown}
            accent="text-destructive"
            bgAccent="bg-destructive/10"
          />
        </div>

        {/* Net Sales + Tax */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Ventas Netas</p>
            <p className="text-xl font-black text-foreground">${toNum(summary.netSales).toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">IVA Recaudado</p>
            <p className="text-xl font-black text-foreground">${toNum(summary.totalTax).toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Saldo Inicial</p>
            <p className="text-xl font-black text-foreground">${toNum(session.openingBalance).toFixed(2)}</p>
          </div>
        </div>

        {/* Payment Breakdown + Category Breakdown side by side */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Payment Breakdown */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Desglose por Pago
            </h3>
            <div className="space-y-3">
              {summary.paymentBreakdown.map((pm) => (
                <div key={pm.method} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {getPaymentIcon(pm.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">{pm.method}</span>
                      <span className="text-xs font-bold text-foreground">${toNum(pm.total).toFixed(2)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${summary.totalSales > 0 ? (pm.total / summary.totalSales) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{pm.count} transacciones</p>
                  </div>
                </div>
              ))}
              {summary.paymentBreakdown.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Sin pagos registrados</p>
              )}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Ventas por Categoria
            </h3>
            <div className="space-y-3">
              {summary.categoryBreakdown.map((cat) => (
                <div key={cat.categoryId} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">{cat.categoryName}</span>
                      <span className="text-xs font-bold text-foreground">${toNum(cat.total).toFixed(2)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-secondary transition-all"
                        style={{ width: `${summary.totalSales > 0 ? (cat.total / summary.totalSales) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{cat.count} unidades</p>
                  </div>
                </div>
              ))}
              {summary.categoryBreakdown.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Sin ventas registradas</p>
              )}
            </div>
          </div>
        </div>

        {/* Hourly Chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Ventas por Hora
          </h3>
          {summary.hourlyBreakdown.length > 0 ? (
            <div className="flex items-end gap-2 h-32">
              {summary.hourlyBreakdown.map((h) => (
                <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[9px] font-semibold text-foreground">${toNum(h.total).toFixed(0)}</span>
                  <div
                    className="w-full rounded-t-md bg-primary/80 transition-all min-h-[4px]"
                    style={{ height: `${(h.total / maxHourly) * 100}%` }}
                  />
                  <span className="text-[9px] text-muted-foreground">{h.hour}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">Sin datos de horas</p>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  bgAccent,
}: {
  label: string
  value: string
  icon: typeof TrendingUp
  accent: string
  bgAccent: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgAccent}`}>
          <Icon className={`h-5 w-5 ${accent}`} />
        </div>
      </div>
      <p className="text-xl font-black text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

// --- PEDIDOS TAB ---
function PedidosTab({
  orders,
  selectedOrderId,
  onSelectOrder,
  selectedOrder,
}: {
  orders: Order[]
  selectedOrderId: string | null
  onSelectOrder: (id: string | null) => void
  selectedOrder: Order | null
}) {
  const [filter, setFilter] = useState<"all" | "paid" | "refunded">("all")

  const filtered = orders.filter((o) => {
    if (filter === "all") return o.status !== "draft"
    return o.status === filter
  })

  return (
    <div className="flex h-full">
      {/* Orders List */}
      <div className="flex w-[360px] flex-col border-r border-border">
        {/* Filter */}
        <div className="flex items-center gap-1 border-b border-border px-4 py-2">
          {(["all", "paid", "refunded"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${filter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
                }`}
            >
              {f === "all" ? "Todos" : f === "paid" ? "Pagados" : "Reembolsos"}
              {" "}
              ({orders.filter((o) => f === "all" ? o.status !== "draft" : o.status === f).length})
            </button>
          ))}
        </div>

        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ShoppingBag className="mb-3 h-10 w-10 opacity-20" />
              <p className="text-xs font-medium">Sin pedidos</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => onSelectOrder(order.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${selectedOrderId === order.id
                      ? "bg-primary/5 border-l-2 border-l-primary"
                      : "hover:bg-muted/50"
                    }`}
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${order.status === "refunded" ? "bg-destructive/10" : "bg-success/10"
                    }`}>
                    {order.status === "refunded" ? (
                      <RotateCcw className="h-4 w-4 text-destructive" />
                    ) : (
                      <Receipt className="h-4 w-4 text-success" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{order.id}</span>
                      {order.refundedFrom && (
                        <Badge variant="destructive" className="h-4 rounded px-1 text-[9px]">
                          Reembolso
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {order.customer?.name ?? "Publico en General"} &middot; {formatTime(order.date)}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${order.total < 0 ? "text-destructive" : "text-foreground"
                    }`}>
                    {order.total < 0 ? "-" : ""}${toNum(Math.abs(order.total)).toFixed(2)}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Order Detail */}
      <div className="flex flex-1 flex-col">
        {selectedOrder ? (
          <ScrollArea className="flex-1">
            <div className="p-6">
              {/* Order header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">{selectedOrder.id}</h3>
                  <p className="text-xs text-muted-foreground">{formatDate(selectedOrder.date)}</p>
                </div>
                <Badge
                  variant={selectedOrder.status === "refunded" ? "destructive" : "default"}
                  className="rounded-full"
                >
                  {selectedOrder.status === "refunded" ? "Reembolsado" : "Pagado"}
                </Badge>
              </div>

              {/* Customer */}
              {selectedOrder.customer && (
                <div className="flex items-center gap-4 rounded-lg bg-muted/50 px-4 py-2.5 mb-4">
                  <div className="flex items-center gap-1.5 text-xs">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{selectedOrder.customer.name}</span>
                  </div>
                  {selectedOrder.customer.vehicle && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Car className="h-3.5 w-3.5" />
                      <span>{selectedOrder.customer.vehicle}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Lines */}
              <table className="w-full text-xs mb-4">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="pb-2">Producto</th>
                    <th className="pb-2 text-center">Cant.</th>
                    <th className="pb-2 text-right">P. Unit.</th>
                    <th className="pb-2 text-right">Desc.</th>
                    <th className="pb-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedOrder.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="py-2.5 font-medium text-foreground pr-3">{line.product.name}</td>
                      <td className="py-2.5 text-center text-muted-foreground">{line.quantity}</td>
                      <td className="py-2.5 text-right text-muted-foreground">${toNum(line.unitPrice).toFixed(2)}</td>
                      <td className="py-2.5 text-right text-muted-foreground">
                        {line.discount > 0 ? `${line.discount}%` : "-"}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-foreground">${toNum(line.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${toNum(selectedOrder.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>IVA</span>
                  <span>${toNum(selectedOrder.tax).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-border pt-2">
                  <span className="text-sm font-bold text-foreground">Total</span>
                  <span className={`text-lg font-black ${selectedOrder.total < 0 ? "text-destructive" : "text-primary"}`}>
                    {selectedOrder.total < 0 ? "-" : ""}${toNum(Math.abs(selectedOrder.total)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment info */}
              {selectedOrder.paymentMethod && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2.5 text-xs text-muted-foreground">
                  {getPaymentIcon(selectedOrder.paymentMethod.type)}
                  <span>Pagado con <span className="font-medium text-foreground">{selectedOrder.paymentMethod.name}</span></span>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
            <Receipt className="mb-3 h-12 w-12 opacity-20" />
            <p className="text-sm font-medium">Selecciona un pedido</p>
            <p className="text-xs">Haz clic en un pedido para ver los detalles</p>
          </div>
        )}
      </div>
    </div>
  )
}

// --- PAGOS TAB ---
function PagosTab({ summary, orders }: { summary: SessionSummary; orders: Order[] }) {
  const paidOrders = orders.filter((o) => o.status === "paid" || (o.status === "refunded" && o.refundedFrom))

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Payment Method Cards */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {summary.paymentBreakdown.map((pm) => (
            <div key={pm.method} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {getPaymentIcon(pm.type)}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{pm.method}</p>
                  <p className="text-[11px] text-muted-foreground">{pm.count} transacciones</p>
                </div>
              </div>
              <p className="text-2xl font-black text-foreground">${toNum(pm.total).toFixed(2)}</p>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${summary.totalSales > 0 ? (pm.total / summary.totalSales) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {summary.totalSales > 0 ? ((pm.total / summary.totalSales) * 100).toFixed(1) : 0}% del total
              </p>
            </div>
          ))}
          {summary.paymentBreakdown.length === 0 && (
            <div className="col-span-3 flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CreditCard className="mb-3 h-10 w-10 opacity-20" />
              <p className="text-xs font-medium">Sin pagos registrados</p>
            </div>
          )}
        </div>

        {/* Transaction Log */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Registro de Transacciones
            </h3>
          </div>
          <div className="divide-y divide-border">
            {paidOrders.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                Sin transacciones
              </div>
            ) : (
              paidOrders.map((order) => (
                <div key={order.id} className="flex items-center gap-4 px-5 py-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${order.total < 0 ? "bg-destructive/10" : "bg-success/10"
                    }`}>
                    {order.total < 0 ? (
                      <RotateCcw className="h-4 w-4 text-destructive" />
                    ) : (
                      getPaymentIcon(order.paymentMethod?.type)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{order.id}</span>
                      <span className="text-[10px] text-muted-foreground">{order.paymentMethod?.name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {order.customer?.name ?? "Publico en General"} &middot; {formatTime(order.date)}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${order.total < 0 ? "text-destructive" : "text-foreground"}`}>
                    {order.total < 0 ? "-" : "+"}${toNum(Math.abs(order.total)).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

// --- DETALLE TAB ---
function DetalleTab({ summary }: { summary: SessionSummary }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Top products table */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Hash className="h-4 w-4 text-primary" />
              Productos Vendidos
            </h3>
          </div>
          {summary.productBreakdown.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-5 py-2.5">#</th>
                  <th className="py-2.5">Producto</th>
                  <th className="py-2.5 text-center">Cantidad</th>
                  <th className="py-2.5 text-right pr-5">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summary.productBreakdown.map((p, i) => (
                  <tr key={p.productId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-2.5 text-muted-foreground">{i + 1}</td>
                    <td className="py-2.5 font-medium text-foreground">{p.productName}</td>
                    <td className="py-2.5 text-center text-muted-foreground">{p.quantity}</td>
                    <td className="py-2.5 text-right font-bold text-foreground pr-5">${toNum(p.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td className="px-5 py-2.5" />
                  <td className="py-2.5 font-bold text-foreground">Total</td>
                  <td className="py-2.5 text-center font-bold text-foreground">
                    {summary.productBreakdown.reduce((a, b) => a + b.quantity, 0)}
                  </td>
                  <td className="py-2.5 text-right font-black text-primary pr-5">
                    ${summary.productBreakdown.reduce((a, b) => a + b.total, 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
              Sin productos vendidos
            </div>
          )}
        </div>

        {/* Category Summary */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Resumen por Categoria
            </h3>
          </div>
          {summary.categoryBreakdown.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-5 py-2.5">Categoria</th>
                  <th className="py-2.5 text-center">Unidades</th>
                  <th className="py-2.5 text-right">Total</th>
                  <th className="py-2.5 text-right pr-5">% Ventas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summary.categoryBreakdown.map((cat) => (
                  <tr key={cat.categoryId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-2.5 font-medium text-foreground">{cat.categoryName}</td>
                    <td className="py-2.5 text-center text-muted-foreground">{cat.count}</td>
                    <td className="py-2.5 text-right font-bold text-foreground">${toNum(cat.total).toFixed(2)}</td>
                    <td className="py-2.5 text-right pr-5 text-muted-foreground">
                      {summary.totalSales > 0 ? ((cat.total / summary.totalSales) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
              Sin ventas por categoria
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}
