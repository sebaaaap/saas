"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, FileText, CheckCircle, XCircle, Clock, Wrench, LayoutGrid, List, Printer, Send, X, CheckSquare, Square, Mail, Download, Share2, Trash2, Banknote, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { usePdfShare } from "@/hooks/usePdfShare";
import { DocumentTemplate } from "./DocumentTemplate";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiService } from "@/services/apiService";
import { useAuth } from "@/contexts/AuthContext";

export type StatusType = "PENDING" | "IN_PROGRESS" | "READY" | "REJECTED";

export interface QuoteOtItemDetail {
    id: string;
    product_name: string;
    product_type: string;
    quantity: number;
    price: number;
    is_service: boolean;
    done: boolean;
    is_paid?: boolean;
}

export interface QuoteOtItem {
    id: string;
    type: "quote" | "ot";
    date_created: string;
    customer_id: string;
    customer_name: string;
    customer_phone?: string;
    customer_email?: string;
    customer_rut?: string;
    vehicle_id?: string;
    vehicle_plate: string;
    vehicle_model: string;
    vehicle_brand?: string;
    vehicle_year?: number;
    vehicle_color?: string;
    mileage?: number;
    notes?: string;
    total: number;
    state: StatusType;
    items: QuoteOtItemDetail[];
    created_by_name?: string;
    financial_progress?: number;
}

const mockData: QuoteOtItem[] = [
    {
        id: "1001", type: "quote", date_created: "2026-02-24", customer_id: "m1", customer_name: "Juan Pérez", vehicle_plate: "KXPS-22", vehicle_model: "Toyota Yaris", total: 45000, state: "PENDING",
        items: [
            { id: "i1", product_name: "Filtro de Aceite Original", product_type: "PRODUCTO", quantity: 1, price: 15000, is_service: false, done: false },
            { id: "i2", product_name: "Mano de Obra Cambio", product_type: "SERVICIO", quantity: 1, price: 30000, is_service: true, done: false }
        ]
    },
    {
        id: "1002", type: "quote", date_created: "2026-02-23", customer_id: "m2", customer_name: "María Gómez", vehicle_plate: "BJFH-11", vehicle_model: "Nissan Versa", total: 120000, state: "REJECTED",
        items: [
            { id: "i3", product_name: "Pastillas de Freno Cerámicas", product_type: "PRODUCTO", quantity: 1, price: 80000, is_service: false, done: false },
            { id: "i4", product_name: "Instalación de Frenos", product_type: "SERVICIO", quantity: 1, price: 40000, is_service: true, done: false }
        ]
    },
    {
        id: "2001", type: "ot", date_created: "2026-02-22", customer_id: "m3", customer_name: "Carlos López", vehicle_plate: "PTLP-24", vehicle_model: "Kia Rio 5", total: 35000, state: "IN_PROGRESS",
        items: [
            { id: "i5", product_name: "Servicio Alineación", product_type: "SERVICIO", quantity: 1, price: 20000, is_service: true, done: true },
            { id: "i6", product_name: "Servicio Balanceo x4", product_type: "SERVICIO", quantity: 1, price: 15000, is_service: true, done: false }
        ]
    },
    {
        id: "2002", type: "ot", date_created: "2026-02-21", customer_id: "m4", customer_name: "Empresa Transportes SC", vehicle_plate: "HDKP-99", vehicle_model: "Ford F-150", total: 350000, state: "READY",
        items: [
            { id: "i7", product_name: "Neumático 265/70R17 A/T", product_type: "PRODUCTO", quantity: 4, price: 75000, is_service: false, done: true },
            { id: "i8", product_name: "Montaje y Balanceo", product_type: "SERVICIO", quantity: 4, price: 12500, is_service: true, done: true }
        ]
    },
];

