"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Search, Filter, MapPin, Package, Download, AlertCircle, TrendingDown,
    Layers, Grid2X2, Building2
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
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import useSWR from "swr";
import { apiService } from "@/services/apiService";

// ── Helpers ────────────────────────────────────────────

const fmtVal = (n: number) =>
    n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

// ── Components ─────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, note, accent = "default" }: {
    icon: React.ElementType;
    label: string;
    value: string;
    note?: string;
    accent?: "default" | "warning" | "destructive" | "success";
}) {
    const accentMap = {
        default: "text-foreground",
        warning: "text-amber-500",
        destructive: "text-destructive",
        success: "text-[hsl(var(--success))]"
    };
    return (
        <Card className="p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
                <Icon size={14} />
                {label}
            </div>
            <span className={`text-2xl font-bold tabular-nums ${accentMap[accent]}`}>{value}</span>
            {note && <span className="text-xs text-muted-foreground">{note}</span>}
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
        <Card className="p-5 h-[300px] flex items-center justify-center">
            <Skeleton className="h-48 w-48 rounded-full" />
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

export default function InventoryReports() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const categoryFilter = searchParams.get("category") || "all";
    const aisleFilter = searchParams.get("aisle") || "";
    const [branchId, setBranchId] = useState<string>("all");

    const { data: categories } = useSWR('/categories', apiService.getCategories);
    const { data: branches } = useSWR('/branches', apiService.getBranches);

    const { data, isLoading } = useSWR(
        [`/reports/inventory`, categoryFilter, aisleFilter, branchId],
        () => apiService.getReportInventory(
            categoryFilter === "all" ? undefined : categoryFilter,
            aisleFilter || undefined,
            branchId !== 'all' ? branchId : undefined
        )
    );

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value && value !== "all") params.set(key, value);
        else params.delete(key);
        router.push(`?${params.toString()}`);
    };

    const [isExporting, setIsExporting] = useState(false);
    const handleDownload = async () => {
        try {
            setIsExporting(true);
            await apiService.exportInventoryExcel(categoryFilter, aisleFilter);
            toast.success("✅ Excel de inventario generado");
        } catch (e) {
            toast.error("Error al exportar inventario.");
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

    const { kpis, donut_data, audit_table } = data;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-semibold tracking-tight">Estado de Inventario</h3>
                    {/* Branch filter — solo si hay más de 1 sucursal */}
                    {branches && branches.length > 1 && (
                        <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-muted-foreground" />
                            <Select value={branchId} onValueChange={setBranchId}>
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
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Select value={categoryFilter} onValueChange={(v) => handleFilterChange("category", v)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Categoría" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las categorías</SelectItem>
                            {categories?.map((c: any) => (
                                <SelectItem key={c.id} value={c.name}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Input
                        placeholder="Pasillo / Ubicación"
                        value={aisleFilter}
                        onChange={(e) => handleFilterChange("aisle", e.target.value)}
                        className="w-[180px]"
                    />
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard icon={BanknoteIcon} label="Valorización Total" value={fmtVal(kpis.total_valuation)} note="Calculado con costo promedio" accent="success" />
                <KpiCard icon={AlertCircle} label="Productos con Stock Crítico" value={String(kpis.low_stock)} note="Requieren reabastecimiento" accent="destructive" />
                <KpiCard icon={MapPin} label="Ubicaciones Ocupadas" value={String(kpis.occupied_locations)} note="Espacios utilizados en bodega" />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Table */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="overflow-hidden">
                        <div className="p-5 border-b border-border flex items-center justify-between">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <Grid2X2 size={16} />
                                Auditoría de Existencias
                            </h3>
                            <div className="flex gap-2">
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
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Ubicación (Coord.)</TableHead>
                                    <TableHead className="text-right">Stock Físico</TableHead>
                                    <TableHead className="text-center">Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {audit_table.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No se encontraron productos con los filtros actuales.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    audit_table.map((item: any, idx: number) => (
                                        <TableRow key={idx}>
                                            <TableCell>
                                                <div className="font-medium text-sm">{item.name}</div>
                                                <div className="text-xs text-muted-foreground">{item.category}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin size={12} className="text-muted-foreground" />
                                                    <span className="font-mono text-xs">{item.coord}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm">
                                                {item.stock}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.stock <= item.minStock ? (
                                                    <Badge variant="destructive" className="h-5 px-2 text-[10px]">Crítico</Badge>
                                                ) : item.stock <= item.minStock * 1.5 ? (
                                                    <Badge variant="outline" className="h-5 px-2 text-[10px] text-amber-500 border-amber-500">Bajo</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="h-5 px-2 text-[10px] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">Ok</Badge>
                                                )}
                                            </TableCell>
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
                        <h3 className="text-sm font-semibold mb-6">Distribución por Categoría</h3>
                        <div className="relative">
                            <ChartContainer
                                config={{
                                    value: {
                                        label: "Cantidad",
                                        color: "hsl(var(--chart-1))"
                                    }
                                }}
                                className="h-[250px] w-full"
                            >
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={donut_data}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {donut_data.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                                            ))}
                                        </Pie>
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "11px", paddingTop: "20px" }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                            {/* Center Text — positioned relative to chart wrapper */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-10">
                                <div className="text-center">
                                    <span className="text-2xl font-bold block">{donut_data.reduce((acc: number, cur: any) => acc + cur.value, 0)}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Items</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// Helper icon
function BanknoteIcon({ size }: { size: number }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="20" height="12" x="2" y="6" rx="2" />
            <circle cx="12" cy="12" r="2" />
            <path d="M6 12h.01M18 12h.01" />
        </svg>
    )
}
