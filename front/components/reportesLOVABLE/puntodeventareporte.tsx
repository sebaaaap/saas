"use client";

import React, { useState, useEffect } from "react";
import {
    DollarSign, Receipt, CreditCard, Banknote, AlertTriangle, RotateCcw,
    Wallet, Smartphone, BadgeDollarSign, TrendingUp, Percent, Award, Download
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ChartContainer, ChartTooltip, ChartTooltipContent
} from "@/components/ui/chart";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine
} from "recharts";
import useSWR from "swr";
import { apiService } from "@/services/apiService";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import api from "@/lib/api";

// ── Helpers ────────────────────────────────────────────

const fmt = (n: number) =>
    n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

/** Retorna fecha en formato YYYY-MM-DD para input[type=date] */
const toDateStr = (d: Date) => d.toISOString().split("T")[0];

// Presets de rango rápido
const DATE_PRESETS = [
    {
        label: "Ayer",
        getRange: () => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            const s = toDateStr(d);
            return { from: s, to: s };
        },
    },
    {
        label: "7 días",
        getRange: () => {
            const to = new Date();
            const from = new Date();
            from.setDate(from.getDate() - 6);
            return { from: toDateStr(from), to: toDateStr(to) };
        },
    },
    {
        label: "1 mes",
        getRange: () => {
            const to = new Date();
            const from = new Date();
            from.setMonth(from.getMonth() - 1);
            return { from: toDateStr(from), to: toDateStr(to) };
        },
    },
    {
        label: "3 meses",
        getRange: () => {
            const to = new Date();
            const from = new Date();
            from.setMonth(from.getMonth() - 3);
            return { from: toDateStr(from), to: toDateStr(to) };
        },
    },
];

// ── Branch Filter ──────────────────────────────────────

