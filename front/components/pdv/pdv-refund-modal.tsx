"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    RotateCcw,
    Trash2,
    ChevronRight,
    ArrowLeft,
    Info,
    PackageCheck,
    PackageX
} from "lucide-react"
import type { Order, OrderLine } from "./pdv-types"
import { cn } from "@/lib/utils"
import { toNum } from "@/lib/utils-numbers"

interface PdvRefundModalProps {
    open: boolean
    order: Order | null
    onClose: () => void
    onConfirm: (refundData: {
        items: { product_id: string; quantity: number; price: number }[]
        returnToStock: boolean
        reason: string
    }) => Promise<void>
}

export function PdvRefundModal({ open, order, onClose, onConfirm }: PdvRefundModalProps) {
    const [selectedItems, setSelectedItems] = useState<Record<string, number>>({})
    const [returnToStock, setReturnToStock] = useState(true)
    const [reason, setReason] = useState("devolucion_stock")
    const [isProcessing, setIsProcessing] = useState(false)

    // Initialize selected items if order changes
    useEffect(() => {
        if (order) {
            const initial: Record<string, number> = {}
            order.lines.forEach(line => {
                initial[line.id] = line.quantity
            })
            setSelectedItems(initial)
        } else {
            setSelectedItems({})
        }
    }, [order])

    if (!order) return null

    const handleQuantityChange = (lineId: string, maxQty: number, value: string) => {
        const qty = parseFloat(value)
        if (isNaN(qty)) return

        setSelectedItems(prev => ({
            ...prev,
            [lineId]: Math.min(Math.max(0, qty), maxQty)
        }))
    }

    const toggleItemSelection = (lineId: string, maxQty: number) => {
        setSelectedItems(prev => {
            const current = prev[lineId] || 0
            const newItems = { ...prev }
            if (current > 0) {
                newItems[lineId] = 0
            } else {
                newItems[lineId] = maxQty
            }
            return newItems
        })
    }

    const refundTotal = order.lines.reduce((acc, line) => {
        const qty = toNum(selectedItems[line.id] || 0)
        // Use unitPrice, or product price, or derive from subtotal as fallback
        const price = toNum(line.unitPrice || line.product.price || (toNum(line.subtotal) / toNum(line.quantity)) || 0)
        const discount = toNum(line.discount || 0)
        return acc + (qty * price * (1 - discount / 100))
    }, 0) // Prices already include IVA according to backend model

    const handleConfirm = async () => {
        const items = order.lines
            .filter(line => (selectedItems[line.id] || 0) > 0)
            .map(line => {
                const price = line.unitPrice || line.product.price || (line.subtotal / line.quantity) || 0
                return {
                    product_id: line.product.id,
                    quantity: selectedItems[line.id],
                    price: price,
                    discount_percent: line.discount || 0
                }
            })

        if (items.length === 0) return

        setIsProcessing(true)
        try {
            await onConfirm({
                items,
                returnToStock,
                reason
            })
            onClose()
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
                <div className="bg-slate-900 p-6 text-white text-center relative">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-xl font-bold flex items-center justify-center gap-2">
                            <RotateCcw className="h-5 w-5 text-amber-400" />
                            Procesar Reembolso
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Selecciona los productos y cantidades a devolver del ticket {order.id}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 bg-slate-50 space-y-6">
                    <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-3">
                            {order.lines.map((line) => {
                                const isSelected = (selectedItems[line.id] || 0) > 0
                                return (
                                    <div
                                        key={line.id}
                                        className={cn(
                                            "group flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer",
                                            isSelected ? "bg-white border-primary/30 shadow-sm" : "bg-white/50 border-slate-200"
                                        )}
                                        onClick={() => toggleItemSelection(line.id, line.quantity)}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                            isSelected ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
                                        )}>
                                            <Checkbox
                                                checked={isSelected}
                                                className="rounded-md border-slate-300"
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 text-sm truncate">{line.product.name}</p>
                                            <p className="text-xs text-slate-500">Comprado: {toNum(line.quantity)} unid. x ${toNum(line.unitPrice || 0).toLocaleString()}</p>
                                        </div>

                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Input
                                                type="number"
                                                className="w-16 h-8 text-center font-bold text-xs"
                                                value={selectedItems[line.id] || 0}
                                                onChange={(e) => handleQuantityChange(line.id, line.quantity, e.target.value)}
                                                min={0}
                                                max={line.quantity}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </ScrollArea>

                    <div className="grid grid-cols-2 gap-4">
                        <div
                            className={cn(
                                "p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-2",
                                returnToStock ? "bg-emerald-50 border-emerald-500/30 text-emerald-700" : "bg-white border-slate-100 text-slate-400"
                            )}
                            onClick={() => {
                                setReturnToStock(true)
                                setReason("devolucion_stock")
                            }}
                        >
                            <PackageCheck className={cn("h-6 w-6", returnToStock ? "text-emerald-600" : "text-slate-300")} />
                            <span className="text-[10px] font-black uppercase tracking-wider">A Stock</span>
                        </div>

                        <div
                            className={cn(
                                "p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-2",
                                !returnToStock ? "bg-rose-50 border-rose-500/30 text-rose-700" : "bg-white border-slate-100 text-slate-400"
                            )}
                            onClick={() => {
                                setReturnToStock(false)
                                setReason("producto_danado")
                            }}
                        >
                            <PackageX className={cn("h-6 w-6", !returnToStock ? "text-rose-600" : "text-slate-300")} />
                            <span className="text-[10px] font-black uppercase tracking-wider">Merma / Dañado</span>
                        </div>
                    </div>

                    {order.lines.some(l => (selectedItems[l.id] || 0) > 0 && (l.product.productType === "SERVICE" || String(l.product.categoryId).toLowerCase().includes("serv"))) && (
                        <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-start gap-2">
                            <Info className="h-4 w-4 text-amber-600 mt-0.5" />
                            <p className="text-[11px] text-amber-800">
                                Estás reembolsando un <strong>SERVICIO</strong>. Los servicios no son inventariables y no afectarán el stock físico.
                            </p>
                        </div>
                    )}

                    <div className="bg-slate-900/5 p-4 rounded-2xl border border-slate-200">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 text-sm font-bold">Total a Reembolsar</span>
                            <span className="text-xl font-black text-slate-900">${(refundTotal || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-white border-t border-slate-100 gap-3 sm:gap-0">
                    <Button variant="ghost" className="rounded-xl font-bold text-slate-500" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        className="rounded-xl px-8 font-black bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 active:scale-95 transition-all"
                        disabled={isProcessing || refundTotal === 0}
                        onClick={handleConfirm}
                    >
                        {isProcessing ? "Procesando..." : "Confirmar Reembolso"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}
