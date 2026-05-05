"use client";

import React, { useState } from "react";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
    Receipt, Wallet, CreditCard, ArrowUpRight, Smartphone,
    Loader2, ShoppingCart, History, ChevronRight, Search
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import useSWR from "swr";

// ── Tipos ──────────────────────────────────────────────────────────────────

interface ExpenseCategory { id: string; name: string; color: string; icon: string; }

const PAYMENT_METHODS = [
    { value: "efectivo",      label: "Efectivo",     icon: Wallet,      color: "text-emerald-500" },
    { value: "tarjeta",       label: "Tarjeta",      icon: CreditCard,  color: "text-blue-500" },
    { value: "transferencia", label: "Transf.",      icon: Smartphone,  color: "text-purple-500" },
];

const fmt = (n: number) =>
    n.toLocaleString("es-CL", { style: "currency", currency: "CLP" });

// ── Dialog Historial centrado ───────────────────────────────────────────────

function ExpenseHistoryDialog({ open, onOpenChange, expenses, totalGastos }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    expenses: any[];
    totalGastos: number;
}) {
    const [search, setSearch] = useState("");

    const filtered = expenses.filter((e: any) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            e.category_name?.toLowerCase().includes(q) ||
            e.glosa?.toLowerCase().includes(q) ||
            e.payment_method?.toLowerCase().includes(q)
        );
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[560px] max-w-[95vw] max-h-[80vh] p-0 flex flex-col gap-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-5 py-4 border-b border-border shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <History className="h-4 w-4 text-amber-600" />
                        </div>
                        <DialogTitle className="text-base text-amber-700 dark:text-amber-400">
                            Historial de Gastos
                        </DialogTitle>
                        <Badge variant="outline" className="ml-auto text-[10px]">
                            {expenses.length} registro{expenses.length !== 1 ? "s" : ""}
                        </Badge>
                    </div>

                    {/* Buscador */}
                    <div className="relative mt-3">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por categoría, glosa o método..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-8 h-9 text-sm"
                        />
                    </div>
                </DialogHeader>

                {/* Lista */}
                <ScrollArea className="flex-1 min-h-0">
                    <div className="px-4 py-3 space-y-2">
                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                <Receipt className="h-10 w-10 opacity-20 mb-3" />
                                <p className="text-sm font-medium">
                                    {expenses.length === 0 ? "Sin gastos registrados" : "Sin resultados"}
                                </p>
                                <p className="text-xs mt-1 opacity-70">
                                    {expenses.length === 0 ? "Los gastos de esta sesión aparecerán aquí" : "Prueba con otro término de búsqueda"}
                                </p>
                            </div>
                        ) : (
                            filtered.map((e: any) => (
                                <div key={e.id} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/30 transition-colors">
                                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <Receipt className="h-3.5 w-3.5 text-amber-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold">{e.category_name}</p>
                                            <Badge variant="outline" className="text-[9px] px-1.5 h-4 font-mono uppercase shrink-0">
                                                {e.payment_method}
                                            </Badge>
                                        </div>
                                        {e.glosa && (
                                            <p className="text-xs text-muted-foreground mt-0.5">{e.glosa}</p>
                                        )}
                                        {e.created_at && (
                                            <p className="text-[10px] text-muted-foreground/50 mt-1">
                                                {new Date(e.created_at).toLocaleString("es-CL", {
                                                    day: "2-digit", month: "short",
                                                    hour: "2-digit", minute: "2-digit"
                                                })}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-sm font-bold text-amber-600 font-mono shrink-0">
                                        -{fmt(e.amount)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                {/* Footer total */}
                {totalGastos > 0 && (
                    <div className="border-t border-border px-5 py-3 bg-muted/30 shrink-0 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Total gastos sesión
                        </span>
                        <span className="text-lg font-bold text-amber-600">
                            {fmt(totalGastos)}
                        </span>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ── Componente principal ───────────────────────────────────────────────────

interface PdvExpenseModeProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sessionId?: string;
}

export function PdvExpenseMode({ open, onOpenChange, sessionId }: PdvExpenseModeProps) {
    const [amount, setAmount] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState("efectivo");
    const [glosa, setGlosa] = useState("");
    const [loading, setLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Historial de gastos de la sesión
    const { data: expenses, mutate: refetchExpenses } = useSWR(
        sessionId ? `/expenses?session_id=${sessionId}` : null,
        () => api.get("/expenses/", { params: { session_id: sessionId } }).then(r => r.data)
    );

    // Categorías
    const { data: categories } = useSWR<ExpenseCategory[]>(
        "/expense-categories",
        () => api.get("/expenses/categories").then(r => r.data)
    );

    const reset = () => {
        setAmount("");
        setSelectedCategory(null);
        setGlosa("");
        setPaymentMethod("efectivo");
    };

    const handleSubmit = async () => {
        if (!selectedCategory) { toast.error("Selecciona una categoría"); return; }
        const amt = parseFloat(amount.replace(/\./g, "").replace(",", "."));
        if (!amt || amt <= 0) { toast.error("Ingresa un monto válido"); return; }

        setLoading(true);
        try {
            await api.post("/expenses/", {
                category_id: selectedCategory,
                amount: amt,
                payment_method: paymentMethod,
                glosa: glosa || null,
            });
            toast.success(`✅ Gasto de ${fmt(amt)} registrado`);
            reset();
            refetchExpenses();
        } catch (e: any) {
            toast.error(e.response?.data?.detail || "Error al registrar el gasto");
        } finally {
            setLoading(false);
        }
    };

    const expensesList = expenses || [];
    const totalGastos = expensesList.reduce((sum: number, e: any) => sum + e.amount, 0);

    return (
        <>
            {/* ── Panel principal de gastos (derecha) ─────────────────── */}
            <Sheet open={open} onOpenChange={(v) => { if (!v) setShowHistory(false); onOpenChange(v); }}>
                <SheetContent side="right" className="w-[420px] sm:w-[480px] p-0 flex flex-col">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/10 border-b border-amber-500/20 px-5 py-4 shrink-0">
                        <SheetHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                        <ShoppingCart className="h-4 w-4 text-amber-600" />
                                    </div>
                                    <div>
                                        <SheetTitle className="text-base text-amber-700 dark:text-amber-400">
                                            Modo Compra / Gasto
                                        </SheetTitle>
                                        <SheetDescription className="text-xs">
                                            Registra gastos que se descuentan del arqueo
                                        </SheetDescription>
                                    </div>
                                </div>

                                {/* Botón Historial → abre Sheet izquierdo */}
                                <button
                                    onClick={() => setShowHistory(true)}
                                    className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-all"
                                >
                                    <History className="h-3.5 w-3.5" />
                                    Historial
                                    {expensesList.length > 0 && (
                                        <span className="rounded-full bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 leading-none">
                                            {expensesList.length}
                                        </span>
                                    )}
                                    <ChevronRight className="h-3 w-3 opacity-50" />
                                </button>
                            </div>
                        </SheetHeader>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="px-5 py-4 space-y-5">
                            {/* ── Categoría ──────────────────────────────── */}
                            <div>
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Categoría del gasto
                                </Label>
                                {!categories ? (
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        {[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        {categories.map(cat => (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => setSelectedCategory(cat.id)}
                                                style={{ borderColor: selectedCategory === cat.id ? cat.color : undefined }}
                                                className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-[11px] font-semibold transition-all ${
                                                    selectedCategory === cat.id
                                                        ? "text-foreground"
                                                        : "bg-muted/40 border-transparent text-muted-foreground hover:border-border hover:bg-muted"
                                                }`}
                                            >
                                                <span
                                                    className="text-xl"
                                                    style={{ color: selectedCategory === cat.id ? cat.color : undefined }}
                                                >
                                                    <Receipt className="h-5 w-5" />
                                                </span>
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Monto ──────────────────────────────────── */}
                            <div>
                                <Label htmlFor="expense-amount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Monto
                                </Label>
                                <div className="relative mt-2">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">$</span>
                                    <Input
                                        id="expense-amount"
                                        type="number"
                                        min="1"
                                        step="1"
                                        placeholder="0"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="pl-7 h-12 text-lg font-bold tabular-nums"
                                    />
                                </div>
                            </div>

                            {/* ── Método de Pago ─────────────────────────── */}
                            <div>
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Pagado con
                                </Label>
                                <div className="flex gap-2 mt-2">
                                    {PAYMENT_METHODS.map(pm => {
                                        const Icon = pm.icon;
                                        return (
                                            <button
                                                key={pm.value}
                                                type="button"
                                                onClick={() => setPaymentMethod(pm.value)}
                                                className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11px] font-semibold transition-all ${
                                                    paymentMethod === pm.value
                                                        ? "bg-card border-primary/50 text-primary shadow-sm"
                                                        : "bg-muted/40 border-transparent text-muted-foreground hover:border-border"
                                                }`}
                                            >
                                                <Icon className={`h-4 w-4 ${paymentMethod === pm.value ? pm.color : ""}`} />
                                                {pm.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Glosa ──────────────────────────────────── */}
                            <div>
                                <Label htmlFor="expense-glosa" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Glosa / Comentario <span className="normal-case text-muted-foreground/60">(opcional)</span>
                                </Label>
                                <Input
                                    id="expense-glosa"
                                    placeholder="Ej: Propina al mecánico turno tarde..."
                                    value={glosa}
                                    onChange={e => setGlosa(e.target.value)}
                                    className="mt-2 h-10"
                                />
                            </div>

                            {/* ── Botón registrar ─────────────────────────── */}
                            <Button
                                className="w-full h-12 font-bold text-sm bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                                onClick={handleSubmit}
                                disabled={loading || !selectedCategory || !amount}
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowUpRight className="h-4 w-4 mr-2" />}
                                {loading ? "Registrando..." : "Registrar Gasto"}
                            </Button>

                            {/* Total gastos acumulado en la sesión */}
                            {totalGastos > 0 && (
                                <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                                            <Receipt className="h-3 w-3 text-amber-600" />
                                        </div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Total Gastado</span>
                                    </div>
                                    <span className="text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                                        {fmt(totalGastos)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>

            {/* ── Panel historial independiente (izquierda) ───────────── */}
            <ExpenseHistoryDialog
                open={showHistory}
                onOpenChange={setShowHistory}
                expenses={expensesList}
                totalGastos={totalGastos}
            />
        </>
    );
}
