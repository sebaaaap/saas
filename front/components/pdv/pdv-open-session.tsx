"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Banknote, Play, Loader2, Monitor, AlertCircle } from "lucide-react"
import useSWR from "swr"
import { apiService } from "@/services/apiService"
import { useAuth } from "@/contexts/AuthContext"

interface PdvOpenSessionProps {
    open: boolean
    onClose?: () => void
    onConfirm: (initialCash: number, registerId: string, userId: string, notes: string) => Promise<void>
}

export function PdvOpenSession({ open, onClose, onConfirm }: PdvOpenSessionProps) {
    const { user } = useAuth()
    const [initialCash, setInitialCash] = useState<string>("0")
    const [selectedRegister, setSelectedRegister] = useState<string>("")
    const [notes, setNotes] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    // Leer branch_id desde localStorage (seteado en login o por BranchSelector)
    const branchId = typeof window !== "undefined" ? localStorage.getItem("branch_id") : null

    // Fetch registers filtrados por sucursal (el interceptor de api.ts envía X-Branch-ID automáticamente)
    const { data: registers, isLoading: loadingRegisters } = useSWR(
        open ? `/sessions/registers?available_only=true&branch=${branchId}` : null,
        () => apiService.getRegisters(true),
        {
            onSuccess: (data) => {
                // Auto-seleccionar si solo hay una caja disponible
                if (data?.length === 1 && !selectedRegister) {
                    setSelectedRegister(data[0].id)
                }
            }
        }
    )

    const handleConfirm = async () => {
        if (!selectedRegister || !user) return

        setIsLoading(true)
        try {
            await onConfirm(
                parseFloat(initialCash) || 0,
                selectedRegister,
                user.username,
                notes
            )
        } finally {
            setIsLoading(false)
        }
    }

    const canConfirm = selectedRegister && user && !isLoading

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && onClose) onClose() }}>
            <DialogContent className="sm:max-w-[425px] overflow-hidden border-none shadow-2xl p-0 bg-transparent">
                <div className="bg-gradient-to-br from-primary to-primary/80 p-8 text-white relative overflow-hidden">
                    {/* Decorative circles */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/20 rounded-full blur-2xl" />

                    <DialogHeader className="relative z-10 flex flex-col items-center text-center gap-4">
                        <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                            <Play className="h-8 w-8 fill-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-bold tracking-tight text-white">Apertura de Caja</DialogTitle>
                            <DialogDescription className="text-white/70 text-sm mt-1">Selecciona tu terminal y define el saldo inicial</DialogDescription>
                        </div>
                    </DialogHeader>
                </div>

                <div className="bg-card p-6 gap-6 flex flex-col pt-8 rounded-b-xl border border-border/50">
                    <div className="grid gap-4">
                        {/* Terminal Selection */}
                        <div className="grid gap-2">
                            <Label htmlFor="register" className="text-sm font-semibold flex items-center gap-2">
                                <Monitor className="h-4 w-4 text-primary" />
                                Terminal / Caja Física
                                {branchId && (
                                    <span className="ml-auto text-[10px] font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                        Sucursal activa
                                    </span>
                                )}
                            </Label>
                            <Select value={selectedRegister} onValueChange={setSelectedRegister}>
                                <SelectTrigger className="bg-muted/30 border-border/50">
                                    <SelectValue placeholder={loadingRegisters ? "Cargando cajas..." : "Selecciona una caja"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {registers?.map((reg: any) => (
                                        <SelectItem key={reg.id} value={reg.id}>
                                            {reg.name} {reg.description ? `- ${reg.description}` : ''}
                                        </SelectItem>
                                    ))}
                                    {!loadingRegisters && registers?.length === 0 && (
                                        <div className="p-3 text-xs text-muted-foreground flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-destructive font-semibold">
                                                <AlertCircle className="h-3.5 w-3.5" />
                                                Sin cajas disponibles
                                            </div>
                                            <p className="leading-snug">
                                                No hay terminales libres asociadas a tu sucursal. Contacta al administrador para asignar una caja.
                                            </p>
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Initial Cash */}
                        <div className="grid gap-2">
                            <Label htmlFor="initial-cash" className="text-sm font-semibold flex items-center gap-2">
                                <Banknote className="h-4 w-4 text-primary" />
                                Efectivo Inicial (Saldo en Gaveta)
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                                <Input
                                    id="initial-cash"
                                    type="number"
                                    placeholder="0.00"
                                    value={initialCash}
                                    onChange={(e) => setInitialCash(e.target.value)}
                                    className="pl-8 text-lg font-bold bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="grid gap-2">
                            <Label htmlFor="notes" className="text-sm font-semibold">Notas de Apertura</Label>
                            <Textarea
                                id="notes"
                                placeholder="Ej: Recibido con sencillo, turno mañana..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="resize-none h-20 bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20 text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            onClick={handleConfirm}
                            disabled={!canConfirm}
                            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold text-base rounded-xl shadow-lg shadow-primary/20 group transition-all"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <Play className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform fill-white" />
                                    Iniciar Turno y Abrir Caja
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    )
}