export function QuotesOtManager({ type }: { type: "quote" | "ot" }) {
    const router = useRouter();
    const { user } = useAuth();
    const { generateAndDownloadPDF, handleWhatsAppShare, handleEmailShare } = usePdfShare();

    const [itemsList, setItemsList] = useState<QuoteOtItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
    const [filterState, setFilterState] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");

    // Modal State
    const [selectedDoc, setSelectedDoc] = useState<QuoteOtItem | null>(null);
    const [showPrintPreview, setShowPrintPreview] = useState(false);

    const handlePrint = () => {
        const printContent = document.getElementById("document-to-print");
        const windowUrl = 'about:blank';
        const uniqueName = new Date().getTime();
        const windowName = 'Print' + uniqueName;
        const printWindow = window.open(windowUrl, windowName, 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');

        if (printWindow && printContent) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Imprimir VANKAI</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                            body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; }
                            @page { margin: 1cm; size: auto; }
                        </style>
                    </head>
                    <body>
                        ${printContent.innerHTML}
                        <script>
                            setTimeout(() => {
                                window.print();
                                window.close();
                            }, 800);
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    const getShareDataForDoc = () => {
        if (!selectedDoc) return null;
        return {
            id: selectedDoc.id,
            type: selectedDoc.type,
            customer_name: selectedDoc.customer_name,
            customer_phone: selectedDoc.customer_phone,
            customer_email: selectedDoc.customer_email,
            vehicle_plate: selectedDoc.vehicle_plate,
            total: selectedDoc.total
        };
    };

    // --- Data Loading ---
    const loadData = async () => {
        setLoading(true);
        try {
            if (type === "quote") {
                const data = await apiService.getQuotes();
                // Map API response to Component Type
                const mapped = data.map((q: any) => ({
                    id: String(q.id),
                    type: "quote" as const,
                    date_created: q.created_at.split('T')[0],
                    customer_id: String(q.customer_id),
                    customer_name: q.customer?.name || "Desconocido",
                    customer_phone: q.customer?.phone,
                    customer_email: q.customer?.email,
                    customer_rut: q.customer?.rut,
                    vehicle_id: q.vehicle_id ? String(q.vehicle_id) : undefined,
                    vehicle_plate: q.vehicle?.license_plate || "N/A",
                    vehicle_model: q.vehicle?.model || "",
                    vehicle_brand: q.vehicle?.brand,
                    vehicle_year: q.vehicle?.year,
                    vehicle_color: q.vehicle?.color,
                    mileage: q.mileage !== null && q.mileage !== undefined ? Number(q.mileage) : undefined,
                    total: Number(q.total),
                    state: (q.state === "borrador" ? "PENDING" : (q.state === "rechazado" ? "REJECTED" : "READY")) as StatusType,
                    created_by_name: user?.full_name || user?.username || "Administrador",
                    items: q.items.map((i: any) => ({
                        id: String(i.id),
                        product_name: i.product_name || "Producto",
                        product_type: i.product_type || "PRODUCTO",
                        quantity: Number(i.quantity),
                        price: Number(i.unit_price),
                        is_service: i.product_type === "SERVICIO",
                        done: false
                    }))
                }));
                setItemsList(mapped);
            } else {
                const data = await apiService.getActiveWorkOrders();
                const mapped = data.map((wo: any) => ({
                    id: String(wo.id),
                    type: "ot" as const,
                    date_created: (wo.created_at || "2026-02-24").split('T')[0],
                    customer_id: String(wo.customer_id),
                    customer_name: wo.customer?.name || "Desconocido",
                    customer_phone: wo.customer?.phone,
                    customer_email: wo.customer?.email,
                    customer_rut: wo.customer?.rut,
                    vehicle_plate: wo.vehicle?.license_plate || "N/A",
                    vehicle_model: wo.vehicle?.model || "",
                    vehicle_brand: wo.vehicle?.brand,
                    vehicle_year: wo.vehicle?.year,
                    vehicle_color: wo.vehicle?.color,
                    vehicle_id: wo.vehicle_id ? String(wo.vehicle_id) : undefined,
                    mileage: wo.mileage !== null && wo.mileage !== undefined ? Number(wo.mileage) : undefined,
                    notes: wo.notes,
                    total: Number(wo.total_amount || 0),
                    state: (wo.state === "lista" ? "READY" : "IN_PROGRESS") as StatusType,
                    created_by_name: user?.full_name || user?.username || "Administrador",
                    items: wo.items?.map((i: any) => ({
                        id: String(i.id),
                        product_name: i.product_name || "Producto",
                        product_type: i.product_type || "PRODUCTO",
                        quantity: Number(i.quantity),
                        price: Number(i.unit_price),
                        is_service: i.product_type === "SERVICIO",
                        done: Boolean(i.done),
                        is_paid: Boolean(i.is_paid)
                    })) || [],
                    financial_progress: Number(wo.financial_progress || 0)
                }));
                setItemsList(mapped);
            }
        } catch (error) {
            console.error("Error loading quotes/ots:", error);
            toast.error("Error al cargar datos del servidor");
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        loadData();
    }, [type]);

    // --- State Handlers ---
    const approveQuote = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            toast.info("Aprobando cotización y creando OT...");
            await apiService.approveQuote(id);
            toast.success(`Cotización aprobada. Se ha generado la Orden de Trabajo.`);
            loadData();
            setSelectedDoc(null);
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.detail || "Error al aprobar cotización");
        }
    };

    const rejectQuote = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            toast.info("Rechazando cotización...");
            await apiService.rejectQuote(id);
            toast.success(`Cotización rechazada.`);
            loadData();
            setSelectedDoc(null);
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.detail || "Error al rechazar cotización");
        }
    };

    const handleExportPDF = (e: React.MouseEvent, item: QuoteOtItem) => {
        e.stopPropagation();
        setSelectedDoc(item);
        setShowPrintPreview(true);
    };

    const toggleItemDone = (itemId: string) => {
        if (!selectedDoc) return;

        const updatedDoc = {
            ...selectedDoc,
            items: selectedDoc.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i)
        };
        setSelectedDoc(updatedDoc);

        // Update in main list
        setItemsList(prev => prev.map(item => item.id === updatedDoc.id ? updatedDoc : item));
    };

    const markOtAsReady = async () => {
        if (!selectedDoc) return;
        if (!confirm("Se procederá a cerrar la OT y descontar los productos restantes del inventario. ¿Confirmar?")) return;
        try {
            await apiService.updateOtState(selectedDoc.id, "COMPLETED");
            setItemsList(prev => prev.map(item => item.id === selectedDoc.id ? { ...item, state: "READY" } : item));
            toast.success(`Orden de trabajo finalizada`);
            setSelectedDoc(null); // Cerrar modal
        } catch {
            toast.error("Error al actualizar estado de la OT");
        }
    };

    const syncOtProgress = async () => {
        if (!selectedDoc || selectedDoc.type !== "ot") return;
        try {
            const itemsPayload = selectedDoc.items.map(i => ({ id: i.id, done: i.done }));
            const result = await apiService.updateOtItemsDone(selectedDoc.id, itemsPayload);
            // Update state in UI from API response
            const newState = result.new_state === "lista" ? "READY" : result.new_state === "en_progreso" ? "IN_PROGRESS" : "PENDING";
            setItemsList(prev => prev.map(item => item.id === selectedDoc.id ? { ...item, state: newState as StatusType } : item));
            toast.success(`Progreso guardado: ${result.done_count}/${result.total} tareas completadas`);
            setSelectedDoc(null); // Cerrar modal al guardar
        } catch {
            toast.error("Error al guardar progreso en el servidor");
        }
    };

    const handleDeleteItem = async (e: React.MouseEvent, item: QuoteOtItem) => {
        e.stopPropagation();
        if (!confirm(`¿Está seguro que desea eliminar esta ${item.type === "quote" ? "cotización" : "orden de trabajo"}?`)) return;

        try {
            if (item.type === "quote") {
                await apiService.deleteQuote(item.id);
            } else {
                await apiService.deleteWorkOrder(item.id);
            }
            toast.success(`${item.type === "quote" ? "Cotización" : "Orden"} eliminada correctamente`);
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error al eliminar el registro");
        }
    };

    // --- Formatters ---
    const stateBadge = (state: string) => {
        const map: Record<string, { cls: string; label: string }> = {
            PENDING: { cls: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Pendiente" },
            IN_PROGRESS: { cls: "bg-blue-100 text-blue-700 border-blue-200", label: "En Proceso" },
            READY: { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Lista / Aprobada" },
            REJECTED: { cls: "bg-red-100 text-red-700 border-red-200", label: "Rechazada" },
        };
        const s = map[state] || map.PENDING;
        return (
            <span className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${s.cls}`}>
                {s.label}
            </span>
        );
    };

    // --- Filtering ---
    const filteredItems = itemsList.filter(item => {
        const matchesState = filterState === "" || item.state === filterState;
        const matchesSearch = item.vehicle_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesState && matchesSearch;
    });

    const quoteTabs = [
        { id: "", label: "Todas" },
        { id: "PENDING", label: "Pendientes" },
        { id: "REJECTED", label: "Rechazadas" },
    ];

    const otTabs = [
        { id: "", label: "Todas" },
        { id: "IN_PROGRESS", label: "En Proceso" },
        { id: "READY", label: "Listas" },
    ];

    const currentTabs = type === "quote" ? quoteTabs : otTabs;

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                <div>
                    <h2 className="text-lg font-bold text-foreground">
                        {type === "quote" ? "Cotizaciones del Taller" : "Órdenes de Trabajo Activas"}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {type === "quote" ? "Presupuestos entregados a clientes esperando aprobación." : "Trabajos en curso y vehículos listos para entrega."}
                    </p>
                </div>
                <button
                    onClick={() => router.push("/quotes-ot/new")}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                    <Plus size={16} />
                    <span>{type === "quote" ? "Nueva Cotización" : "Nueva OT"}</span>
                </button>
            </div>

            {/* Filter actions bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit border border-border">
                    {currentTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterState(tab.id)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterState === tab.id
                                ? "bg-card text-primary shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar Patente o Cliente..."
                            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transiton-all"
                        />
                    </div>
                    {/* View Switcher (Odoo Mode) */}
                    <div className="flex bg-muted p-1 rounded-xl border border-border shrink-0">
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <List size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode("kanban")}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'kanban' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <LayoutGrid size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Switcher */}
            {viewMode === "list" ? (
                // --- LIST VIEW ---
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border text-left">
                                    <th className="table-header">Referencia</th>
                                    <th className="table-header">Fecha</th>
                                    <th className="table-header">Cliente</th>
                                    <th className="table-header">Vehículo</th>
                                    <th className="table-header text-right">Total</th>
                                    <th className="table-header text-center whitespace-nowrap">Estado Trab.</th>
                                    {type === "ot" && <th className="table-header text-center whitespace-nowrap">Estado Pago</th>}
                                    <th className="table-header text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => setSelectedDoc(item)}
                                        className="group border-b border-border/50 last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer"
                                    >
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-primary text-sm uppercase">
                                                {type === "quote" ? "QT" : "OT"}-{item.id.slice(0, 4)}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-muted-foreground">
                                            {item.date_created}
                                        </td>
                                        <td className="px-5 py-4 font-medium text-foreground text-sm">
                                            {item.customer_name}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-foreground text-sm tracking-wider uppercase">{item.vehicle_plate}</div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5">{item.vehicle_model}</div>
                                        </td>
                                        <td className="px-5 py-4 text-right font-bold text-foreground text-sm">
                                            ${item.total.toLocaleString("es-CL")}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {item.type === "ot" ? (
                                                <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                                                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden border border-border/30">
                                                        <div
                                                            className="h-full bg-blue-500 transition-all duration-500"
                                                            style={{ width: `${(item.items.filter(i => i.done).length / (item.items.length || 1)) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-black text-blue-600 italic">
                                                        {Math.round((item.items.filter(i => i.done).length / (item.items.length || 1)) * 100)}%
                                                    </span>
                                                </div>
                                            ) : (
                                                stateBadge(item.state)
                                            )}
                                        </td>
                                        {type === "ot" && (
                                            <td className="px-5 py-4 text-center">
                                                <div className="relative group/pago flex flex-col items-center">
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${!item.financial_progress || item.financial_progress === 0 ? "bg-red-50 text-red-600 border-red-200" : item.financial_progress < 100 ? "bg-yellow-50 text-yellow-600 border-yellow-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}>
                                                        {!item.financial_progress || item.financial_progress === 0 ? "Sin Pago" : item.financial_progress < 100 ? "Pago Parcial" : "Pagado"}
                                                    </span>

                                                    {/* Tooltip de items pagados */}
                                                    {item.items.some(i => i.is_paid) && (
                                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 bg-white border border-border rounded-xl shadow-2xl p-3 z-50 opacity-0 group-hover/pago:opacity-100 pointer-events-none transition-all transform translate-y-2 group-hover/pago:translate-y-0">
                                                            <div className="flex items-center gap-1.5 mb-2 border-b border-slate-100 pb-2">
                                                                <Banknote size={12} className="text-emerald-500" />
                                                                <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Detalle de lo Pagado</p>
                                                            </div>
                                                            <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                                                {item.items.filter(i => i.is_paid).map(i => (
                                                                    <div key={i.id} className="flex justify-between items-start text-[10px] leading-tight">
                                                                        <span className="font-semibold text-slate-600 text-left mr-2">✓ {i.product_name}</span>
                                                                        <span className="text-emerald-600 font-black whitespace-nowrap">${(i.quantity * i.price).toLocaleString("es-CL")}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                                                                <span className="text-[10px] font-black text-slate-400">TOTAL ABONADO</span>
                                                                <span className="text-[11px] font-black text-slate-900">${(item.items.filter(i => i.is_paid).reduce((acc, i) => acc + (i.quantity * i.price), 0)).toLocaleString("es-CL")}</span>
                                                            </div>
                                                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-border rotate-45" />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => handleExportPDF(e, item)}
                                                    className="p-1.5 bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors tooltip-trigger"
                                                    title="Exportar PDF"
                                                >
                                                    <FileText size={16} />
                                                </button>
                                                {type === "quote" && item.state === "PENDING" && (
                                                    <>
                                                        <button
                                                            onClick={(e) => approveQuote(e, item.id)}
                                                            className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors"
                                                            title="Aprobar y crear OT"
                                                        >
                                                            <CheckCircle size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => rejectQuote(e, item.id)}
                                                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                                                            title="Rechazar"
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={(e) => handleDeleteItem(e, item)}
                                                    className="p-1.5 bg-muted text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredItems.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                            {type === "quote" ? <Clock size={56} strokeWidth={1} className="mb-4 opacity-40" /> : <Wrench size={56} strokeWidth={1} className="mb-4 opacity-40" />}
                            <p className="text-lg font-medium">No hay registros</p>
                            <p className="text-sm mt-1 opacity-70">Aún no existen {type === "quote" ? "cotizaciones" : "órdenes"} bajo estos filtros</p>
                        </div>
                    )}
                </div>
            ) : (
                // --- KANBAN VIEW ---
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredItems.map(item => {
                        const doneCount = item.items.filter(i => i.done).length;
                        const totalCount = item.items.length || 1;
                        const progress = doneCount / totalCount;

                        // Color coding for OT cards
                        const otCardColor = item.type === "ot"
                            ? progress === 0
                                ? "bg-indigo-50 border-indigo-200 hover:border-indigo-300"        // Índigo: sin progreso
                                : progress < 1
                                    ? "bg-yellow-50 border-yellow-200 hover:border-yellow-300"    // Amarillo: en proceso
                                    : "bg-emerald-50 border-emerald-200 hover:border-emerald-300"  // Verde: terminado
                            : "bg-card border-border hover:shadow-md"; // Quotes: normal

                        const otProgressColor = progress === 0
                            ? "bg-indigo-400"
                            : progress < 1
                                ? "bg-yellow-400"
                                : "bg-emerald-500";

                        return (
                            <div
                                key={item.id}
                                onClick={() => setSelectedDoc(item)}
                                className={`border rounded-2xl p-5 shadow-sm transition-all flex flex-col relative group cursor-pointer ${otCardColor}`}
                            >
                                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleExportPDF(e, item)}
                                        className="p-1.5 bg-white/80 text-muted-foreground hover:text-primary hover:bg-white rounded-md transition-colors shadow-sm"
                                        title="Exportar PDF"
                                    >
                                        <FileText size={14} />
                                    </button>
                                    {type === "quote" && item.state === "PENDING" && (
                                        <>
                                            <button
                                                onClick={(e) => approveQuote(e, item.id)}
                                                className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors"
                                                title="Aprobar y crear OT"
                                            >
                                                <CheckCircle size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>

                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-black tracking-tight text-foreground uppercase">{item.vehicle_plate}</h3>
                                        <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{item.vehicle_model}</p>
                                    </div>
                                </div>

                                <div className="bg-white/60 p-2.5 rounded-lg border border-white/80 mb-4">
                                    <p className="text-xs font-bold text-foreground truncate">{item.customer_name}</p>
                                </div>

                                <div className="mt-auto space-y-3 pt-2 border-t border-black/5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-muted-foreground">Total</span>
                                        <span className="text-sm font-black text-foreground">${item.total.toLocaleString("es-CL")}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-muted-foreground">{item.type === 'ot' ? 'Progreso' : 'Estado'}</span>
                                        {item.type === "ot" ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-black/10 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${otProgressColor}`}
                                                        style={{ width: `${progress * 100}%` }}
                                                    />
                                                </div>
                                                <span className={`text-[10px] font-black ${progress === 0 ? 'text-indigo-600' : progress < 1 ? 'text-yellow-600' : 'text-emerald-600'}`}>
                                                    {Math.round(progress * 100)}%
                                                </span>
                                            </div>
                                        ) : (
                                            stateBadge(item.state)
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredItems.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted-foreground">No se encontraron registros para la vista Kanban.</div>
                    )}
                </div>
            )
            }

            {/* DETAIL MODAL */}
            <Dialog open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
                {selectedDoc && (
                    <DialogContent className="max-w-3xl bg-card border border-border p-0 overflow-hidden sm:rounded-2xl flex flex-col max-h-[90vh] [&>button]:hidden">
                        <DialogTitle className="sr-only">Detalle del Documento</DialogTitle>
                        {/* Modal Header */}
                        <div className="px-8 py-5 border-b border-border flex justify-between items-center bg-gradient-to-r from-primary via-primary/95 to-primary/80 rounded-t-2xl shrink-0">
                            <div>
                                <h2 className="text-lg font-black text-primary-foreground flex items-center gap-2 tracking-tight uppercase">
                                    {selectedDoc.type === "quote" ? "Cotización QT" : "Orden OT"}-{selectedDoc.id.slice(0, 4)}
                                    {stateBadge(selectedDoc.state)}
                                </h2>
                                <p className="text-xs text-primary-foreground/70 font-medium mt-1">
                                    {selectedDoc.customer_name} • {selectedDoc.vehicle_plate}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedDoc.type === "ot" && (
                                    <button
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-xs font-bold shadow-md"
                                        title="Abrir Ficha de Recepción"
                                        onClick={() => { setSelectedDoc(null); router.push(`/quotes-reception?id=${selectedDoc.id}`); }}
                                    >
                                        <ClipboardList size={15} />
                                        <span className="hidden sm:inline">Ficha Recepción</span>
                                    </button>
                                )}
                                <button 
                                    className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all hover:scale-105" 
                                    title="Imprimir" 
                                    onClick={() => toast.info("Generando impresión local...")}
                                >
                                    <Printer size={18} />
                                </button>
                                <button 
                                    className="p-2 bg-white/10 text-white rounded-lg hover:bg-blue-500/30 hover:text-white transition-all hover:scale-105" 
                                    title="Enviar por Correo" 
                                    onClick={() => getShareDataForDoc() && handleEmailShare("hidden-pdf-container", getShareDataForDoc()!)}
                                >
                                    <Mail size={18} />
                                </button>
                                <button 
                                    className="p-2 bg-white/10 text-white rounded-lg hover:bg-[#25D366]/40 hover:text-white transition-all hover:scale-105" 
                                    title="Compartir vía WhatsApp" 
                                    onClick={() => getShareDataForDoc() && handleWhatsAppShare("hidden-pdf-container", getShareDataForDoc()!)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                                    </svg>
                                </button>
                                <button 
                                    className="p-2 bg-white/10 text-white rounded-lg hover:bg-red-500/30 hover:text-white transition-all hover:scale-105" 
                                    title="Vista Previa PDF" 
                                    onClick={(e) => { e.stopPropagation(); setShowPrintPreview(true); }}
                                >
                                    <FileText size={18} />
                                </button>
                                <div className="w-px h-6 bg-primary-foreground/20 mx-2" />
                                <button onClick={() => setSelectedDoc(null)} className="p-2 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body / Items List */}
                        <div className="p-8 flex-1 overflow-y-auto bg-muted/10">
                            {selectedDoc.type === "ot" && (
                                <div className="mb-8">
                                    <div className="flex justify-between items-end mb-2">
                                        <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                                            Progreso de la Orden
                                        </h3>
                                        <span className="text-sm font-black text-primary">
                                            {Math.round((selectedDoc.items.filter(i => i.done).length / (selectedDoc.items.length || 1)) * 100)}%
                                        </span>
                                    </div>
                                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden border border-border/50">
                                        <div
                                            className="h-full bg-primary transition-all duration-500 ease-out shadow-sm"
                                            style={{ width: `${(selectedDoc.items.filter(i => i.done).length / (selectedDoc.items.length || 1)) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-2 font-medium">
                                        {selectedDoc.items.filter(i => i.done).length} de {selectedDoc.items.length} tareas completadas
                                    </p>
                                </div>
                            )}

                            {/* New Info Section: Client & Vehicle Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                {/* Customer Info Card */}
                                <div className="bg-card border border-border rounded-xl p-5 space-y-3 shadow-sm">
                                    <div className="flex items-center gap-2 text-primary">
                                        <div className="p-1.5 bg-primary/10 rounded-lg">
                                            <Search size={16} />
                                        </div>
                                        <h4 className="text-xs font-black uppercase tracking-wider">Ficha Cliente</h4>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                                            <span className="text-muted-foreground font-medium">RUT</span>
                                            <span className="font-bold">{selectedDoc.customer_rut || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                                            <span className="text-muted-foreground font-medium">Teléfono</span>
                                            <span className="font-bold text-emerald-600 cursor-pointer hover:underline">{selectedDoc.customer_phone || "No registrado"}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground font-medium">Email</span>
                                            <span className="font-bold truncate max-w-[150px]">{selectedDoc.customer_email || "N/A"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Vehicle Info Card */}
                                <div className="bg-card border border-border rounded-xl p-5 space-y-3 shadow-sm">
                                    <div className="flex items-center gap-2 text-orange-600">
                                        <div className="p-1.5 bg-orange-50 rounded-lg">
                                            <Wrench size={16} />
                                        </div>
                                        <h4 className="text-xs font-black uppercase tracking-wider">Datos Vehículo</h4>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                                            <span className="text-muted-foreground font-medium">Marca / Modelo</span>
                                            <span className="font-bold">{selectedDoc.vehicle_brand || ""} {selectedDoc.vehicle_model}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                                            <span className="text-muted-foreground font-medium">Año / Color</span>
                                            <span className="font-bold text-sm uppercase">{selectedDoc.vehicle_year || "S/A"} • {selectedDoc.vehicle_color || "S/A"}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground font-medium font-bold">KM Ingreso</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-lg font-black text-xs border border-orange-100 italic">
                                                    {selectedDoc.mileage !== undefined ? selectedDoc.mileage.toLocaleString("es-CL") : "---"} KM
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedDoc.notes && (
                                <div className="mb-8 p-4 bg-yellow-50/50 border border-yellow-100 rounded-xl">
                                    <h4 className="text-[10px] font-black uppercase text-yellow-800 tracking-widest mb-2">Notas del Recepcionista</h4>
                                    <p className="text-sm text-yellow-900 font-medium italic italic">"{selectedDoc.notes}"</p>
                                </div>
                            )}

                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                                {selectedDoc.type === "ot" ? "Detalle de Tareas" : "Productos y Servicios Cotizados"}
                            </h3>

                            <div className="space-y-3">
                                {selectedDoc.items.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => selectedDoc.type === "ot" && toggleItemDone(item.id)}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${selectedDoc.type === "ot" ? 'cursor-pointer hover:bg-card/80' : ''} ${item.done ? 'bg-emerald-50/50 border-emerald-200' : 'bg-card border-border'} ${item.is_paid ? 'opacity-80' : ''}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Checkbox solo visible en OTs */}
                                            {selectedDoc.type === "ot" && (
                                                <div className={`text-${item.done ? 'emerald-500' : 'muted-foreground'}`}>
                                                    {item.done ? <CheckSquare size={22} className="text-emerald-500" /> : <Square size={22} />}
                                                </div>
                                            )}

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className={`font-bold text-sm ${item.done ? 'text-emerald-900 line-through opacity-70' : 'text-foreground'}`}>
                                                        {item.product_name}
                                                    </p>
                                                    {item.is_service ?
                                                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-black uppercase">Mano de Obra</span> :
                                                        <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[9px] font-black uppercase">Repuesto</span>
                                                    }
                                                    {item.is_paid && (
                                                        <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-black uppercase flex items-center gap-1">
                                                            <Banknote size={10} /> PAGADO
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Cantidad: {item.quantity} x ${item.price.toLocaleString("es-CL")}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className={`font-black tracking-tight ${item.done ? 'text-emerald-700 opacity-70' : 'text-foreground'}`}>
                                                ${(item.quantity * item.price).toLocaleString("es-CL")}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer / Summary */}
                        <div className="px-8 py-5 border-t border-border bg-card shrink-0 flex justify-between items-center">
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Total del Documento</p>
                                <p className="text-2xl font-black text-foreground">${selectedDoc.total.toLocaleString("es-CL")}</p>
                            </div>

                            {/* Buttons based on type and state — no print duplicate here */}
                            <div className="flex gap-3">
                                {selectedDoc.type === "ot" && (selectedDoc.state === "IN_PROGRESS" || selectedDoc.state === "PENDING") && (
                                    <>
                                        <Button
                                            onClick={syncOtProgress}
                                            variant="outline"
                                            className="border-2 font-bold h-12 px-6 rounded-xl border-primary/20 hover:bg-primary/5 text-primary transition-all"
                                        >
                                            <Clock size={18} className="mr-2" />
                                            Guardar Progreso
                                        </Button>
                                        <Button
                                            onClick={markOtAsReady}
                                            disabled={!selectedDoc.items.every((i: any) => i.done)}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 px-6 rounded-xl shadow-lg shadow-emerald-200/50 transition-all disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed"
                                            title={!selectedDoc.items.every((i: any) => i.done) ? "Marca todas las tareas como completadas para finalizar" : ""}
                                        >
                                            <CheckCircle className="mr-2 h-5 w-5" />
                                            Finalizar y Entregar
                                        </Button>
                                    </>
                                )}

                                {selectedDoc.type === "quote" && selectedDoc.state === "PENDING" && (
                                    <div className="flex gap-3">
                                        <Button
                                            onClick={(e) => rejectQuote(e, selectedDoc.id)}
                                            variant="outline"
                                            className="border-red-500 test-red-600 hover:bg-red-50 font-bold h-12 px-6 rounded-xl border-2"
                                        >
                                            <XCircle className="mr-2 h-5 w-5" />
                                            Rechazar
                                        </Button>
                                        <Button
                                            onClick={(e) => approveQuote(e, selectedDoc.id)}
                                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 px-6 rounded-xl shadow-lg shadow-primary/20"
                                        >
                                            <CheckCircle className="mr-2 h-5 w-5" />
                                            Aprobar Cotización
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </DialogContent>
                )}
            </Dialog>

            {/* Modal de Vista Previa de Impresión / PDF */}
            <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border border-border/30 bg-background/40 backdrop-blur-2xl shadow-2xl sm:rounded-2xl">
                    <DialogTitle className="sr-only">Vista Previa de Impresión</DialogTitle>
                    <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl text-foreground px-8 py-4 flex justify-between items-center border-b border-border/50 shadow-sm">
                        <div>
                            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                                <Printer size={24} className="text-primary" /> VISTA PREVIA DEL DOCUMENTO
                            </h2>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">VANKAI KRYPTONITA VULCANIZACIÓN</p>
                        </div>
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                onClick={() => setShowPrintPreview(false)}
                                className="bg-card/50 backdrop-blur-md border-border/50 text-foreground hover:bg-muted rounded-xl px-6 font-bold"
                            >
                                <X size={18} className="mr-2" /> Cerrar
                            </Button>
                            <Button
                                onClick={handlePrint}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-8 rounded-xl shadow-lg shadow-primary/40 h-11"
                            >
                                <Download size={18} className="mr-2" /> DESCARGAR PDF / IMPRIMIR
                            </Button>
                        </div>
                    </div>

                    <div className="p-12 pb-24 flex justify-center min-h-screen">
                        <div className="bg-white shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-[800px] transform hover:scale-[1.01] transition-transform duration-500">
                            {selectedDoc && (
                                <DocumentTemplate data={selectedDoc} type={selectedDoc.type} />
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Hidden Container for PDF Generation */}
            <div style={{ position: "absolute", top: "-9999px", left: "-9999px", pointerEvents: "none", zIndex: -50 }}>
                <div id="hidden-pdf-container" className="bg-white p-12 text-black" style={{ width: "800px", minHeight: "1131px", fontFamily: "Arial, sans-serif" }}>
                    {selectedDoc && (
                        <DocumentTemplate data={selectedDoc} type={selectedDoc.type} />
                    )}
                </div>
            </div>
        </div >
    );
}
