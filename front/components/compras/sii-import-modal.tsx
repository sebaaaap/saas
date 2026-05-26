"use client";

import React, { useRef, useState, useEffect } from "react";
import {
    X, Upload, FileSpreadsheet, ChevronDown, ChevronRight,
    CheckCircle2, AlertCircle, Loader2, ShoppingCart, Building2,
    Hash, Package, Tag, Percent, DollarSign, Link2, Fuel, RefreshCcw
} from "lucide-react";
import api from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SIIItem {
    code: string;
    name: string;
    quantity: number | null;
    price: number | null;
    discount_pct: number | null;
    discount_amount: number | null;
    final_price: number | null;
}

interface SIIInvoice {
    supplier_rut: string;
    supplier_name: string;
    supplier_id: string | null;
    invoice_number: string;
    date_created: string | null;
    already_imported: boolean;
    items: SIIItem[];
}

interface SIISupplier {
    rut: string;
    name: string;
    invoices: SIIInvoice[];
}

interface ParsedResult {
    suppliers: SIISupplier[];
}

interface CatalogProduct {
    id: string;
    name: string;
    barcode: string;
    internal_reference?: string;
    cost: number;
    suppliers_info?: { supplier_id: string; supplier_code: string }[];
}

interface Props {
    onClose: () => void;
    onImported: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined) =>
    n != null ? `$${Math.round(n).toLocaleString("es-CL")}` : "—";

const supplierTotal = (sup: SIISupplier) =>
    sup.invoices.reduce(
        (s, inv) => s + inv.items.reduce((ss, it) => ss + (it.final_price ?? 0), 0),
        0
    );

// ─── Component ───────────────────────────────────────────────────────────────

