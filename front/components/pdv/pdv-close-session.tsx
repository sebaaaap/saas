"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { PosSession } from "./pdv-types"
import { toNum } from "@/lib/utils-numbers"
import {
  XCircle,
  CheckCircle2,
  Banknote,
  CreditCard,
  ArrowLeftRight,
  Calculator,
  AlertTriangle,
  DollarSign,
} from "lucide-react"

interface PdvCloseSessionProps {
  open: boolean
  onClose: () => void
  session: PosSession
  onConfirmClose: (closingBalance: number, notes: string) => void
}

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

export function PdvCloseSession({
  open,
  onClose,
  session,
  onConfirmClose,
}: PdvCloseSessionProps) {
  const [closingCash, setClosingCash] = useState("")
  const [notes, setNotes] = useState("")
  const [step, setStep] = useState<"count" | "summary">("count")

  // Consideramos todas las órdenes procesadas (pagadas o reembolsadas/notas de crédito)
  const processedOrders = useMemo(() =>
    session.orders.filter((o) => o.status === "paid" || o.status === "refunded"),
    [session.orders]
  )

  const stats = useMemo(() => {
    const salesByMethod: Record<string, { name: string, amount: number }> = {
      cash: { name: "Efectivo", amount: 0 },
      card: { name: "Tarjeta", amount: 0 },
      transfer: { name: "Transferencia", amount: 0 },
    }
    let totalRefunds = 0
    let totalOrdersCount = 0

    processedOrders.forEach(o => {
      const type = o.paymentMethod?.type || "cash"
      const name = o.paymentMethod?.name || "Efectivo"
      const amount = Number(o.total) || 0

      if (amount > 0) totalOrdersCount++
      if (amount < 0) totalRefunds += Math.abs(amount)

      if (!salesByMethod[type]) {
        salesByMethod[type] = { name, amount: 0 }
      }
      salesByMethod[type].amount += amount
    })

    const cashSales = salesByMethod["cash"].amount
    const totalSales = Object.values(salesByMethod).reduce((acc, val) => acc + val.amount, 0)
    
    // Castear openingBalance también porque viene de Numeric(12,2) → string
    const openingBalance = Number(session?.openingBalance) || 0
    const expectedCash = openingBalance + cashSales

    return {
      salesByMethod,
      cashSales,
      totalRefunds,
      totalSales,
      totalOrders: totalOrdersCount,
      expectedCash,
      openingBalance
    }
  }, [processedOrders, session?.openingBalance])

  const closingCashNum = Number.parseFloat(closingCash) || 0
  const expectedCash = stats.expectedCash || 0
  const difference = closingCashNum - expectedCash

  const handleConfirm = () => {
    onConfirmClose(closingCashNum, notes)
    setClosingCash("")
    setNotes("")
    setStep("count")
  }

  const handleCancel = () => {
    onClose()
    setClosingCash("")
    setNotes("")
    setStep("count")
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-lg rounded-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Cerrar sesion del PdV</DialogTitle>
          <DialogDescription>Conteo de caja y cierre de la sesion actual</DialogDescription>
        </DialogHeader>

        {step === "count" ? (
          <div className="flex flex-col">
            {/* Header */}
            <div className="border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Cerrar Sesion</h2>
                  <p className="text-xs text-muted-foreground">{session.name} - Conteo de caja</p>
                </div>
              </div>
            </div>

            {/* Session Stats */}
            <div className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Ordenes</p>
                  <p className="text-lg font-black text-foreground">{stats.totalOrders}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Ventas Totales</p>
                  <p className="text-lg font-black text-foreground">${toNum(stats.totalSales).toFixed(2)}</p>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Desglose</p>
                {Object.entries(stats.salesByMethod).map(([type, data]) => {
                  // Hide non-default payment methods if they are $0 to keep UI clean
                  if (data.amount === 0 && type !== 'cash' && type !== 'card' && type !== 'transfer') return null;
                  
                  return (
                    <div key={type} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {getPaymentIcon(type)}
                        <span>{data.name}</span>
                      </div>
                      <span className="font-bold text-foreground">${toNum(data.amount).toFixed(2)}</span>
                    </div>
                  )
                })}
                {stats.totalRefunds > 0 && (
                  <div className="flex items-center justify-between text-xs border-t border-dashed border-border pt-2">
                    <span className="text-destructive">Reembolsos</span>
                    <span className="font-bold text-destructive">-${toNum(stats.totalRefunds).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Expected Cash */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calculator className="h-4 w-4 text-primary" />
                    <span>Efectivo esperado en caja</span>
                  </div>
                  <span className="text-base font-black text-primary">${toNum(stats.expectedCash).toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Apertura (${toNum(stats.openingBalance).toFixed(2)}) + Ventas efectivo (${toNum(stats.cashSales).toFixed(2)})
                </p>
              </div>

              {/* Cash Count Input */}
              <div>
                <label htmlFor="closing-cash" className="text-xs font-semibold text-foreground mb-1.5 block">
                  Efectivo contado en caja
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="closing-cash"
                    type="number"
                    step="0.01"
                    value={closingCash}
                    onChange={(e) => setClosingCash(e.target.value)}
                    placeholder="0.00"
                    className="form-input pl-9 text-lg font-bold"
                  />
                </div>
              </div>

              {/* Difference */}
              {closingCash && (
                <div className={`flex items-center gap-2 rounded-lg p-3 ${Math.abs(difference) < 0.01
                  ? "bg-success/10 border border-success/20"
                  : "bg-destructive/10 border border-destructive/20"
                  }`}>
                  {Math.abs(difference) < 0.01 ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  <div className="flex-1">
                    <p className={`text-xs font-semibold ${Math.abs(difference) < 0.01 ? "text-success" : "text-destructive"
                      }`}>
                      {Math.abs(difference) < 0.01
                        ? "Cuadra perfectamente"
                        : difference > 0
                          ? `Sobrante: +$${difference.toFixed(2)}`
                          : `Faltante: -$${Math.abs(difference).toFixed(2)}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label htmlFor="session-notes" className="text-xs font-semibold text-foreground mb-1.5 block">
                  Notas (opcional)
                </label>
                <textarea
                  id="session-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones del cierre..."
                  rows={2}
                  className="form-input resize-none text-xs"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-3">
              <Button variant="outline" size="sm" onClick={handleCancel} className="text-xs rounded-lg bg-transparent">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => setStep("summary")}
                disabled={!closingCash}
                className="gap-1.5 text-xs rounded-lg"
              >
                Continuar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Confirmation Summary */}
            <div className="border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Confirmar Cierre</h2>
                  <p className="text-xs text-muted-foreground">Revisa el resumen antes de cerrar</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 space-y-3">
              <div className="rounded-lg border border-border divide-y divide-border">
                <div className="flex items-center justify-between px-4 py-2.5 text-xs">
                  <span className="text-muted-foreground">Sesion</span>
                  <span className="font-semibold text-foreground">{session.name}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 text-xs">
                  <span className="text-muted-foreground">Ordenes procesadas</span>
                  <span className="font-semibold text-foreground">{stats.totalOrders}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 text-xs">
                  <span className="text-muted-foreground">Ventas totales</span>
                  <span className="font-bold text-foreground">${toNum(stats.totalSales).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 text-xs">
                  <span className="text-muted-foreground">Efectivo esperado</span>
                  <span className="font-bold text-foreground">${toNum(stats.expectedCash).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 text-xs">
                  <span className="text-muted-foreground">Efectivo contado</span>
                  <span className="font-bold text-foreground">${closingCashNum.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 text-xs">
                  <span className="text-muted-foreground">Diferencia</span>
                  <Badge
                    variant={Math.abs(difference) < 0.01 ? "default" : "destructive"}
                    className="text-[10px]"
                  >
                    {Math.abs(difference) < 0.01
                      ? "Cuadra"
                      : difference > 0
                        ? `+$${difference.toFixed(2)}`
                        : `-$${Math.abs(difference).toFixed(2)}`}
                  </Badge>
                </div>
              </div>

              {notes && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1">Notas:</p>
                  <p className="text-xs text-foreground">{notes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("count")}
                className="text-xs rounded-lg bg-transparent"
              >
                Volver
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleConfirm}
                className="gap-1.5 text-xs rounded-lg"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cerrar Sesion
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
