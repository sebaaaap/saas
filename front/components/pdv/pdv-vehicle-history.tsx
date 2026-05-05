"use client";

import React, { useState } from "react";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Car, Clock, ShoppingBag, Wrench, AlertCircle,
    Search, ChevronRight, User, Phone, Mail, History
} from "lucide-react";
import api from "@/lib/api";

// ── Tipos ──────────────────────────────────────────────────────────────────

interface VisitItem { name: string; qty: number; price: number; }
interface Visit {
    type: "venta" | "ot";
    id: string;
    number: string;
    date: string;
    total: number;
    state?: string;
    items: VisitItem[];
}

const VEHICLE_EMOJI: Record<string, string> = {
    automovil: "🚗",
    camioneta: "🚙",
    camion: "🚛",
    motocicleta: "🏍️",
    furgon: "🚐",
    otro: "🚘",
};

const fmt = (n: number) =>
    n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
};

// ── Sub-componentes ────────────────────────────────────────────────────────

function VisitCard({ visit }: { visit: Visit }) {
    const [expanded, setExpanded] = useState(false);
    const isOT = visit.type === "ot";

    return (
        <div
            className={`rounded-xl border transition-all ${
                isOT ? "border-purple-500/20 bg-purple-500/5" : "border-primary/20 bg-primary/5"
            }`}
        >
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
            >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    isOT ? "bg-purple-500/15" : "bg-primary/15"
                }`}>
                    {isOT ? <Wrench className="h-3.5 w-3.5 text-purple-500" /> : <ShoppingBag className="h-3.5 w-3.5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold font-mono">{visit.number}</span>
                        {isOT && visit.state && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-purple-400/40 text-purple-500">
                                {visit.state}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{fmtDate(visit.date)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{fmt(visit.total)}</span>
                    <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
                </div>
            </button>

            {expanded && visit.items.length > 0 && (
                <div className="px-3 pb-3 pt-1 space-y-1 border-t border-border/50">
                    {visit.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground truncate flex-1">
                                <span className="text-foreground font-medium">{item.qty}×</span> {item.name}
                            </span>
                            <span className="font-mono ml-2">{fmt(item.price * item.qty)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Componente Principal ───────────────────────────────────────────────────

interface PdvVehicleHistoryProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialPlate?: string; // Si ya hay una patente seleccionada, precarga
}

export function PdvVehicleHistory({ open, onOpenChange, initialPlate }: PdvVehicleHistoryProps) {
    const [plate, setPlate] = useState(initialPlate || "");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [visitLimit, setVisitLimit] = useState(5);

    React.useEffect(() => {
        if (open && initialPlate) {
            setPlate(initialPlate);
            doSearch(initialPlate, visitLimit);
        }
    }, [open, initialPlate]);

    const doSearch = async (p: string, limit = visitLimit) => {
        const clean = p.toUpperCase().trim();
        if (clean.length < 4) return;
        setLoading(true);
        setError(null);
        setData(null);
        try {
            const res = await api.get(`/customers/vehicles/plate/${clean}/history`, {
                params: { limit }
            });
            setData(res.data);
        } catch (e: any) {
            setError(e.response?.status === 404 ? "Vehículo no encontrado" : "Error al buscar el historial");
        } finally {
            setLoading(false);
        }
    };

    const handleLimitChange = (newLimit: number) => {
        setVisitLimit(newLimit);
        if (data) doSearch(plate, newLimit);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-[420px] sm:w-[480px] p-0 flex flex-col">
                {/* Header */}
                <SheetHeader className="px-5 py-4 border-b border-border bg-card shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <History className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <SheetTitle className="text-base">Historial del Vehículo</SheetTitle>
                            <SheetDescription className="text-xs">Últimas visitas por patente</SheetDescription>
                        </div>
                    </div>

                    {/* Buscar patente */}
                    <div className="flex gap-2 mt-3">
                        <div className="relative flex-1">
                            <Car className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="ABCD12 / AB1234"
                                value={plate}
                                onChange={e => setPlate(e.target.value.toUpperCase())}
                                onKeyDown={e => e.key === "Enter" && doSearch(plate)}
                                className="pl-8 font-mono uppercase tracking-widest h-9 text-sm"
                                maxLength={8}
                            />
                        </div>
                        <Button
                            size="sm"
                            onClick={() => doSearch(plate)}
                            disabled={loading || plate.length < 4}
                            className="h-9 px-4"
                        >
                            <Search className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    {/* Control de límite */}
                    <div className="flex items-center gap-1 mt-2">
                        <span className="text-[10px] text-muted-foreground mr-1">Mostrar:</span>
                        {[3, 5, 10, 20].map(n => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => handleLimitChange(n)}
                                className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                                    visitLimit === n
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                            >
                                {n}
                            </button>
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-1">visitas</span>
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1">
                    <div className="px-5 py-4 space-y-4">
                        {/* Loading */}
                        {loading && (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="rounded-xl border border-border p-3 space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Error */}
                        {error && !loading && (
                            <div className="flex flex-col items-center gap-3 py-10 text-center">
                                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                                    <AlertCircle className="h-6 w-6 text-destructive" />
                                </div>
                                <p className="text-sm font-medium">{error}</p>
                                <p className="text-xs text-muted-foreground">Verifica la patente e intenta nuevamente</p>
                            </div>
                        )}

                        {/* Sin buscar */}
                        {!loading && !error && !data && (
                            <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
                                <Car className="h-10 w-10 opacity-20" />
                                <p className="text-sm font-medium">Ingresa una patente</p>
                                <p className="text-xs">para ver el historial de visitas</p>
                            </div>
                        )}

                        {/* Datos */}
                        {!loading && data && (
                            <>
                                {/* Info vehículo */}
                                <div className="rounded-xl border border-border bg-muted/30 p-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">
                                            {VEHICLE_EMOJI[data.vehicle.type] || "🚗"}
                                        </span>
                                        <div>
                                            <p className="font-mono font-bold text-base tracking-widest">
                                                {data.vehicle.license_plate}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {[data.vehicle.brand, data.vehicle.model, data.vehicle.year].filter(Boolean).join(" · ") || "Sin datos adicionales"}
                                            </p>
                                        </div>
                                    </div>
                                    {data.customer && (
                                        <div className="mt-3 pt-3 border-t border-border flex items-start gap-2">
                                            <User className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold">{data.customer.name}</p>
                                                <div className="flex flex-wrap gap-2 mt-0.5">
                                                    {data.customer.phone && (
                                                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                            <Phone className="h-3 w-3" />{data.customer.phone}
                                                        </span>
                                                    )}
                                                    {data.customer.email && (
                                                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                            <Mail className="h-3 w-3" />{data.customer.email}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Visitas */}
                                {data.visits.length === 0 ? (
                                    <div className="text-center py-6 text-muted-foreground text-sm">
                                        Sin visitas registradas para este vehículo
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            {data.visits.length} visita{data.visits.length !== 1 ? "s" : ""} recientes
                                        </p>
                                        {data.visits.map((visit: Visit) => (
                                            <VisitCard key={visit.id} visit={visit} />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