export function SIIImportModal({ onClose, onImported }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [parsed, setParsed] = useState<ParsedResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [openSuppliers, setOpenSuppliers] = useState<Record<string, boolean>>({});
    const [openInvoices, setOpenInvoices] = useState<Record<string, boolean>>({});
    const [importing, setImporting] = useState<Record<string, boolean>>({});
    const [imported, setImported] = useState<Record<string, boolean>>({});
    // catalog: barcode -> product
    const [catalog, setCatalog] = useState<Record<string, CatalogProduct>>({});
    // per-invoice category (key = invoice_number)
    const [categories, setCategories] = useState<Record<string, string>>({});
    
    // new states for inline processing
    const [ignoredItems, setIgnoredItems] = useState<Record<string, boolean>>({});
    const [creatingProduct, setCreatingProduct] = useState<Record<string, boolean>>({});

    // ── Persistence ─────────────────────────────────────────────────────────

    const getMatch = (it: SIIItem) => {
        return catalog[it.code.trim()] || catalog[it.name.trim().toUpperCase()];
    };

    const refreshCatalog = async () => {
        try {
            const catRes = await api.get("/products/");
            const catMap: Record<string, CatalogProduct> = {};
            for (const p of catRes.data) {
                if (p.barcode) catMap[String(p.barcode).trim()] = p;
                if (p.internal_reference) catMap[String(p.internal_reference).trim()] = p;
                if (p.name) catMap[String(p.name).trim().toUpperCase()] = p;
                if (p.suppliers_info) {
                    for (const info of p.suppliers_info) {
                        catMap[String(info.supplier_code).trim()] = p;
                    }
                }
            }
            setCatalog(catMap);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        const stored = sessionStorage.getItem("sii_import_state");
        if (stored) {
            try {
                const data = JSON.parse(stored);
                if (data.parsed) {
                    setParsed(data.parsed);
                    setOpenSuppliers(data.openSuppliers || {});
                    setOpenInvoices(data.openInvoices || {});
                    setImported(data.imported || {});
                    setCategories(data.categories || {});
                    setIgnoredItems(data.ignoredItems || {});
                    refreshCatalog();
                }
            } catch (e) {
                console.error("Failed to parse stored state", e);
            }
        }
    }, []);

    useEffect(() => {
        if (parsed) {
            sessionStorage.setItem("sii_import_state", JSON.stringify({
                parsed,
                openSuppliers,
                openInvoices,
                imported,
                categories,
                ignoredItems,
            }));
        } else {
            sessionStorage.removeItem("sii_import_state");
        }
    }, [parsed, openSuppliers, openInvoices, imported, categories, ignoredItems]);

    // ── File selection ──────────────────────────────────────────────────────

    const handleFile = (f: File) => {
        setFile(f);
        setParsed(null);
        setError(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    };

    const handleParse = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        try {
            // Fetch catalog for matching
            const catRes = await api.get("/products/");
            const catMap: Record<string, CatalogProduct> = {};
            for (const p of catRes.data) {
                if (p.barcode) catMap[String(p.barcode).trim()] = p;
                if (p.internal_reference) catMap[String(p.internal_reference).trim()] = p;
                if (p.name) catMap[String(p.name).trim().toUpperCase()] = p;
                if (p.suppliers_info) {
                    for (const info of p.suppliers_info) {
                        catMap[String(info.supplier_code).trim()] = p;
                    }
                }
            }
            setCatalog(catMap);

            const fd = new FormData();
            fd.append("file", file);
            const res = await api.post("/purchases/upload-sii", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const result = res.data as ParsedResult;
            setParsed(result);
            // expand all suppliers + set default categories
            const open: Record<string, boolean> = {};
            const cats: Record<string, string> = {};
            result.suppliers.forEach((s) => {
                open[s.rut] = true;
                s.invoices.forEach((inv) => {
                    cats[inv.invoice_number] = inv.items.length === 0
                        ? "GASTO_OPERATIVO"
                        : "MERCADERÍA";
                });
            });
            setOpenSuppliers(open);
            setCategories(cats);
        } catch (e: any) {
            setError(e.response?.data?.detail ?? "Error al procesar el archivo");
        } finally {
            setLoading(false);
        }
    };

    // ── Create purchase order per invoice ───────────────────────────────────

    const toggleIgnoreItem = (invKey: string, idx: number) => {
        const pKey = `${invKey}_${idx}`;
        setIgnoredItems(p => ({ ...p, [pKey]: !p[pKey] }));
    };

    const handleCreateProduct = async (it: SIIItem, inv: SIIInvoice, idx: number) => {
        const invKey = inv.invoice_number;
        const pKey = `${invKey}_${idx}`;
        setCreatingProduct(p => ({ ...p, [pKey]: true }));
        try {
            const res = await api.post("/products/", {
                name: it.name,
                barcode: "", // El backend autogenerará "200..."
                supplier_id: inv.supplier_id,
                supplier_code: String(it.code).trim(),
                cost: it.price || 0,
                price: 0,
                uom: "unidades",
                is_variable_consumption: false,
                default_consumption_rate: 1.0,
                min_stock: 5,
            });
            const newProd = res.data;
            setCatalog(prev => {
                const updated = { ...prev };
                if (newProd.barcode) updated[String(newProd.barcode).trim()] = newProd;
                updated[String(it.code).trim()] = newProd; // Mapear temporalmente en el catálogo
                return updated;
            });
        } catch (e: any) {
            alert("Error al crear producto: " + (e.response?.data?.detail ?? e.message));
        } finally {
            setCreatingProduct(p => ({ ...p, [pKey]: false }));
        }
    };

    const handleImportInvoice = async (inv: SIIInvoice) => {
        const key = inv.invoice_number;
        const category = categories[key] ?? "MERCADERÍA";

        setImporting((p) => ({ ...p, [key]: true }));
        try {
            // Build matched items from catalog (barcode = SII code)
            const matchedItems = inv.items
                .filter((it, idx) => {
                    const isIgnored = ignoredItems[`${key}_${idx}`];
                    return !isIgnored && getMatch(it) && it.quantity != null;
                })
                .map((it) => ({
                    product_id: getMatch(it)!.id,
                    quantity: Math.round(it.quantity!),
                    unit_cost: it.price ?? 0,
                }));

            await api.post("/purchases/", {
                supplier_id: inv.supplier_id ?? null,
                invoice_number: inv.invoice_number,
                purchase_category: category,
                notes: buildNotes(inv, matchedItems.length),
                items: matchedItems,
            });
            setImported((p) => ({ ...p, [key]: true }));
            onImported();
        } catch (e: any) {
            alert("Error: " + (e.response?.data?.detail ?? "Error al importar"));
        } finally {
            setImporting((p) => ({ ...p, [key]: false }));
        }
    };

    const handleBulkCategory = (sup: SIISupplier, category: string) => {
        const newCats = { ...categories };
        sup.invoices.forEach(inv => {
            newCats[inv.invoice_number] = category;
        });
        setCategories(newCats);
    };

    const buildNotes = (inv: SIIInvoice, matchedCount: number) => {
        const lines = [
            `IMPORTADO DESDE SII`,
            `Proveedor: ${inv.supplier_name} (RUT ${inv.supplier_rut})`,
            `Fecha: ${inv.date_created ?? "—"}`,
            `Productos vinculados al catálogo: ${matchedCount} de ${inv.items.length}`,
            ``,
            `LÍNEAS DE DETALLE SII:`,
            ...inv.items.map(
                (it, i) => {
                    const isIgnored = ignoredItems[`${inv.invoice_number}_${i}`];
                    const matched = getMatch(it);
                    const matchTag = isIgnored ? `[ignorado]` : (matched ? `[✓ ${matched.name}]` : `[sin match]`);
                    return `${i + 1}. [${it.code}] ${it.name} ${matchTag} | Cant: ${it.quantity} | P.Unit: ${fmt(it.price)} | Dcto: ${it.discount_pct != null ? `${it.discount_pct}%` : "—"} | Total: ${fmt(it.final_price)}`;
                }
            ),
        ];

        if (matchedCount < inv.items.length) {
            lines.push(
                ``,
                `ATENCIÓN: Faltan productos por crear en el inventario.`,
                `Para que el match funcione en el futuro, crea los productos faltantes usando el Código SII como "Código de Barras".`,
                `El costo se actualizará automáticamente al confirmar esta compra. El precio de venta lo defines tú al crear el producto.`
            );
        }

        return lines.join("\n");
    };

    const toggleSupplier = (rut: string) =>
        setOpenSuppliers((p) => ({ ...p, [rut]: !p[rut] }));

    const toggleInvoice = (key: string) =>
        setOpenInvoices((p) => ({ ...p, [key]: !p[key] }));

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-5xl rounded-2xl border border-border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

                {/* Header */}
                <div className="px-8 py-5 border-b border-border flex justify-between items-center bg-gradient-to-r from-primary to-primary/80 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                            <FileSpreadsheet size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Importar desde SII</h2>
                            <p className="text-xs text-white/70">Sube el Excel de factura bruta y genera órdenes de compra por proveedor</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                {/* Stats Summary */}
            {parsed && (
                <div className="px-8 py-3 bg-muted/30 border-b border-border flex items-center gap-6 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Proveedores:</span>
                        <span className="text-sm font-bold">{parsed.suppliers.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Facturas:</span>
                        <span className="text-sm font-bold">
                            {parsed.suppliers.reduce((acc, s) => acc + s.invoices.length, 0)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Monto Total:</span>
                        <span className="text-sm font-bold text-primary">
                            {fmt(parsed.suppliers.reduce((acc, s) => acc + supplierTotal(s), 0))}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <Link2 size={14} className="text-emerald-500" />
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Match Catálogo:</span>
                        <span className="text-sm font-bold text-emerald-600">
                            {parsed.suppliers.reduce((acc, s) => 
                                acc + s.invoices.reduce((acc2, inv) => 
                                    acc2 + inv.items.filter(it => getMatch(it)).length, 0), 0
                            )} ítems
                        </span>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">

                    {/* Drop zone */}
                    {!parsed && (
                        <div
                            className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${dragging
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50 hover:bg-muted/30"
                                }`}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => inputRef.current?.click()}
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                className="hidden"
                                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                            />
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${file ? "bg-primary/20" : "bg-muted"}`}>
                                <FileSpreadsheet size={32} className={file ? "text-primary" : "text-muted-foreground"} />
                            </div>
                            {file ? (
                                <div className="text-center">
                                    <p className="font-bold text-foreground">{file.name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {(file.size / 1024).toFixed(1)} KB — Listo para procesar
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <p className="font-semibold text-foreground">Arrastra el Excel del SII aquí</p>
                                    <p className="text-xs text-muted-foreground mt-1">o haz clic para seleccionar · .xlsx / .xls</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Results */}
                    {parsed && (
                        <div className="space-y-4">
                            {/* Summary bar */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 size={18} className="text-emerald-500" />
                                    <span className="text-sm font-semibold text-foreground">
                                        {parsed.suppliers.length} proveedor{parsed.suppliers.length !== 1 ? "es" : ""} detectado{parsed.suppliers.length !== 1 ? "s" : ""} ·{" "}
                                        {parsed.suppliers.reduce((s, sup) => s + sup.invoices.length, 0)} factura{parsed.suppliers.reduce((s, sup) => s + sup.invoices.length, 0) !== 1 ? "s" : ""}
                                    </span>
                                </div>
                                <button
                                    onClick={() => { setParsed(null); setFile(null); setImported({}); }}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                                >
                                    Subir otro archivo
                                </button>
                            </div>

                            {/* Suppliers */}
                            {parsed.suppliers.map((sup) => (
                                <div key={sup.rut} className="border border-border rounded-2xl overflow-hidden bg-card">

                                    {/* Supplier header */}
                                    <div
                                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                                        onClick={() => toggleSupplier(sup.rut)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                                <Building2 size={16} className="text-primary" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-foreground text-sm">{sup.name}</p>
                                                <p className="text-[11px] text-muted-foreground font-mono">RUT {sup.rut}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 mr-2">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleBulkCategory(sup, "MERCADERÍA"); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-primary text-[10px] font-bold text-primary hover:text-primary-foreground border border-primary/40 rounded-lg transition-colors shadow-sm"
                                                    title="Marcar todas las facturas de este proveedor como Mercancía"
                                                >
                                                    <Package size={12} />
                                                    Todo a Mercancía
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleBulkCategory(sup, "GASTO_OPERATIVO"); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-amber-600 text-[10px] font-bold text-amber-600 hover:text-white border border-amber-500/40 rounded-lg transition-colors shadow-sm"
                                                    title="Marcar todas las facturas de este proveedor como Gasto Operativo"
                                                >
                                                    <Fuel size={12} /> 
                                                    Todo a Gasto Op.
                                                </button>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-muted-foreground">{sup.invoices.length} factura{sup.invoices.length !== 1 ? "s" : ""}</p>
                                                <p className="text-sm font-black text-primary">{fmt(supplierTotal(sup))}</p>
                                            </div>
                                            {openSuppliers[sup.rut]
                                                ? <ChevronDown size={16} className="text-muted-foreground" />
                                                : <ChevronRight size={16} className="text-muted-foreground" />
                                            }
                                        </div>
                                    </div>

                                    {/* Invoices */}
                                    {openSuppliers[sup.rut] && (
                                        <div className="border-t border-border divide-y divide-border/50">
                                            {sup.invoices.map((inv) => {
                                                const invKey = inv.invoice_number;
                                                const invTotal = inv.items.reduce((s, it) => s + (it.final_price ?? 0), 0);
                                                const isOpen = openInvoices[invKey] ?? false;
                                                const isImporting = importing[invKey];
                                                const isImported = imported[invKey];
                                                const isAlreadyImported = inv.already_imported && !isImported;
                                                const matchedCount = inv.items.filter(it => getMatch(it)).length;
                                                const canImport = inv.items.every((it, idx) => getMatch(it) || ignoredItems[`${invKey}_${idx}`]);

                                                return (
                                                    <div key={invKey} className="bg-muted/20">
                                                        {/* Invoice row */}
                                                        <div className="flex items-center justify-between px-5 py-3">
                                                            <button
                                                                className="flex items-center gap-2 text-left flex-1"
                                                                onClick={() => inv.items.length > 0 && toggleInvoice(invKey)}
                                                            >
                                                                {inv.items.length > 0
                                                                    ? isOpen
                                                                        ? <ChevronDown size={13} className="text-muted-foreground shrink-0" />
                                                                        : <ChevronRight size={13} className="text-muted-foreground shrink-0" />
                                                                    : <div className="w-[13px]" />
                                                                }
                                                                <Hash size={12} className="text-muted-foreground shrink-0" />
                                                                <span className="font-mono text-xs font-semibold text-foreground">
                                                                    Folio {inv.invoice_number}
                                                                </span>
                                                                <span className="text-[11px] text-muted-foreground ml-2">
                                                                    {inv.date_created ? new Date(inv.date_created).toLocaleDateString("es-CL") : ""}
                                                                </span>
                                                                {inv.items.length > 0 ? (
                                                                    <span className="text-[11px] text-muted-foreground ml-3">
                                                                        {inv.items.length} línea{inv.items.length !== 1 ? "s" : ""}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[11px] italic text-muted-foreground/70 ml-3">sin detalle</span>
                                                                )}
                                                                {matchedCount > 0 && (
                                                                    <span className="ml-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                                                                        <Link2 size={8} />
                                                                        {matchedCount}/{inv.items.length}
                                                                    </span>
                                                                )}
                                                            </button>

                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="text-sm font-bold text-foreground">{fmt(invTotal)}</span>

                                                                {/* Category selector */}
                                                                <div className="relative group">
                                                                    <select
                                                                        value={categories[invKey] ?? "MERCADERÍA"}
                                                                        onChange={(e) => setCategories(p => ({...p, [invKey]: e.target.value}))}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="appearance-none text-[10px] font-bold rounded-lg border border-border bg-background pl-3 pr-7 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer hover:bg-muted transition-all shadow-sm"
                                                                    >
                                                                        <option value="MERCADERÍA">MERCANCÍA</option>
                                                                        <option value="GASTO_OPERATIVO">GASTO OPERATIVO</option>
                                                                        <option value="MIXTO">MIXTO</option>
                                                                    </select>
                                                                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                                                        <ChevronDown size={10} />
                                                                    </div>
                                                                </div>

                                                                {isAlreadyImported ? (
                                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-bold">
                                                                        <AlertCircle size={12} />
                                                                        Ya importada
                                                                    </div>
                                                                ) : isImported ? (
                                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold">
                                                                        <CheckCircle2 size={12} />
                                                                        Importado
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleImportInvoice(inv)}
                                                                        disabled={isImporting || !canImport}
                                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${canImport ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground border border-border"}`}
                                                                        title={canImport ? "Generar orden" : "Faltan productos por mapear"}
                                                                    >
                                                                        {isImporting ? (
                                                                            <><Loader2 size={12} className="animate-spin" /> Importando...</>
                                                                        ) : inv.items.length === 0 ? (
                                                                            <><ShoppingCart size={12} /> Solo nota</>
                                                                        ) : (
                                                                            <><ShoppingCart size={12} /> Crear Orden</>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Items table */}
                                                        {isOpen && inv.items.length > 0 && (
                                                            <div className="px-5 pb-4">
                                                                <div className="border border-border rounded-xl overflow-hidden">
                                                                    <table className="w-full text-xs">
                                                                        <thead>
                                                                            <tr className="border-b border-border bg-muted/50">
                                                                                <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase">
                                                                                    <div className="flex items-center gap-1"><Tag size={10} />Código</div>
                                                                                </th>
                                                                                <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase">
                                                                                    <div className="flex items-center gap-1"><Package size={10} />Descripción</div>
                                                                                </th>
                                                                                <th className="px-3 py-2 text-center text-[10px] font-bold text-muted-foreground uppercase">Cant.</th>
                                                                                <th className="px-3 py-2 text-right text-[10px] font-bold text-muted-foreground uppercase">
                                                                                    <div className="flex items-center justify-end gap-1"><DollarSign size={10} />Precio</div>
                                                                                </th>
                                                                                <th className="px-3 py-2 text-right text-[10px] font-bold text-muted-foreground uppercase">
                                                                                    <div className="flex items-center justify-end gap-1"><Percent size={10} />Dcto %</div>
                                                                                </th>
                                                                                <th className="px-3 py-2 text-right text-[10px] font-bold text-muted-foreground uppercase">Total Ítem</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {inv.items.map((item, i) => {
                                                                                const isIgnored = ignoredItems[`${invKey}_${i}`];
                                                                                const isCreating = creatingProduct[`${invKey}_${i}`];
                                                                                const matched = getMatch(item);
                                                                                return (
                                                                                    <tr key={i} className={`border-b border-border/50 last:border-b-0 hover:bg-muted/20 ${isIgnored ? 'opacity-50' : ''}`}>
                                                                                        <td className="px-3 py-2 font-mono text-[11px] text-primary font-semibold">
                                                                                            {item.code}
                                                                                        </td>
                                                                                        <td className="px-3 py-2 text-foreground max-w-[220px]">
                                                                                            <div className="truncate" title={item.name}>{item.name}</div>
                                                                                            {isIgnored ? (
                                                                                                <div className="flex items-center gap-1 mt-1">
                                                                                                    <span className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground border border-border rounded-full font-semibold">Ignorado</span>
                                                                                                    <button onClick={(e) => { e.stopPropagation(); toggleIgnoreItem(invKey, i); }} className="text-[10px] text-primary hover:underline ml-1">Deshacer</button>
                                                                                                </div>
                                                                                            ) : matched ? (
                                                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                                                    <Link2 size={9} className="text-emerald-500" />
                                                                                                    <span className="text-[10px] text-emerald-600 font-semibold truncate">{matched.name}</span>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <div className="flex items-center gap-2 mt-1.5">
                                                                                                    <button onClick={(e) => { e.stopPropagation(); handleCreateProduct(item, inv, i); }} disabled={isCreating} className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                                                                                                        {isCreating ? "Creando..." : "+ Crear Base"}
                                                                                                    </button>
                                                                                                    <button onClick={(e) => { e.stopPropagation(); toggleIgnoreItem(invKey, i); }} className="text-[10px] bg-muted border border-border text-foreground px-2 py-1 rounded shadow-sm hover:bg-muted/80 transition-colors">
                                                                                                        Ignorar
                                                                                                    </button>
                                                                                                </div>
                                                                                            )}
                                                                                        </td>
                                                                                        <td className="px-3 py-2 text-center font-semibold">{item.quantity ?? "—"}</td>
                                                                                        <td className="px-3 py-2 text-right text-muted-foreground">{fmt(item.price)}</td>
                                                                                        <td className="px-3 py-2 text-right">
                                                                                            {item.discount_pct != null
                                                                                                ? <span className="text-amber-600 font-semibold">{item.discount_pct}%</span>
                                                                                                : <span className="text-muted-foreground">—</span>
                                                                                            }
                                                                                        </td>
                                                                                        <td className="px-3 py-2 text-right font-bold text-foreground">{fmt(item.final_price)}</td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                        <tfoot>
                                                                            <tr className="border-t border-border bg-muted/30">
                                                                                <td colSpan={5} className="px-3 py-2 text-right text-[10px] font-bold text-muted-foreground uppercase">
                                                                                    Total Factura
                                                                                </td>
                                                                                <td className="px-3 py-2 text-right font-black text-primary">
                                                                                    {fmt(invTotal)}
                                                                                </td>
                                                                            </tr>
                                                                        </tfoot>
                                                                    </table>
                                                                </div>

                                                                {inv.items.length === 0 && (
                                                                    <p className="text-xs text-muted-foreground italic py-2 px-3">
                                                                        Esta factura no tiene líneas de detalle (ej. servicios o cargo exento).
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-4 border-t border-border bg-muted/20 flex justify-between items-center shrink-0">
                    <div className="space-y-0.5">
                        <p className="text-[11px] text-muted-foreground italic max-w-md">
                            * Las órdenes se crean en estado <strong>Borrador</strong>. Los ítems con código vinculado al catálogo se importan automáticamente.
                        </p>
                        {parsed && Object.keys(catalog).length > 0 && (
                            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                <Link2 size={10} /> Catálogo cargado — {Object.keys(catalog).length} productos con código de barra disponibles para match
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 text-sm font-semibold rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors"
                        >
                            Cerrar
                        </button>
                        {file && !parsed && (
                            <button
                                onClick={handleParse}
                                disabled={loading}
                                className="px-6 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? (
                                    <><Loader2 size={14} className="animate-spin" /> Procesando...</>
                                ) : (
                                    <><Upload size={14} /> Procesar Excel</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
