"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { PaymentMethod } from "./pdv-types"
import { paymentMethods } from "./pdv-data"
import { Textarea } from "@/components/ui/textarea"
import { usePaymentMethods } from "@/hooks/usePaymentMethods"
import { Skeleton } from "@/components/ui/skeleton"
import { Wallet, Smartphone, UserCheck, HelpCircle, Banknote, CreditCard, ArrowLeftRight, CheckCircle2, Printer, Receipt, FileText } from "lucide-react"

const paymentIconMap: Record<string, any> = {
  Wallet,
  Banknote,
  CreditCard,
  Smartphone,
  ArrowLeftRight,
  UserCheck,
  HelpCircle
}

interface PdvPaymentModalProps {
  open: boolean
  onClose: () => void
  total: number
  onConfirmPayment: (method: PaymentMethod, amountPaid: number, documentType: string, comment: string) => void
}

export function PdvPaymentModal({
  open,
  onClose,
  total,
  onConfirmPayment,
}: PdvPaymentModalProps) {
  const { data: methods, isLoading } = usePaymentMethods()
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [amountInput, setAmountInput] = useState("")
  const [isPaid, setIsPaid] = useState(false)
  const [documentType, setDocumentType] = useState<"boleta" | "factura">("boleta")
  const [comment, setComment] = useState("")

  // Set default method when methods load
  useState(() => {
      if (methods && methods.length > 0 && !selectedMethod) {
          setSelectedMethod(methods[0])
      }
  })

  // Also handle effect if methods load later
  useEffect(() => {
    if (methods && methods.length > 0 && !selectedMethod) {
      setSelectedMethod(methods[0])
    }
  }, [methods, selectedMethod])

  const currentMethod = selectedMethod || (methods?.[0] || null)
  const isCash = currentMethod?.key === "efectivo" || currentMethod?.type === "cash"

  const amountPaid = amountInput ? Number.parseFloat(amountInput) : 0
  const change = Math.max(0, amountPaid - total)
  const isValid = currentMethod ? (!isCash ? true : amountPaid >= total) : false

  const quickAmounts = [
    Math.ceil(total),
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 50) * 50,
    Math.ceil(total / 100) * 100,
    Math.ceil(total / 500) * 500,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= total).slice(0, 4)

  const handleConfirm = () => {
    setIsPaid(true)
    setTimeout(() => {
      if (currentMethod) {
        onConfirmPayment(currentMethod, amountPaid || total, documentType, comment)
      }
      setIsPaid(false)
      setAmountInput("")
      if (methods && methods.length > 0) setSelectedMethod(methods[0])
      setDocumentType("boleta")
      setComment("")
    }, 2000)
  }

  const handleClose = () => {
    if (!isPaid) {
      onClose()
      setAmountInput("")
      if (methods && methods.length > 0) setSelectedMethod(methods[0])
      setDocumentType("boleta")
      setComment("")
    }
  }

  const handleNumpad = (key: string) => {
    if (key === "C") {
      setAmountInput("")
    } else if (key === "CE") {
      setAmountInput((prev) => prev.slice(0, -1))
    } else {
      if (key === "." && amountInput.includes(".")) return
      setAmountInput((prev) => prev + key)
    }
  }

  if (isPaid) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Pago confirmado</DialogTitle>
            <DialogDescription>Tu pago ha sido procesado exitosamente</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Pago Exitoso</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Se proceso el pago correctamente
            </p>
            {change > 0 && (
              <div className="mt-4 rounded-xl bg-success/10 px-6 py-3">
                <p className="text-xs text-success font-medium">Cambio</p>
                <p className="text-2xl font-black text-success">${change.toFixed(2)}</p>
              </div>
            )}
            <div className="mt-6 flex gap-2">
              <Button variant="outline" size="sm" className="gap-2 rounded-lg text-xs bg-transparent">
                <Printer className="h-3.5 w-3.5" />
                Imprimir Ticket
              </Button>
              <Button variant="outline" size="sm" className="gap-2 rounded-lg text-xs bg-transparent">
                <Receipt className="h-3.5 w-3.5" />
                Facturar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl rounded-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Realizar pago</DialogTitle>
          <DialogDescription>Selecciona un metodo de pago e ingresa el monto</DialogDescription>
        </DialogHeader>

        <div className="flex">
          {/* Left Side: Payment Methods + Total */}
          <div className="flex flex-1 flex-col border-r border-border">
            {/* Header */}
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-base font-bold text-foreground">Cobrar</h2>
              <p className="text-xs text-muted-foreground">Selecciona el metodo de pago</p>
            </div>

            {/* Payment Methods */}
            <div className="grid grid-cols-3 gap-3 px-6 py-4">
              {isLoading ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)
              ) : (
                methods?.map((method) => {
                  const Icon = paymentIconMap[method.icon] ?? HelpCircle
                  const isActive = currentMethod?.id === method.id
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => {
                        setSelectedMethod(method)
                        if (method.key !== "efectivo") {
                          setAmountInput(total.toFixed(2))
                        } else {
                          setAmountInput("")
                        }
                      }}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all ${
                        isActive
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-[10px] font-bold uppercase truncate w-full text-center">{method.name}</span>
                    </button>
                  )
                })
              )}
            </div>

            {/* Document Type */}
            <div className="px-6 py-2 border-t border-border mt-2">
               <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Comprobante (Obligatorio)</p>
               <div className="grid grid-cols-2 gap-2">
                 <button
                   type="button"
                   onClick={() => setDocumentType("boleta")}
                   className={`flex items-center justify-center gap-2 rounded-xl border py-2 text-xs font-semibold transition-all ${
                     documentType === "boleta"
                       ? "border-primary bg-primary/10 text-primary"
                       : "border-border bg-card text-foreground hover:border-primary/30"
                   }`}
                 >
                   <Receipt className="h-4 w-4" />
                   Boleta
                 </button>
                 <button
                   type="button"
                   onClick={() => setDocumentType("factura")}
                   className={`flex items-center justify-center gap-2 rounded-xl border py-2 text-xs font-semibold transition-all ${
                     documentType === "factura"
                       ? "border-primary bg-primary/10 text-primary"
                       : "border-border bg-card text-foreground hover:border-primary/30"
                   }`}
                 >
                   <FileText className="h-4 w-4" />
                   Factura
                 </button>
               </div>
            </div>

            {/* Comment */}
            <div className="px-6 py-2 mb-2">
               <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Comentario (Opcional)</p>
               <Textarea
                 placeholder="Ej: Factura solicitada, o comprobante de transferencia..."
                 value={comment}
                 onChange={(e) => setComment(e.target.value)}
                 className="resize-none text-xs rounded-xl border-border bg-card focus-visible:ring-primary h-[60px]"
               />
            </div>

            {/* Total Display */}
            <div className="mx-6 rounded-xl bg-muted/50 px-5 py-4 mb-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Total a pagar</span>
                <Badge variant="outline" className="text-[10px]">
                  {currentMethod?.name || "..."}
                </Badge>
              </div>
              <p className="text-3xl font-black text-primary">${total.toFixed(2)}</p>
            </div>

            {/* Quick Amount Buttons (only for cash) */}
            {isCash && (
              <div className="px-6 pb-4">
                <p className="mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Monto rapido
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setAmountInput(amount.toString())}
                      className={`rounded-lg border py-2 text-xs font-semibold transition-all ${
                        amountInput === amount.toString()
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:border-primary/30"
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Change */}
            {isCash && amountPaid > 0 && (
              <div className="mx-6 mb-4 rounded-xl border border-dashed border-border px-5 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Recibido</p>
                    <p className="text-lg font-bold text-foreground">${amountPaid.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground">Cambio</p>
                    <p className={`text-lg font-bold ${change >= 0 ? "text-success" : "text-destructive"}`}>
                      ${change.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Numpad */}
          <div className="flex w-[240px] flex-col bg-muted/30">
            {/* Amount Display */}
            <div className="border-b border-border px-4 py-4">
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Monto recibido</p>
              <div className="flex items-baseline gap-1">
                <span className="text-muted-foreground text-lg">$</span>
                <span className="text-2xl font-black text-foreground">
                  {amountInput || "0.00"}
                </span>
              </div>
            </div>

            {/* Numpad */}
            <div className="flex-1 p-3">
              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "CE"].map(
                  (key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleNumpad(key)}
                      className={`flex h-12 items-center justify-center rounded-xl text-sm font-bold transition-all active:scale-95 ${
                        key === "CE"
                          ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                          : "bg-card text-foreground hover:bg-primary/10 border border-border"
                      }`}
                    >
                      {key}
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                onClick={() => handleNumpad("C")}
                className="mt-2 w-full rounded-xl bg-muted py-2.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                Borrar todo
              </button>
            </div>

            {/* Confirm Button */}
            <div className="p-3 pt-0">
              <Button
                onClick={handleConfirm}
                disabled={!isValid}
                className="w-full rounded-xl py-6 text-sm font-bold shadow-lg shadow-primary/25"
                size="lg"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Confirmar Pago
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