function BranchFilter({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    const { data: branches } = useSWR("/api/branches", () => apiService.getBranches());

    if (!branches || branches.length <= 1) return null;

    return (
        <div className="flex items-center gap-2">
            <Building2 size={14} className="text-muted-foreground" />
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue placeholder="Todas las sucursales" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas las sucursales</SelectItem>
                    {branches.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>
                            {b.is_default ? `⭐ ${b.name}` : b.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

// ── Date Range Selector ────────────────────────────────

function DateRangeSelector({
    startDate,
    endDate,
    onChange,
}: {
    startDate: string;
    endDate: string;
    onChange: (from: string, to: string) => void;
}) {
    // Detectar qué preset está activo según las fechas actuales
    const activePreset = DATE_PRESETS.find((p) => {
        const r = p.getRange();
        return r.from === startDate && r.to === endDate;
    })?.label ?? null;

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap">
            {/* Botones rápidos */}
            <div className="flex items-center gap-1.5 flex-wrap">
                {DATE_PRESETS.map((preset) => {
                    const isActive = activePreset === preset.label;
                    return (
                        <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                                const r = preset.getRange();
                                onChange(r.from, r.to);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${isActive
                                ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30"
                                : "bg-muted text-muted-foreground border-border hover:text-foreground hover:bg-muted/80"
                                }`}
                        >
                            {preset.label}
                        </button>
                    );
                })}
            </div>

            {/* Divider */}
            <span className="hidden sm:block text-border">|</span>

            {/* Inputs manuales */}
            <div className="flex items-center gap-2">
                <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => onChange(e.target.value, endDate)}
                    className="w-[130px] h-8 text-xs"
                />
                <span className="text-muted-foreground text-xs">—</span>
                <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => onChange(startDate, e.target.value)}
                    className="w-[130px] h-8 text-xs"
                />
            </div>
        </div>
    );
}

// ── KPI Card ───────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, accent = "default" }: {
    icon: React.ElementType;
    label: string;
    value: string;
    sub?: string;
    accent?: "default" | "success" | "destructive";
}) {
    const accentMap = {
        default: "text-foreground",
        success: "text-[hsl(var(--success))]",
        destructive: "text-destructive",
    };
    return (
        <Card className="p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
                <Icon size={14} />
                {label}
            </div>
            <span className={`text-2xl font-bold tabular-nums ${accentMap[accent]}`}>{value}</span>
            {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
        </Card>
    );
}

// ── Skeleton Blocks ────────────────────────────────────

function KpiSkeleton() {
    return (
        <Card className="p-5 flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
        </Card>
    );
}

function ChartSkeleton() {
    return (
        <Card className="p-5">
            <Skeleton className="h-4 w-40 mb-4" />
            <Skeleton className="h-[260px] w-full rounded-xl" />
        </Card>
    );
}

function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <Card className="overflow-hidden">
            <div className="p-5 pb-3"><Skeleton className="h-4 w-44" /></div>
            <Table>
                <TableHeader>
                    <TableRow>
                        {Array.from({ length: cols }).map((_, i) => (
                            <TableHead key={i}><Skeleton className="h-3 w-20" /></TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: rows }).map((_, r) => (
                        <TableRow key={r}>
                            {Array.from({ length: cols }).map((_, c) => (
                                <TableCell key={c}><Skeleton className="h-3 w-full" /></TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}

// ── Sales Report ───────────────────────────────────────

function SalesReport() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const startDate = searchParams.get("from") || "";
    const endDate = searchParams.get("to") || "";
    const [branchId, setBranchId] = React.useState<string>("all");

    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
    const [saleDetails, setSaleDetails] = useState<any>(null);
    const [rowMeta, setRowMeta] = useState<any>(null); // Datos de la fila (cajero, sucursal, metodo)
    const [isLoadingSale, setIsLoadingSale] = useState(false);

    const handleRowClick = async (transaction: any) => {
        setSelectedSaleId(transaction.id);
        setRowMeta(transaction);
        setIsLoadingSale(true);
        try {
            const response = await api.get(`/pos/sales/${transaction.id}`);
            setSaleDetails(response.data);
        } catch (e) {
            toast({ title: "Error", description: "No se pudo cargar el detalle", variant: "destructive" });
        } finally {
            setIsLoadingSale(false);
        }
    };

    const handleRangeChange = (from: string, to: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (from) params.set("from", from); else params.delete("from");
        if (to) params.set("to", to); else params.delete("to");
        router.push(`?${params.toString()}`);
    };

    const [isExporting, setIsExporting] = useState(false);
    const handleExport = async () => {
        try {
            setIsExporting(true);
            await apiService.exportSalesExcel(startDate || undefined, endDate || undefined, branchId !== 'all' ? branchId : undefined);
            toast({ title: "✅ Excel descargado", description: "Revisa tu carpeta de Descargas." });
        } catch (e) {
            toast({ title: "Error", description: "No se pudo generar el Excel.", variant: "destructive" });
        } finally {
            setIsExporting(false);
        }
    };

    const { data, isLoading } = useSWR(
        [`/reports/sales`, startDate, endDate, branchId],
        () => apiService.getReportSales(startDate, endDate, branchId !== 'all' ? branchId : undefined)
    );

    // Determinar modo automático: si el rango es 1 día → hora, si es varios días → día
    const isSingleDay = startDate === endDate || (!startDate && !endDate);
    const [chartMode, setChartMode] = useState<"hour" | "day">(isSingleDay ? "hour" : "day");

    // Re-ajustar modo cuando cambia el rango
    React.useEffect(() => {
        setChartMode(isSingleDay ? "hour" : "day");
    }, [isSingleDay]);

    if (isLoading || !data) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1, 2, 3].map(i => <KpiSkeleton key={i} />)}</div>
                <ChartSkeleton />
                <TableSkeleton rows={6} cols={5} />
            </div>
        );
    }

    const { kpis, chart_data, daily_chart_data, recent_transactions } = data;

    const isHourMode = chartMode === "hour";
    const activeChartData = isHourMode ? chart_data : (daily_chart_data ?? []);
    const xKey = isHourMode ? "hour" : "day";

    // KPI de ganancia total del periodo
    const totalGanancia = (daily_chart_data ?? []).reduce((sum: number, d: any) => sum + (d.ganancia ?? 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-semibold tracking-tight">Resumen de Ventas</h3>
                    <BranchFilter value={branchId} onChange={setBranchId} />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <DateRangeSelector
                        startDate={startDate}
                        endDate={endDate}
                        onChange={handleRangeChange}
                    />
                    {/* Botón exportar Excel */}
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={13} />
                        {isExporting ? "Generando..." : "Exportar Excel"}
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KpiCard icon={DollarSign} label="Venta Bruta Total" value={fmt(kpis.gross_sales)} sub="Periodo seleccionado" accent="success" />
                <KpiCard icon={TrendingUp} label="Ganancia Bruta" value={fmt(totalGanancia)} sub="Ventas − Costo" accent="success" />
                <KpiCard icon={Receipt} label="Ticket Promedio" value={fmt(kpis.avg_ticket)} sub={`${kpis.total_tickets} transacciones`} />
                <KpiCard icon={CreditCard} label="Pagos Digitales" value={fmt(kpis.digital_sales)} sub="Tarjeta / Transferencia" />
            </div>

            {/* Gráfico principal con toggle hora/día */}
            <Card className="p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div>
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">
                                {isHourMode ? "Flujo de Ventas por Hora" : "Ventas y Ganancia por Día"}
                            </h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                {isHourMode ? "Distribución horaria del periodo" : "Venta bruta vs ganancia por día"}
                            </p>
                        </div>
                    </div>
                    {/* Fila: leyenda + toggle */}
                    <div className="flex items-center gap-4 flex-wrap justify-end">
                        {/* Leyenda de líneas (solo modo día) */}
                        {!isHourMode && (
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <span className="inline-block w-3 h-3 rounded-full" style={{ background: "hsl(var(--primary))" }} />
                                    <span className="text-xs text-muted-foreground font-medium">Ventas brutas</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="inline-block w-3 h-3 rounded-full" style={{ background: "hsl(var(--success))" }} />
                                    <span className="text-xs text-muted-foreground font-medium">Ganancia (venta − costo)</span>
                                </div>
                            </div>
                        )}
                        {/* Toggle hora / día */}
                        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 border border-border">
                            <button
                                onClick={() => setChartMode("hour")}
                                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${isHourMode
                                    ? "bg-card text-primary shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                Por Hora
                            </button>
                            <button
                                onClick={() => setChartMode("day")}
                                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${!isHourMode
                                    ? "bg-card text-primary shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                Por Día
                            </button>
                        </div>
                    </div>
                </div>

                {isHourMode ? (
                    <ChartContainer
                        config={{ ventas: { label: "Ventas", color: "hsl(var(--success))" } }}
                        className="h-[260px] w-full"
                    >
                        <AreaChart data={activeChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="salesGradH" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                            <YAxis
                                tick={{ fontSize: 11 }}
                                className="text-muted-foreground"
                                tickFormatter={(v) => `$${v.toFixed(0)}`}
                                domain={[0, 'auto']}
                            />
                            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="4 3" />
                            <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
                            <Area type="monotone" dataKey="ventas" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#salesGradH)" />
                        </AreaChart>
                    </ChartContainer>
                ) : (
                    <ChartContainer
                        config={{
                            ventas: { label: "Ventas brutas", color: "hsl(var(--primary))" },
                            ganancia: { label: "Ganancia (venta−costo)", color: "hsl(var(--success))" },
                        }}
                        className="h-[260px] w-full"
                    >
                        <AreaChart data={activeChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="ventasGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gananciaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
                                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} className="text-muted-foreground" interval="preserveStartEnd" />
                            <YAxis
                                tick={{ fontSize: 11 }}
                                className="text-muted-foreground"
                                tickFormatter={(v) => `$${v.toFixed(0)}`}
                                domain={[(dataMin: number) => Math.min(0, dataMin), 'auto']}
                            />
                            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1.5} strokeDasharray="4 3" label={{ value: "$0", position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                            <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
                            <Area type="monotone" dataKey="ventas" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#ventasGrad)" />
                            <Area type="monotone" dataKey="ganancia" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#gananciaGrad)" />
                        </AreaChart>
                    </ChartContainer>
                )}
            </Card>

            {/* Gráfico de barras: Ganancia bruta por día (solo modo día) */}
            {!isHourMode && (daily_chart_data ?? []).length > 0 && (
                <Card className="p-5">
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-foreground">Ganancia Bruta por Día</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            Diferencia entre precio de venta y costo de adquisición
                        </p>
                    </div>
                    <ChartContainer
                        config={{ ganancia: { label: "Ganancia", color: "hsl(var(--success))" } }}
                        className="h-[220px] w-full"
                    >
                        <BarChart data={daily_chart_data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="day" tick={{ fontSize: 10 }} className="text-muted-foreground" interval="preserveStartEnd" />
                            <YAxis
                                tick={{ fontSize: 11 }}
                                className="text-muted-foreground"
                                tickFormatter={(v) => `$${v.toFixed(0)}`}
                                domain={[(dataMin: number) => Math.min(0, dataMin), 'auto']}
                            />
                            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1.5} strokeDasharray="4 3" />
                            <ChartTooltip
                                content={
                                    <ChartTooltipContent
                                        formatter={(value, name) => [fmt(Number(value)), "Ganancia bruta"]}
                                    />
                                }
                            />
                            <Bar
                                dataKey="ganancia"
                                fill="hsl(var(--success))"
                                radius={[5, 5, 0, 0]}
                                maxBarSize={40}
                            />
                        </BarChart>
                    </ChartContainer>
                </Card>
            )}

            {/* Transactions Table */}
            <Card className="overflow-hidden">
                <div className="p-5 pb-3">
                    <h3 className="text-sm font-semibold text-foreground">Últimas Transacciones</h3>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="table-header">ID Venta</TableHead>
                            <TableHead className="table-header">Cajero</TableHead>
                            <TableHead className="table-header">Sucursal</TableHead>
                            <TableHead className="table-header">Doc.</TableHead>
                            <TableHead className="table-header">Método de Pago</TableHead>
                            <TableHead className="table-header text-right">Total</TableHead>
                            <TableHead className="table-header text-center">Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recent_transactions
                            .map((t: any) => (
                            <TableRow key={t.id} onClick={() => handleRowClick(t)} className={`cursor-pointer hover:bg-muted/50 transition-colors ${t.estado === 'reembolsado' || t.estado === 'refunded' ? 'bg-red-50/50 opacity-80' : ''}`}>
                                <TableCell className="font-mono text-xs">{t.id}</TableCell>
                                <TableCell className="text-sm">{t.cajero}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 uppercase font-semibold">
                                        {t.sucursal || 'Casa Matriz'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                        {t.document_type || "boleta"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-sm">
                                        {t.metodo === "efectivo" ? <Wallet size={14} /> :
                                            t.metodo === "tarjeta" ? <CreditCard size={14} /> : <Smartphone size={14} />}
                                        {t.metodo}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-mono font-semibold text-sm">{fmt(t.total)}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={["validado", "pagado", "Completada", "Abierta"].includes(t.estado) ? "default" : "destructive"}
                                        className={["validado", "pagado", "Completada", "Abierta"].includes(t.estado) ? "bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-[hsl(var(--success-foreground))]" : ""}>
                                        {t.estado}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            {/* Modal for Sale Details */}
            <Dialog open={!!selectedSaleId} onOpenChange={(open) => {
                if (!open) {
                    setSelectedSaleId(null);
                    setSaleDetails(null);
                    setRowMeta(null);
                }
            }}>
                <DialogContent className="max-w-md md:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Detalle de Venta {selectedSaleId}</DialogTitle>
                        <DialogDescription>Información completa de la transacción.</DialogDescription>
                    </DialogHeader>
                    {isLoadingSale ? (
                        <div className="flex flex-col gap-4 py-4">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    ) : saleDetails ? (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><span className="text-muted-foreground font-semibold">Cajero:</span> {rowMeta?.cajero || "N/A"}</div>
                                <div><span className="text-muted-foreground font-semibold">Fecha:</span> {saleDetails.date_created ? new Date(saleDetails.date_created).toLocaleString("es-CL") : "N/A"}</div>
                                <div><span className="text-muted-foreground font-semibold">Total:</span> {fmt(Number(saleDetails.total_amount) || 0)}</div>
                                <div><span className="text-muted-foreground font-semibold">Método:</span> {rowMeta?.metodo || saleDetails.payment_method || "N/A"}</div>
                                <div><span className="text-muted-foreground font-semibold">Sucursal:</span> {rowMeta?.sucursal || "Casa Matriz"}</div>
                                <div><span className="text-muted-foreground font-semibold">Comprobante:</span> {saleDetails.document_type || "boleta"}</div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 border-b pb-1">Productos</h4>
                                <div className="max-h-60 overflow-y-auto pr-2">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Producto</TableHead>
                                                <TableHead className="text-right">Cant.</TableHead>
                                                <TableHead className="text-right">Precio</TableHead>
                                                <TableHead className="text-right">Subtotal</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(saleDetails.items || []).map((item: any, idx: number) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="text-xs">{item.product?.name || item.product_name || item.nombre || "—"}</TableCell>
                                                    <TableCell className="text-right text-xs">{Number(item.quantity) || 0}</TableCell>
                                                    <TableCell className="text-right text-xs">{fmt(Number(item.unit_price) || 0)}</TableCell>
                                                    <TableCell className="text-right text-xs font-semibold">{fmt(Number(item.subtotal) || 0)}</TableCell>
                                                </TableRow>
                                            ))}
                                            {(!saleDetails.items || saleDetails.items.length === 0) && (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground text-xs">No hay productos en esta orden.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-muted-foreground">No se encontró información.</div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ── Cash Report ────────────────────────────────────────

// ── Cash Report ────────────────────────────────────────

function CashReport() {
    const { data, isLoading } = useSWR("/reports/sales/cash_reports", apiService.getReportCash);

    if (isLoading || !data) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1, 2, 3].map(i => <KpiSkeleton key={i} />)}</div>
                <ChartSkeleton />
                <TableSkeleton rows={5} cols={5} />
            </div>
        );
    }

    const { kpis, sessions } = data;
    const { cash_in_hand, total_difference } = kpis;

    // Compute Cash by Teller for chart
    // Group sessions by user
    const tellerStats: Record<string, { expected: number, real: number }> = {};
    sessions.forEach((s: any) => {
        const u = s.usuario;
        if (!tellerStats[u]) tellerStats[u] = { expected: 0, real: 0 };
        // Expected = Cierre - Diferencia? Or Initial + Sales? 
        // Backend sessions has initial, final, diff. 
        // Expected = Final - Diff. (Since Diff = Final - Expected => Expected = Final - Diff)
        const expected = (s.cierreMonto || 0) - (s.diferencia || 0);
        tellerStats[u].expected += expected;
        tellerStats[u].real += (s.cierreMonto || 0);
    });

    const cashByTeller = Object.keys(tellerStats).map(u => ({
        cajero: u,
        esperado: tellerStats[u].expected,
        real: tellerStats[u].real
    }));

    // Mock returns
    const totalDevoluciones = 0; // Backend doesn't send this yet in cash_reports, can be added or derived

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard icon={Banknote} label="Efectivo Neto en Caja" value={fmt(cash_in_hand)} sub="Cierre del día / Actual" />
                <KpiCard
                    icon={AlertTriangle}
                    label="Diferencias Detectadas"
                    value={fmt(total_difference)}
                    sub={total_difference < 0 ? "Faltante" : total_difference > 0 ? "Sobrante" : "Sin diferencia"}
                    accent={total_difference < 0 ? "destructive" : total_difference > 0 ? "success" : "default"}
                />
                <KpiCard icon={RotateCcw} label="Total Devoluciones" value={fmt(totalDevoluciones)} sub="N/A" />
            </div>

            {/* Bar Chart */}
            <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Efectivo Esperado vs Real por Cajero (Acumulado)</h3>
                <ChartContainer
                    config={{
                        esperado: { label: "Esperado", color: "hsl(var(--primary))" },
                        real: { label: "Real", color: "hsl(var(--success))" },
                    }}
                    className="h-[260px] w-full"
                >
                    <BarChart data={cashByTeller} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="cajero" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `$${(v).toFixed(0)}`} />
                        <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
                        <Bar dataKey="esperado" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={28} />
                        <Bar dataKey="real" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} barSize={28} />
                    </BarChart>
                </ChartContainer>
            </Card>

            {/* Sessions Table */}
            <Card className="overflow-hidden">
                <div className="p-5 pb-3">
                    <h3 className="text-sm font-semibold text-foreground">Sesiones de Caja Recientes</h3>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="table-header">Usuario / Caja</TableHead>
                            <TableHead className="table-header">Apertura</TableHead>
                            <TableHead className="table-header">Cierre</TableHead>
                            <TableHead className="table-header text-right">Diferencia</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sessions.map((s: any, i: number) => (
                            <TableRow key={i}>
                                <TableCell>
                                    <div className="text-sm font-medium">{s.usuario}</div>
                                    <div className="text-xs text-muted-foreground">{s.caja}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-mono text-sm">{fmt(s.aperturaMonto)}</div>
                                    <div className="text-xs text-muted-foreground">{s.aperturaHora}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-mono text-sm">{fmt(s.cierreMonto)}</div>
                                    <div className="text-xs text-muted-foreground">{s.cierreHora}</div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex flex-col items-end">
                                        <span className={`font-mono font-semibold text-sm ${s.diferencia < 0 ? "text-destructive" : s.diferencia > 0 ? "text-[hsl(var(--success))]" : "text-muted-foreground"
                                            }`}>
                                            {s.diferencia > 0 ? "+" : ""}{fmt(s.diferencia)}
                                        </span>
                                        <Badge variant={s.estado === "open" ? "secondary" : "outline"} className="text-[9px] h-4">
                                            {s.estado === "open" ? "Abierta" : "Cerrada"}
                                        </Badge>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}

// ── Profitability Mock Data ─────────────────────────────

const categoryMargins = [
    { categoria: "Aceites", costo: 180, venta: 320 },
    { categoria: "Filtros", costo: 95, venta: 185 },
    { categoria: "Frenos", costo: 420, venta: 680 },
    { categoria: "Neumáticos", costo: 1200, venta: 1850 },
    { categoria: "Mano de Obra", costo: 0, venta: 450 },
];

const productMargins = [
    { descripcion: "Aceite Sintético 5W30", categoria: "Insumo", costo: 185, venta: 340, unidades: 42 },
    { descripcion: "Filtro de Aceite Universal", categoria: "Insumo", costo: 65, venta: 145, unidades: 38 },
    { descripcion: "Pastillas de Freno Cerámicas", categoria: "Insumo", costo: 380, venta: 650, unidades: 15 },
    { descripcion: "Alineación y Balanceo", categoria: "Servicio", costo: 0, venta: 450, unidades: 22 },
    { descripcion: "Llanta 205/55 R16", categoria: "Insumo", costo: 1250, venta: 1890, unidades: 8 },
    { descripcion: "Cambio de Aceite Completo", categoria: "Servicio", costo: 0, venta: 350, unidades: 35 },
    { descripcion: "Filtro de Aire Motor", categoria: "Insumo", costo: 120, venta: 210, unidades: 28 },
    { descripcion: "Disco de Freno Ventilado", categoria: "Insumo", costo: 480, venta: 750, unidades: 10 },
];

// ── Profitability Report ──────────────────────────────

function ProfitabilityReport() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const startDate = searchParams.get("from") || "";
    const endDate = searchParams.get("to") || "";
    const [branchId, setBranchId] = React.useState<string>("all");

    const handleRangeChange = (from: string, to: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (from) params.set("from", from); else params.delete("from");
        if (to) params.set("to", to); else params.delete("to");
        router.push(`?${params.toString()}`);
    };

    const [isExporting, setIsExporting] = useState(false);
    const handleExport = async () => {
        try {
            setIsExporting(true);
            await apiService.exportSalesExcel(startDate || undefined, endDate || undefined, branchId !== 'all' ? branchId : undefined);
            toast({ title: "✅ Excel descargado", description: "El reporte incluye el detalle de márgenes y costos." });
        } catch (e) {
            toast({ title: "Error", description: "No se pudo generar el Excel.", variant: "destructive" });
        } finally {
            setIsExporting(false);
        }
    };

    const { data, isLoading } = useSWR(
        [`/reports/sales/profitability`, startDate, endDate, branchId],
        () => apiService.getReportProfitability(startDate, endDate, branchId !== 'all' ? branchId : undefined)
    );

    if (isLoading || !data) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1, 2, 3].map(i => <KpiSkeleton key={i} />)}</div>
                <ChartSkeleton />
                <TableSkeleton rows={8} cols={6} />
            </div>
        );
    }

    const { kpis, chart_data, table_data } = data;
    const { total_margin, global_margin_pct, best_product, best_product_margin } = kpis;

    // Compute contribution for table
    const productsWithContribution = table_data.map((p: any) => ({
        ...p,
        contribucion: total_margin > 0 ? (p.margen / total_margin) * 100 : 0,
    }));

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-semibold tracking-tight">Rentabilidad</h3>
                    <BranchFilter value={branchId} onChange={setBranchId} />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <DateRangeSelector
                        startDate={startDate}
                        endDate={endDate}
                        onChange={handleRangeChange}
                    />
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={13} />
                        {isExporting ? "Generando..." : "Exportar Excel de Rentabilidad"}
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard icon={TrendingUp} label="Utilidad Total del Mes" value={fmt(total_margin)} sub="Margen neto acumulado" accent="success" />
                <KpiCard icon={Percent} label="% Margen Global" value={`${global_margin_pct.toFixed(1)}%`} sub="Sobre precio de venta" />
                <KpiCard icon={Award} label="Producto con Mejor Margen" value={best_product} sub={`${best_product_margin.toFixed(1)}% de margen`} accent="success" />
            </div>

            {/* Double Bar Chart */}
            <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Costo de Compra vs Precio de Venta por Categoría (Totales)</h3>
                <ChartContainer
                    config={{
                        costo: { label: "Costo Total", color: "hsl(var(--primary))" },
                        venta: { label: "Venta Total", color: "hsl(var(--success))" },
                    }}
                    className="h-[280px] w-full"
                >
                    <BarChart data={chart_data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="categoria" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `$${(v).toFixed(0)}`} />
                        <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
                        <Bar dataKey="costo" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={28} />
                        <Bar dataKey="venta" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} barSize={28} />
                    </BarChart>
                </ChartContainer>
            </Card>

            {/* Margin Analysis Table */}
            <Card className="overflow-hidden">
                <div className="p-5 pb-3">
                    <h3 className="text-sm font-semibold text-foreground">Análisis de Márgenes por Producto</h3>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="table-header">Descripción</TableHead>
                            <TableHead className="table-header">Categoría</TableHead>
                            <TableHead className="table-header text-right">Costo Prom.</TableHead>
                            <TableHead className="table-header text-right">Precio Venta Prom.</TableHead>
                            <TableHead className="table-header text-right">Margen Real ($)</TableHead>
                            <TableHead className="table-header">Contribución al Negocio</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {productsWithContribution.map((p: any, i: number) => (
                            <TableRow key={i}>
                                <TableCell className="text-sm font-medium">{p.descripcion}</TableCell>
                                <TableCell>
                                    <Badge variant={p.categoria === "Servicio" ? "secondary" : "outline"} className="text-xs">
                                        {p.categoria}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">{fmt(p.costo)}</TableCell>
                                <TableCell className="text-right font-mono text-sm">{fmt(p.venta)}</TableCell>
                                <TableCell className="text-right font-mono font-semibold text-sm text-[hsl(var(--success))]">
                                    {fmt(p.margen)}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Progress value={p.contribucion} className="h-2 w-20" />
                                        <span className="font-mono text-xs text-muted-foreground">{p.contribucion.toFixed(1)}%</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────

export default function PosReports() {
    return (
        <Tabs defaultValue="sales" className="space-y-6">
            <TabsList className="bg-muted border border-border">
                <TabsTrigger value="sales" className="gap-2 data-[state=active]:shadow-sm">
                    <BadgeDollarSign size={14} />
                    <span>Ventas</span>
                </TabsTrigger>
                <TabsTrigger value="cash" className="gap-2 data-[state=active]:shadow-sm">
                    <Banknote size={14} />
                    <span>Caja (Arqueo)</span>
                </TabsTrigger>
                <TabsTrigger value="profitability" className="gap-2 data-[state=active]:shadow-sm">
                    <TrendingUp size={14} />
                    <span>Rentabilidad</span>
                </TabsTrigger>
            </TabsList>

            <TabsContent value="sales">
                <SalesReport />
            </TabsContent>
            <TabsContent value="cash">
                <CashReport />
            </TabsContent>
            <TabsContent value="profitability">
                <ProfitabilityReport />
            </TabsContent>
        </Tabs>
    );
}
