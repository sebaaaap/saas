"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ShoppingBag, TrendingUp, Truck, Package, Download, AlertCircle, FileText, BarChart3, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ChartContainer, ChartTooltip, ChartTooltipContent
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import useSWR from "swr";
import { apiService } from "@/services/apiService";

// ── Helpers ────────────────────────────────────────────

const fmt = (n: number) =>
    n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

// ── Components ─────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, accent = "default" }: {
    icon: React.ElementType;
    label: string;
    value: string;
    sub?: string;
    accent?: "default" | "success" | "warning";
}) {
    const accentMap = {
        default: "text-foreground",
        success: "text-[hsl(var(--success))]",
        warning: "text-amber-500",
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

function TableSkeleton() {
    return (
        <Card className="overflow-hidden">
            <div className="p-5"><Skeleton className="h-6 w-48" /></div>
            <div className="space-y-2 p-5 pt-0">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
        </Card>
    );
}

// ── Main Component ─────────────────────────────────────

export default function PurchasesReport() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const startDate = searchParams.get("from") || "";
    const endDate = searchParams.get("to") || "";

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set(key, value);
        else params.delete(key);
        router.push(`?${params.toString()}`);
    };

    const { data, isLoading } = useSWR(
        ["/reports/purchases", startDate, endDate],
        () => apiService.getReportPurchases(startDate, endDate)
    );

    const [isExporting, setIsExporting] = useState(false);
    const handleDownload = async () => {
        try {
            setIsExporting(true);
            await apiService.exportPurchasesExcel(startDate || undefined, endDate || undefined);
            toast.success("✅ Excel de compras generado");
        } catch (e) {
            toast.error("Error al exportar compras.");
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading || !data) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <KpiSkeleton /><KpiSkeleton /><KpiSkeleton />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <TableSkeleton />
                    </div>
                    <div>
                        <ChartSkeleton />
                    </div>
                </div>
            </div>
        );
    }

    const { kpis, chart_data, movements } = data;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h3 className="text-lg font-semibold tracking-tight">Resumen de Compras</h3>
                <div className="flex items-center gap-2">
                    <Input
                        type="date"
                        value={startDate || ""}
                        onChange={(e) => handleFilterChange("from", e.target.value)}
                        className="w-[140px]"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                        type="date"
                        value={endDate || ""}
                        onChange={(e) => handleFilterChange("to", e.target.value)}
                        className="w-[140px]"
                    />
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard icon={ShoppingBag} label="Total Comprado (Mes)" value={fmt(kpis.total_invested)} sub="Órdenes confirmadas" accent="default" />
                <KpiCard icon={Truck} label="Órdenes Pendientes" value={String(kpis.pending_orders)} sub="Por recibir" accent={kpis.pending_orders > 0 ? "warning" : "default"} />
                <KpiCard icon={TrendingUp} label="Proveedor Principal" value={kpis.top_supplier.name} sub={fmt(kpis.top_supplier.volume)} accent="success" />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Movements Table */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="overflow-hidden">
                        <div className="p-5 border-b border-border flex items-center justify-between">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <FileText size={16} />
                                Últimos Movimientos
                            </h3>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleDownload}
                                disabled={isExporting}
                            >
                                <Download size={14} className="mr-2" />
                                {isExporting ? "Generando..." : "Excel"}
                            </Button>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Proveedor</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-right">Cantidad</TableHead>
                                    <TableHead className="text-right">Costo Unit.</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movements.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No hay movimientos de compra recientes.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    movements.map((m: any, i: number) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{m.fecha}</TableCell>
                                            <TableCell className="text-sm font-medium">{m.proveedor}</TableCell>
                                            <TableCell className="text-sm">{m.producto}</TableCell>
                                            <TableCell className="text-right font-mono text-sm">{m.cantidad}</TableCell>
                                            <TableCell className="text-right font-mono text-sm">{fmt(m.costoUnit)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </div>

                {/* Right: Chart */}
                <div className="space-y-6">
                    <Card className="p-5">
                        <h3 className="text-sm font-semibold mb-4">Top 5 Proveedores</h3>
                        <ChartContainer config={{ volume: { label: "Volumen", color: "hsl(var(--primary))" } }} className="h-[280px] w-full">
                            <BarChart data={chart_data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                                <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
                                <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ChartContainer>
                    </Card>

                    <Card className="p-6 bg-primary/5 border-primary/20">
                        <div className="flex items-start gap-4">
                            <div className="bg-primary/20 p-2 rounded-lg text-primary">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-1 text-primary-foreground">Análisis de Costos</h4>
                                <p className="text-xs text-muted-foreground mb-3">
                                    Los costos de insumos han variado un <strong>+12%</strong> respecto al mes pasado. Se sugiere revisar acuerdos con proveedores principales.
                                </p>
                                <Button size="sm" variant="secondary" className="w-full text-xs h-8">
                                    Ver Análisis Detallado <ArrowRight size={12} className="ml-1" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
