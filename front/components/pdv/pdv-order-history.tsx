"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Order } from "./pdv-types"
import { toNum } from "@/lib/utils-numbers"
import {
  Clock,
  Search,
  Receipt,
  Printer,
  RotateCcw,
  ChevronRight,
  Banknote,
  CreditCard,
  ArrowLeftRight,
  User,
  Car,
  FileText,
  MessageSquare
} from "lucide-react"

interface PdvOrderHistoryProps {
  open: boolean
  onClose: () => void
  paidOrders: Order[]
  onRefund: (order: Order) => void
}

export function PdvOrderHistory({
  open,
  onClose,
  paidOrders,
  onRefund,
}: PdvOrderHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showRefundConfirm, setShowRefundConfirm] = useState(false)

  const filteredOrders = paidOrders.filter((order) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      order.id.toLowerCase().includes(q) ||
      order.customer?.name.toLowerCase().includes(q) ||
      order.lines.some((l) => l.product.name.toLowerCase().includes(q))
    )
  })

  const getPaymentIcon = (type?: string) => {
    switch (type) {
      case "cash":
        return <Banknote className="h-3.5 w-3.5" />
      case "card":
        return <CreditCard className="h-3.5 w-3.5" />
      case "transfer":
        return <ArrowLeftRight className="h-3.5 w-3.5" />
      default:
        return <Banknote className="h-3.5 w-3.5" />
    }
  }

  const handleRefund = () => {
    if (selectedOrder) {
      onRefund(selectedOrder)
      setShowRefundConfirm(false)
      setSelectedOrder(null)
      onClose()
    }
  }

  const handleClose = () => {
    setSelectedOrder(null)
    setShowRefundConfirm(false)
    setSearchQuery("")
    onClose()
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl rounded-2xl p-0 gap-0 overflow-hidden max-h-[85vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>Historial de ordenes</DialogTitle>
          <DialogDescription>Ver ordenes pagadas y gestionar reembolsos</DialogDescription>
        </DialogHeader>

        <div className="flex h-[75vh]">
          {/* Left: Order List */}
          <div className="flex w-[340px] flex-col border-r border-border">
            {/* Header */}
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4.5 w-4.5 text-primary" />
                <h2 className="text-base font-bold text-foreground">Historial de Ordenes</h2>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por # de orden o cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input pl-9 text-xs"
                />
              </div>
            </div>

            {/* Orders List */}
            <ScrollArea className="flex-1">
              {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Receipt className="mb-3 h-10 w-10 opacity-20" />
                  <p className="text-xs font-medium">Sin ordenes</p>
                  <p className="text-[11px]">No hay ordenes pagadas aun</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredOrders.map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => {
                        setSelectedOrder(order)
                        setShowRefundConfirm(false)
                      }}
                      className={`flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors ${selectedOrder?.id === order.id
                        ? "bg-primary/5 border-l-2 border-l-primary"
                        : "hover:bg-muted/50"
                        }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-foreground">{order.id}</span>
                          <Badge
                            variant={order.total < 0 ? "destructive" : order.isWorkOrder ? "default" : order.status === "refunded" ? "outline" : "secondary"}
                            className="h-4 rounded px-1.5 text-[9px]"
                          >
                            {order.total < 0 ? "Nota Crédito" : order.isWorkOrder ? "Orden Trabajo" : order.status === "refunded" ? "Reembolsado" : "Pagado"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate">{order.customer?.name ?? "Publico en General"}</span>
                          {order.isWorkOrder && order.customer?.vehicle && (
                            <>
                              <span className="mx-0.5">•</span>
                              <Car className="h-3 w-3" />
                              <span>{order.customer.vehicle}</span>
                            </>
                          )}
                        </div>

                        {order.isWorkOrder && (
                          <div className="flex flex-col gap-1 mt-1.5 mb-0.5 w-[140px]">
                            <div className="flex items-center gap-1.5 text-[9px]">
                              <span className="w-9 text-muted-foreground">Pago</span>
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-green-500" style={{ width: `${order.financialProgress || 0}%` }} />
                              </div>
                              <span className="w-6 text-right font-medium">{Math.round(order.financialProgress || 0)}%</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[9px]">
                              <span className="w-9 text-muted-foreground">Trabajo</span>
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${order.operationalProgress || 0}%` }} />
                              </div>
                              <span className="w-6 text-right font-medium">{Math.round(order.operationalProgress || 0)}%</span>
                            </div>
                          </div>
                        )}
                        {!order.isWorkOrder && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(order.date)}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-sm font-bold ${order.total < 0 ? "text-destructive" : "text-foreground"}`}>
                          ${toNum(order.total).toFixed(2)}
                        </span>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          {getPaymentIcon(order.paymentMethod?.type)}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right: Order Detail */}
          <div className="flex flex-1 flex-col">
            {selectedOrder ? (
              <>
                {/* Detail Header */}
                <div className="border-b border-border px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{selectedOrder.id}</h3>
                      <p className="text-[11px] text-muted-foreground">{formatDate(selectedOrder.date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-lg bg-transparent">
                        <Printer className="h-3.5 w-3.5" />
                        Reimprimir
                      </Button>
                      {selectedOrder.status === "paid" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRefundConfirm(true)}
                          className="gap-1.5 text-xs rounded-lg bg-transparent text-destructive border-destructive/30 hover:bg-destructive/10"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reembolsar
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Customer info */}
                  {selectedOrder.customer && (
                    <div className="mt-3 flex items-center gap-4 rounded-lg bg-muted/50 px-3 py-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
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

                  {/* Document & Comment info */}
                  {(selectedOrder.documentType || selectedOrder.comment) && (
                    <div className="mt-2 flex flex-col gap-2 rounded-lg bg-muted/30 px-3 py-2 border border-border/50">
                      {selectedOrder.documentType && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {selectedOrder.documentType === 'factura' ? <FileText className="h-3.5 w-3.5 text-primary" /> : <Receipt className="h-3.5 w-3.5" />}
                          <span className="font-medium text-foreground capitalize">
                            {selectedOrder.documentType}
                          </span>
                        </div>
                      )}
                      {selectedOrder.comment && (
                        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span className="italic">{selectedOrder.comment}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Order Lines */}
                <ScrollArea className="flex-1">
                  <div className="px-6 py-4">
                    <table className="w-full text-xs">
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
                            <td className="py-2.5 font-medium text-foreground pr-3">
                              <span className="block">{line.product.name}</span>
                              {line.stockReduced && Math.abs(line.stockReduced - line.quantity) > 0.001 && (
                                <span className="block text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                                  Consumo: {toNum(line.stockReduced).toFixed(3)} {line.product.unit} (Tasa: {toNum(line.consumptionRate).toFixed(3)})
                                </span>
                              )}
                            </td>
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
                  </div>
                </ScrollArea>

                {/* Totals */}
                <div className="border-t border-border px-6 py-4">
                  <div className="space-y-1">
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
                        ${toNum(selectedOrder.total).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Info */}
                  {selectedOrder.paymentMethod && (
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        {getPaymentIcon(selectedOrder.paymentMethod.type)}
                        <span>Pagado con {selectedOrder.paymentMethod.name}</span>
                      </div>
                      {selectedOrder.amountPaid && selectedOrder.paymentMethod.type === "cash" && (
                        <span className="text-muted-foreground">
                          Recibido: ${toNum(selectedOrder.amountPaid).toFixed(2)} | Cambio: ${(toNum(selectedOrder.amountPaid) - toNum(selectedOrder.total)).toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Refund Confirmation */}
                {showRefundConfirm && (
                  <div className="border-t-2 border-destructive bg-destructive/5 px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 shrink-0">
                        <RotateCcw className="h-4.5 w-4.5 text-destructive" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-destructive">Confirmar Reembolso</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Se creara una nota de credito por ${toNum(selectedOrder.total).toFixed(2)} y se devolvera el monto al cliente.
                          Los productos se reingresaran al inventario.
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleRefund}
                            className="gap-1.5 text-xs rounded-lg"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Confirmar Reembolso
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowRefundConfirm(false)}
                            className="text-xs rounded-lg bg-transparent"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
                <Receipt className="mb-3 h-12 w-12 opacity-20" />
                <p className="text-sm font-medium">Selecciona una orden</p>
                <p className="text-xs">Haz clic en una orden para ver los detalles</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
