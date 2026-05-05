"use client"

import React, { useState, useEffect } from "react"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Car, CreditCard, Banknote, Landmark, Wrench, Wallet, HelpCircle } from "lucide-react"
import { apiService } from "@/services/apiService"
import { toast } from "sonner"
import { usePaymentMethods } from "@/hooks/usePaymentMethods"
import { Skeleton } from "@/components/ui/skeleton"

const paymentIconMap: Record<string, any> = {
    Wallet,
    Banknote,
    CreditCard,
    Smartphone: Landmark,
    Landmark,
    UserCheck: Landmark,
    HelpCircle
}
import type { Customer } from "./pdv-types"

export interface OtPaymentModalProps {
    open: boolean
    onClose: () => void
    onConfirm: (amount: number, method: string, otId: string, itemIds?: string[]) => void
    selectedCustomer?: Customer | null
}

export function PdvOtPaymentModal({ open, onClose, onConfirm, selectedCustomer }: OtPaymentModalProps) {
    const [patente, setPatente] = useState("")
    const [activeOts, setActiveOts] = useState<any[]>([])
    const [filteredOts, setFilteredOts] = useState<any[]>([])
    const [selectedOt, setSelectedOt] = useState<any | null>(null)
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])

    const [payAmount, setPayAmount] = useState("")
    const { data: methods, isLoading: methodsLoading } = usePaymentMethods()
    const [paymentMethod, setPaymentMethod] = useState("efectivo")
    const [isLoading, setIsLoading] = useState(false)

    // Cargar todas las OTs al abrir
    useEffect(() => {
        if (open) {
            loadActiveOts()
            setSelectedOt(null)
            setSelectedItemIds([])
            setPayAmount("")
            if (selectedCustomer) {
                // Pre-filtrar por RUT o Nombre
                setPatente("")
            } else {
                setPatente("")
                setFilteredOts([])
            }
        }
    }, [open, selectedCustomer])

    const loadActiveOts = async () => {
        setIsLoading(true)
        try {
            const ots = await apiService.getActiveWorkOrders(true)
            setActiveOts(ots)

            // Si hay un cliente seleccionado en PDV, mostramos sus OTs automáticamente
            if (selectedCustomer) {
                const customerOts = ots.filter(ot =>
                    String(ot.customer_id) === selectedCustomer.id ||
                    ot.customer?.rut === selectedCustomer.rut
                )
                setFilteredOts(customerOts)
                if (customerOts.length === 1) {
                    selectOt(customerOts[0])
                }
            } else {
                setFilteredOts([])
            }
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar las OTs activas.")
        } finally {
            setIsLoading(false)
        }
    }

    const selectOt = (ot: any) => {
        setSelectedOt(ot)
        setSelectedItemIds([])
        // Usar el saldo calculado por el servidor (evita datos cacheados)
        const balance = Number(ot.pending_balance ?? (Number(ot.total_amount) - (ot.total_payments ? Number(ot.total_payments) : (ot.payments ? ot.payments.reduce((acc: number, p: any) => acc + Number(p.amount), 0) : 0))))
        setPayAmount(balance > 0 ? balance.toString() : "")
    }

    const toggleItem = (itemId: string, itemPrice: number) => {
        setSelectedItemIds(prev => {
            const isSelected = prev.includes(itemId)
            const next = isSelected ? prev.filter(id => id !== itemId) : [...prev, itemId]

            // Recalculate amount if something is selected
            if (next.length > 0 && selectedOt) {
                const newTotal = selectedOt.items
                    .filter((i: any) => next.includes(i.id))
                    .reduce((acc: number, i: any) => acc + Number(i.subtotal), 0);
                setPayAmount(newTotal.toString());
            } else if (next.length === 0 && selectedOt) {
                // Return to balance if no items selected
                const paid = selectedOt.payments ? selectedOt.payments.reduce((acc: number, p: any) => acc + Number(p.amount), 0) : 0
                const balance = Number(selectedOt.total_amount) - paid
                setPayAmount(balance.toString())
            }

            return next
        })
    }

    const handleSearch = () => {
        if (!patente.trim() && !selectedCustomer) {
            setFilteredOts([])
            return
        }

        const term = patente.toLowerCase().trim()
        const results = activeOts.filter(ot => {
            if (selectedCustomer && String(ot.customer_id) === selectedCustomer.id) return true;
            return (
                (ot.vehicle?.license_plate && ot.vehicle.license_plate.toLowerCase().includes(term)) ||
                (ot.customer?.name && ot.customer.name.toLowerCase().includes(term)) ||
                String(ot.id).includes(term)
            )
        })

        setFilteredOts(results)
        setSelectedOt(null)

        if (results.length === 1 && term.length > 2) {
            selectOt(results[0])
        } else if (results.length === 0 && term) {
            toast.info("No se encontró OT con ese criterio.")
        }
    }

    const handleConfirm = () => {
        if (!selectedOt) return
        const amount = Number(payAmount)
        const paid = selectedOt.payments ? selectedOt.payments.reduce((acc: number, p: any) => acc + Number(p.amount), 0) : 0
        const maxAvailable = Number(selectedOt.total_amount) - paid

        if (amount <= 0 || amount > maxAvailable + 1) { // +1 for decimal rounding tolerance
            toast.error(`Monto inválido. El máximo es $${maxAvailable.toLocaleString("es-CL")}`)
            return
        }
        onConfirm(amount, paymentMethod, selectedOt.id, selectedItemIds)
    }

    // Calcula datos del OT seleccionado — prioriza campos del servidor para evitar datos desactualizados
    const otPaidStatus = selectedOt ? (() => {
        const total = Number(selectedOt.total_amount)
        const paid = selectedOt.total_payments !== undefined
            ? Number(selectedOt.total_payments)
            : (selectedOt.payments ? selectedOt.payments.reduce((acc: number, p: any) => acc + Number(p.amount), 0) : 0)
        const balance = selectedOt.pending_balance !== undefined
            ? Number(selectedOt.pending_balance)
            : Math.max(total - paid, 0)
        return { paid, total, balance }
    })() : null

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-2xl sm:rounded-3xl p-0 overflow-hidden bg-white">
                <DialogHeader className="p-6 bg-slate-900 text-white rounded-t-3xl border-b border-slate-800">
                    <DialogTitle className="text-2xl font-black flex items-center gap-2 tracking-tight">
                        <Wrench className="w-6 h-6 text-blue-400" />
                        Abono de Orden de Trabajo (OT)
                    </DialogTitle>
                    <p className="text-slate-400 text-sm font-medium mt-1">
                        {selectedCustomer ? `Buscando OTs para ${selectedCustomer.name}` : 'Busca una OT para registrar su abono o pago final.'}
                    </p>
                </DialogHeader>

                <div className="flex flex-col h-[60vh] md:h-auto md:max-h-[70vh]">
                    <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                        {/* Buscador */}
                        {!selectedOt && (
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <Input
                                        placeholder="Patente o Nombre Cliente..."
                                        value={patente}
                                        onChange={e => setPatente(e.target.value)}
                                        className="pl-10 h-14 bg-slate-50 font-bold uppercase tracking-widest text-lg"
                                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                        autoFocus
                                    />
                                </div>
                                <Button onClick={handleSearch} className="h-14 px-8 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white">
                                    Buscar
                                </Button>
                            </div>
                        )}

                        {/* Listado de resultados */}
                        {!selectedOt && !isLoading && filteredOts.length > 0 && (
                            <div className="space-y-3 mt-4 animate-in fade-in duration-300">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Resultados ({filteredOts.length})</h4>
                                <div className="grid gap-3">
                                    {filteredOts.map(ot => {
                                        const total = Number(ot.total_amount)
                                        const paid = ot.payments ? ot.payments.reduce((acc: number, p: any) => acc + Number(p.amount), 0) : 0
                                        return (
                                            <div
                                                key={ot.id}
                                                onClick={() => selectOt(ot)}
                                                className="bg-white border-2 border-slate-100 hover:border-blue-400 p-4 rounded-xl cursor-pointer transition-all flex justify-between items-center group"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-black text-lg text-slate-900 uppercase">
                                                            {ot.vehicle?.license_plate || "SIN PATENTE"}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500">
                                                            OT-{String(ot.id).slice(0, 4)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-semibold text-slate-600">{ot.customer?.name || "Cliente General"}</p>
                                                </div>
                                                <div className="flex-1 px-4">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Progreso de Pago</span>
                                                        <span className="text-[10px] font-black text-slate-900">{Math.round(ot.financial_progress || 0)}%</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                        <div
                                                            className={`h-full transition-all duration-500 ${Number(ot.financial_progress) >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                                                            style={{ width: `${ot.financial_progress || 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="text-right min-w-[100px]">
                                                    <p className="text-lg font-black text-slate-900 leading-none">${total.toLocaleString("es-CL")}</p>
                                                    <p className="text-[11px] font-bold text-orange-600 mt-1">Saldo: ${(total - paid).toLocaleString("es-CL")}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Cargando */}
                        {isLoading && (
                            <div className="py-12 flex justify-center text-slate-400">
                                Cargando OTs activas...
                            </div>
                        )}

                        {/* OT Seleccionada - Ficha de Pago */}
                        {selectedOt && otPaidStatus && (
                            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 h-full flex flex-col">
                                <div className="flex justify-between items-center">
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedOt(null)} className="text-blue-600 font-bold -ml-2">
                                        ← Cambiar OT
                                    </Button>
                                </div>

                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
                                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200 border-dashed">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                                <Car className="w-5 h-5 text-slate-400" />
                                                {selectedOt.vehicle?.license_plate || "Sin Vehículo"}
                                            </h3>
                                            <p className="text-sm font-bold text-slate-500 capitalize">{selectedOt.customer?.name || "Cliente"}</p>
                                        </div>
                                        <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-black text-slate-500 text-sm shadow-sm">
                                            OT-{String(selectedOt.id).slice(0, 6)}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Progreso Financiero (Pagos)</span>
                                                <span className="text-sm font-black text-slate-900">{Math.round(selectedOt.financial_progress || 0)}%</span>
                                            </div>
                                            <div className="h-3 w-full bg-white rounded-full overflow-hidden border-2 border-slate-100 p-0.5">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${Number(selectedOt.financial_progress) >= 100 ? 'bg-emerald-500' : 'bg-orange-500 shadow-sm shadow-orange-200'}`}
                                                    style={{ width: `${selectedOt.financial_progress || 0}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2 pt-2 border-t border-slate-200 border-dashed">
                                            <div className="flex justify-between text-sm font-semibold text-slate-600">
                                                <span>Total Orden de Trabajo</span>
                                                <span className="text-base font-bold">${otPaidStatus.total.toLocaleString("es-CL")}</span>
                                            </div>
                                            <div className="flex justify-between text-sm font-semibold text-emerald-600">
                                                <span>Abonos Previos Realizados</span>
                                                <span>- ${otPaidStatus.paid.toLocaleString("es-CL")}</span>
                                            </div>
                                            <div className="flex justify-between text-lg font-black text-slate-900 pt-3 border-t border-slate-200">
                                                <span>Saldo Pendiente</span>
                                                <span className="text-2xl text-orange-600">${otPaidStatus.balance.toLocaleString("es-CL")}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Listado de Items de la OT */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Artículos y Servicios en esta OT</label>
                                    <div className="grid gap-2">
                                        {selectedOt.items.map((item: any) => (
                                            <div
                                                key={item.id}
                                                onClick={() => !item.is_paid && toggleItem(item.id, Number(item.subtotal))}
                                                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${item.is_paid
                                                    ? 'bg-emerald-50 border-emerald-100 opacity-60 grayscale cursor-not-allowed'
                                                    : selectedItemIds.includes(item.id)
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-slate-100 bg-white hover:border-slate-200'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${item.is_paid
                                                        ? 'bg-emerald-500 border-emerald-500'
                                                        : selectedItemIds.includes(item.id)
                                                            ? 'bg-blue-600 border-blue-600'
                                                            : 'bg-white border-slate-300'
                                                        }`}>
                                                        {(item.is_paid || selectedItemIds.includes(item.id)) && <span className="text-white text-[10px] font-bold">✓</span>}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{item.product_name}</p>
                                                        <p className="text-[11px] font-semibold text-slate-500">{Number(item.quantity)} {item.product_type} x ${Number(item.unit_price).toLocaleString("es-CL")}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right text-sm">
                                                    <p className="font-black text-slate-900">${Number(item.subtotal).toLocaleString("es-CL")}</p>
                                                    {item.is_paid && <span className="text-[10px] uppercase font-black text-emerald-600">Pagado</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Formulario Pago */}
                                {otPaidStatus.balance > 0 ? (
                                    <div className="space-y-6 flex-1">
                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-2 block">Monto a Abonar (Max: ${(otPaidStatus.balance).toLocaleString("es-CL")})</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-2xl">$</span>
                                                <Input
                                                    type="number"
                                                    className="pl-10 h-16 text-3xl font-black text-slate-900 bg-white border-2 border-slate-200 focus:border-blue-500 rounded-xl transition-all"
                                                    value={payAmount}
                                                    onChange={e => setPayAmount(e.target.value)}
                                                    max={otPaidStatus.balance}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-2 block font-outfit">Forma de Pago del Abono</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {methodsLoading ? (
                                                    [1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)
                                                ) : (
                                                    methods?.map(method => {
                                                        const Icon = paymentIconMap[method.icon] || HelpCircle
                                                        const isSelected = paymentMethod === method.key
                                                        return (
                                                            <Button
                                                                key={method.id}
                                                                variant={isSelected ? "default" : "outline"}
                                                                className={`h-20 flex flex-col items-center justify-center gap-1 border-2 rounded-2xl transition-all relative ${isSelected ? 'bg-blue-600 hover:bg-blue-700 border-blue-600 shadow-lg shadow-blue-600/20' : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'}`}
                                                                onClick={() => setPaymentMethod(method.key)}
                                                            >
                                                                {isSelected && <div className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center"><span className="text-blue-600 text-[10px] font-black">✓</span></div>}
                                                                <Icon className={`w-7 h-7 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                                                                <span className={`text-[10px] font-black uppercase tracking-wider truncate w-full px-1 ${isSelected ? 'text-white' : 'text-slate-600'}`}>{method.name}</span>
                                                            </Button>
                                                        )
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-emerald-50 p-8 rounded-2xl flex flex-col items-center justify-center text-emerald-700 font-bold border-2 border-emerald-100 flex-1">
                                        <span className="text-5xl mb-4">🎉</span>
                                        <p className="text-xl">OT Pagada en su Totalidad</p>
                                        <p className="text-sm font-medium opacity-80 mt-1">No hay saldo pendiente por registrar.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {selectedOt && otPaidStatus && otPaidStatus.balance > 0 && (
                    <DialogFooter className="p-6 bg-slate-50 border-t border-slate-200 mt-auto">
                        <Button variant="ghost" className="h-14 font-bold px-6 text-slate-500 hover:bg-slate-200 rounded-xl" onClick={onClose}>Cancelar</Button>
                        <Button
                            onClick={handleConfirm}
                            className="h-14 font-black px-8 text-lg bg-emerald-500 hover:bg-emerald-600 text-white flex-1 md:flex-none rounded-xl shadow-lg shadow-emerald-500/30 transition-all"
                            disabled={!payAmount || Number(payAmount) <= 0 || Number(payAmount) > otPaidStatus.balance}
                        >
                            Confirmar Abono de ${Number(payAmount || 0).toLocaleString("es-CL")}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}
