"use client";

import React, { useEffect, useState } from "react";
import { Plus, ShoppingCart, X, FileSpreadsheet, CheckCircle2, XCircle, FileEdit, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { SIIImportModal } from "@/components/compras/sii-import-modal";

interface Supplier {
    id: string;
    name: string;
    tax_id?: string;
}

interface Product {
    id: string;
    name: string;
    barcode: string;
    cost: number;
    stock_quantity: number;
    total_stock?: number;
    uom?: string;
}

interface PurchaseItem {
    product_id: string;
    quantity: number;
    unit_cost: number;
}

interface PurchaseItemResponse extends PurchaseItem {
    id: string;
    subtotal: number;
}

interface Purchase {
    id: string;
    date_created: string;
    supplier_id?: string;
    invoice_number?: string;
    subtotal_net: number;
    tax_amount: number;
    total_cost: number;
    state: "DRAFT" | "CONFIRMED" | "CANCELLED";
    notes?: string;
    items: PurchaseItemResponse[];
}

export function PurchasesList() {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [showSIIImport, setShowSIIImport] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
    const [filterState, setFilterState] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);

    const [formData, setFormData] = useState({
        supplier_id: "",
        invoice_number: "",
        notes: "",
    });

    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [newItem, setNewItem] = useState({
        product_id: "",
        quantity: "",
        unit_cost: "",
    });

    useEffect(() => {
        fetchPurchases();
        fetchSuppliers();
        fetchProducts();
    }, [filterState]);

    const fetchPurchases = async () => {
        try {
            const params = filterState ? { state: filterState } : {};
            const res = await api.get("/purchases/", { params });
            setPurchases(res.data);
        } catch (e) {
            console.error("Error fetching purchases", e);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const res = await api.get("/suppliers/");
            setSuppliers(res.data);
        } catch (e) {
            console.error("Error fetching suppliers", e);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await api.get("/products/");
            setProducts(res.data);
        } catch (e) {
            console.error("Error fetching products", e);
        }
    };

    const addItem = () => {
        if (!newItem.product_id || !newItem.quantity || !newItem.unit_cost) {
            alert("Completa todos los campos del producto");
            return;
        }
        setItems([
            ...items,
            {
                product_id: newItem.product_id,
                quantity: parseFloat(newItem.quantity),
                unit_cost: parseFloat(newItem.unit_cost),
            },
        ]);
        setNewItem({ product_id: "", quantity: "", unit_cost: "" });
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotals = () => {
        // En este sistema, el costo unitario ingresado YA incluye IVA (Costo Bruto)
        const total = items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
        const tax = total * 0.19;
        const net = total - tax;
        return { net, tax, total };
    };

    const handleCreatePurchase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) {
            alert("Agrega al menos un producto");
            return;
        }
        try {
            const res = await api.post("/purchases/", {
                supplier_id: formData.supplier_id ? formData.supplier_id : null,
                invoice_number: formData.invoice_number || null,
                notes: formData.notes || null,
                items,
            });
            alert(`Compra #${res.data.id} creada en BORRADOR`);
            resetForm();
            fetchPurchases();
        } catch (error: any) {
            alert("Error: " + (error.response?.data?.detail || "Error al crear compra"));
        }
    };

    const confirmPurchase = async (id: string) => {
        setIsProcessing(true);
        try {
            await api.post(`/purchases/${id}/confirm`);
            alert("Compra confirmada correctamente. El stock ha sido actualizado.");
            await fetchPurchases();
            await fetchProducts();
            setSelectedPurchase(null);
        } catch (error: any) {
            const errorMsg = error.response?.data?.detail || error.message || "Error desconocido";
            alert("Error al confirmar: " + errorMsg);
        } finally {
            setIsProcessing(false);
        }
    };

    const cancelPurchase = async (id: string) => {
        if (!confirm("¿Cancelar esta compra?")) return;
        try {
            await api.post(`/purchases/${id}/cancel`);
            alert("Compra cancelada");
            fetchPurchases();
            setSelectedPurchase(null);
        } catch (error: any) {
            alert("Error: " + (error.response?.data?.detail || "Error al cancelar"));
        }
    };

    const resetForm = () => {
        setFormData({ supplier_id: "", invoice_number: "", notes: "" });
        setItems([]);
        setNewItem({ product_id: "", quantity: "", unit_cost: "" });
        setIsCreating(false);
    };

    const getProductName = (id: string) =>
        products.find((p) => p.id === id)?.name || `Producto #${id}`;

    const getSupplierName = (id?: string) => {
        if (!id) return "Sin proveedor";
        return suppliers.find((s) => s.id === id)?.name || `Proveedor #${id}`;
    };

    const stateBadge = (state: string) => {
        const map: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
            DRAFT: { cls: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Borrador", icon: <FileEdit size={12} className="mr-1" /> },
            CONFIRMED: { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Confirmado", icon: <CheckCircle2 size={12} className="mr-1" /> },
            CANCELLED: { cls: "bg-red-100 text-red-700 border-red-200", label: "Cancelado", icon: <XCircle size={12} className="mr-1" /> },
        };
        const s = map[state] || map.DRAFT;
        return (
            <span className={`px-2.5 py-1 flex items-center rounded-full text-[11px] font-semibold border ${s.cls}`}>
                {s.icon} {s.label}
            </span>
        );
    };

    const filterTabs = [
        { id: "", label: "Todas" },
        { id: "DRAFT", label: "Borradores" },
        { id: "CONFIRMED", label: "Confirmadas" },
        { id: "CANCELLED", label: "Canceladas" },
    ];

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                <div>
                    <h2 className="text-lg font-bold text-foreground">Órdenes de Compra</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Gestión de abastecimiento y relación con proveedores.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowSIIImport(true)}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors"
                    >
                        <FileSpreadsheet size={16} className="text-primary" />
                        <span>Importar SII</span>
                    </button>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                    >
                        <Plus size={16} />
                        <span>Nueva Orden</span>
                    </button>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit border border-border">
                {filterTabs.map((tab) => (
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

            {/* Table */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="table-header">Referencia</th>
                                <th className="table-header">Proveedor</th>
                                <th className="table-header">Emisión</th>
                                <th className="table-header">Responsable</th>
                                <th className="table-header text-right">Total</th>
                                <th className="table-header text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchases.map((p) => (
                                <tr
                                    key={p.id}
                                    className="group cursor-pointer border-b border-border/50 last:border-b-0 hover:bg-muted/40 transition-colors"
                                    onClick={() => setSelectedPurchase(p)}
                                >
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-primary text-sm">
                                            PO-{p.id.toString().padStart(4, "0")}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                            {p.invoice_number ? `DOC: ${p.invoice_number}` : "S/D"}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 font-medium text-foreground text-sm">
                                        {getSupplierName(p.supplier_id)}
                                    </td>
                                    <td className="px-5 py-4 text-sm text-muted-foreground">
                                        {new Date(p.date_created).toLocaleDateString()}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                                AD
                                            </div>
                                            <span className="text-xs text-muted-foreground">Admin</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-right font-bold text-foreground text-sm">
                                        ${p.total_cost.toLocaleString()}
                                    </td>
                                    <td className="px-5 py-4 text-center">{stateBadge(p.state)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {purchases.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                        <ShoppingCart size={56} strokeWidth={1} className="mb-4 opacity-40" />
                        <p className="text-lg font-medium">No hay registros de compra</p>
                        <p className="text-sm mt-1 opacity-70">Cree una nueva orden para comenzar</p>
                    </div>
                )}
            </div>

            {/* ===== SII Import Modal ===== */}
            {showSIIImport && (
                <SIIImportModal
                    onClose={() => setShowSIIImport(false)}
                    onImported={() => { fetchPurchases(); }}
                />
            )}

            {/* ===== Create Modal ===== */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-5xl rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Header */}
                        <div className="px-8 py-5 border-b border-border flex justify-between items-center bg-primary rounded-t-2xl">
                            <div>
                                <h2 className="text-lg font-bold text-primary-foreground">Nueva Orden de Compra</h2>
                                <p className="text-xs text-primary-foreground/70">Registre el ingreso de mercadería.</p>
                            </div>
                            <button
                                onClick={resetForm}
                                className="p-2 rounded-lg text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePurchase} className="p-8 flex flex-col flex-1 overflow-hidden gap-8">
                            {/* Info fields */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2">
                                            Proveedor
                                        </label>
                                        <select
                                            className="form-input"
                                            value={formData.supplier_id}
                                            onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                                        >
                                            <option value="">Seleccionar proveedor...</option>
                                            {suppliers.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2">
                                            N° Factura / Guía
                                        </label>
                                        <input
                                            className="form-input font-mono"
                                            placeholder="Ej: FAC-1001"
                                            value={formData.invoice_number}
                                            onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2">
                                        Notas / Observaciones
                                    </label>
                                    <textarea
                                        className="form-input h-28 resize-none"
                                        placeholder="Detalles sobre el envío, condiciones de pago..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Add product row */}
                            <div className="flex-1 flex flex-col min-h-0">
                                <h3 className="text-[11px] font-bold text-muted-foreground uppercase mb-3">
                                    Añadir Productos
                                </h3>
                                <div className="grid grid-cols-12 gap-3 mb-4 p-4 bg-muted/50 rounded-xl border border-border shrink-0">
                                    <div className="col-span-5">
                                        <select
                                            className="form-input"
                                            value={newItem.product_id}
                                            onChange={(e) => {
                                                const product = products.find((p) => p.id === e.target.value);
                                                setNewItem({
                                                    ...newItem,
                                                    product_id: e.target.value,
                                                    unit_cost: product ? product.cost.toString() : "",
                                                });
                                            }}
                                        >
                                            <option value="">Buscar producto...</option>
                                            {products
                                              .filter((p: any) => p.product_type !== "SERVICE")
                                              .map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} ({p.barcode})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2 relative">
                                        <input
                                            type="number"
                                            className="form-input text-center"
                                            placeholder="Cant."
                                            step="any"
                                            min="0"
                                            value={newItem.quantity}
                                            onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                                        />
                                        {newItem.product_id && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                                {products.find(p => p.id === newItem.product_id)?.uom === 'unidades' ? 'u' : products.find(p => p.id === newItem.product_id)?.uom || ''}
                                            </span>
                                        )}
                                    </div>
                                    <div className="col-span-3">
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                            <input
                                                type="number"
                                                className="form-input pl-8 text-right"
                                                placeholder="Costo"
                                                value={newItem.unit_cost}
                                                onChange={(e) => setNewItem({ ...newItem, unit_cost: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <button
                                            type="button"
                                            onClick={addItem}
                                            className="w-full px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                        >
                                            Añadir
                                        </button>
                                    </div>
                                </div>

                                {/* Items list */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar border border-border rounded-xl mb-4">
                                    <table className="w-full">
                                        <thead className="sticky top-0 z-10">
                                            <tr className="border-b border-border">
                                                <th className="table-header">Producto</th>
                                                <th className="table-header text-center">Cant.</th>
                                                <th className="table-header text-right">Costo Unit.</th>
                                                <th className="table-header text-right">Subtotal</th>
                                                <th className="table-header w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, index) => (
                                                <tr key={index} className="border-b border-border/50 last:border-b-0">
                                                    <td className="px-5 py-3 font-medium text-foreground text-sm">
                                                        {getProductName(item.product_id)}
                                                    </td>
                                                    <td className="px-5 py-3 text-center text-sm">
                                                        {item.quantity} <span className="text-[10px] text-muted-foreground uppercase">{products.find(p => p.id === item.product_id)?.uom === 'unidades' ? 'u' : products.find(p => p.id === item.product_id)?.uom || ''}</span>
                                                    </td>
                                                    <td className="px-5 py-3 text-right text-sm">${item.unit_cost.toLocaleString()}</td>
                                                    <td className="px-5 py-3 text-right font-bold text-foreground text-sm">
                                                        ${(item.quantity * item.unit_cost).toLocaleString()}
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(index)}
                                                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {items.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="py-12 text-center text-muted-foreground text-xs italic">
                                                        No se han añadido productos a la orden.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Totals */}
                                <div className="flex flex-col md:flex-row justify-between items-end gap-6 shrink-0 pt-4 border-t border-border">
                                    <p className="text-[11px] text-muted-foreground italic max-w-sm">
                                        * El stock se actualizará automáticamente tras la confirmación.
                                    </p>
                                    <div className="w-64 space-y-2">
                                        <div className="flex justify-between text-xs text-muted-foreground font-semibold uppercase">
                                            <span>Subtotal</span>
                                            <span>${calculateTotals().net.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span className="font-semibold uppercase">IVA (19%)</span>
                                            <span>${calculateTotals().tax.toLocaleString()}</span>
                                        </div>
                                        <div className="h-px bg-border my-2" />
                                        <div className="flex justify-between items-center text-primary">
                                            <span className="text-xs font-bold uppercase">Total</span>
                                            <span className="text-2xl font-black">${calculateTotals().total.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-6 py-2.5 text-sm font-semibold rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={items.length === 0}
                                    className="px-8 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Registrar Orden
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== Detail Modal ===== */}
            {selectedPurchase && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-4xl rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="px-8 py-5 border-b border-border flex justify-between items-start bg-primary rounded-t-2xl">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-lg font-bold text-primary-foreground">
                                        Orden PO-{selectedPurchase.id.toString().padStart(4, "0")}
                                    </h2>
                                    {stateBadge(selectedPurchase.state)}
                                </div>
                                <p className="text-xs text-primary-foreground/70">
                                    {getSupplierName(selectedPurchase.supplier_id)} ·{" "}
                                    {new Date(selectedPurchase.date_created).toLocaleDateString()}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedPurchase(null)}
                                className="p-2 rounded-lg text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto max-h-[70vh]">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Items table */}
                                <div className="md:col-span-2">
                                    <h3 className="text-[11px] font-bold text-muted-foreground uppercase mb-3">
                                        Detalle de Mercadería
                                    </h3>
                                    <div className="border border-border rounded-xl overflow-hidden">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-border">
                                                    <th className="table-header">Descripción</th>
                                                    <th className="table-header text-center">Uds</th>
                                                    <th className="table-header text-right">Unitario</th>
                                                    <th className="table-header text-right">Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedPurchase.items.map((item) => (
                                                    <tr key={item.id} className="border-b border-border/50 last:border-b-0">
                                                        <td className="px-5 py-3 font-medium text-foreground text-sm">
                                                            {getProductName(item.product_id)}
                                                        </td>
                                                        <td className="px-5 py-3 text-center text-sm">
                                                            {item.quantity} <span className="text-[10px] text-muted-foreground uppercase">{products.find(p => p.id === item.product_id)?.uom === 'unidades' ? 'u' : products.find(p => p.id === item.product_id)?.uom || ''}</span>
                                                        </td>
                                                        <td className="px-5 py-3 text-right text-sm text-muted-foreground">
                                                            ${item.unit_cost.toLocaleString()}
                                                        </td>
                                                        <td className="px-5 py-3 text-right font-bold text-foreground text-sm">
                                                            ${item.subtotal.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Fiscal info */}
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-[11px] font-bold text-muted-foreground uppercase mb-3">
                                            Información Fiscal
                                        </h3>
                                        <div className="bg-muted/50 p-4 rounded-xl space-y-3 border border-border">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Documento:</span>
                                                <span className="font-semibold text-foreground">
                                                    {selectedPurchase.invoice_number || "S/D"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Neto:</span>
                                                <span className="font-medium">${selectedPurchase.subtotal_net?.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">IVA (19%):</span>
                                                <span className="font-medium">${selectedPurchase.tax_amount?.toLocaleString()}</span>
                                            </div>
                                            <div className="h-px bg-border my-1" />
                                            <div className="flex justify-between items-center text-primary">
                                                <span className="text-xs font-bold uppercase">Total</span>
                                                <span className="text-xl font-black">${selectedPurchase.total_cost.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Full width notes / SII detail below the grid */}
                            {selectedPurchase.notes && (
                                <div className="mt-8 pt-6 border-t border-border border-dashed">
                                    {(() => {
                                        const raw = selectedPurchase.notes as string
                                        const isSii = raw.includes("IMPORTADO DESDE SII")

                                        if (!isSii) {
                                            // Nota simple
                                            return (
                                                <div>
                                                    <h3 className="text-[11px] font-bold text-muted-foreground uppercase mb-2">Comentarios</h3>
                                                    <p className="text-xs text-foreground bg-accent p-4 rounded-xl border border-border italic leading-relaxed whitespace-pre-wrap">
                                                        {raw}
                                                    </p>
                                                </div>
                                            )
                                        }

                                        // Parsear bloques SII
                                        const lines = raw.split("\n")
                                        const headerLines: string[] = []
                                        const detailLines: string[] = []
                                        const footerLines: string[] = []
                                        let inDetail = false
                                        let inFooter = false
                                        for (const l of lines) {
                                            if (l.startsWith("LÍNEAS DE DETALLE")) { inDetail = true; continue }
                                            if (l.includes("ATENCIÓN:") || inFooter) { inFooter = true; footerLines.push(l); continue }
                                            if (inDetail) detailLines.push(l)
                                            else if (l.trim()) headerLines.push(l)
                                        }

                                        // Parse each detail line
                                        const parsedItems = detailLines.filter(Boolean).map(l => {
                                            const numMatch = l.match(/^(\d+)\.\s/)
                                            const codeMatch = l.match(/\[([^\]]+)\]/)
                                            const matchMatch = l.match(new RegExp("\\[✓ ([^\\]]+)\\]|\\[sin match\\]|\\[ignorado\\]"))
                                            const cantMatch = l.match(/Cant:\s*([\d.]+)/)
                                            const punitMatch = l.match(/P\.Unit:\s*\$?([\d.,]+)/)
                                            const totalMatch = l.match(/Total:\s*\$?([\d.,]+)/)
                                            const isMatched = l.includes("[✓")
                                            const isIgnored = l.includes("[ignorado]")
                                            const matchedName = isMatched ? (matchMatch?.[1] ?? "") : null
                                            const nameMatch = l.match(new RegExp("\\]\\s+(.+?)\\s+\\["))
                                            return {
                                                num: numMatch?.[1] ?? "",
                                                code: codeMatch?.[1] ?? "",
                                                name: nameMatch?.[1] ?? "",
                                                matched: isMatched,
                                                ignored: isIgnored,
                                                matchedName,
                                                cant: cantMatch?.[1] ?? "—",
                                                punit: punitMatch?.[1] ?? "—",
                                                total: totalMatch?.[1] ?? "—",
                                            }
                                        })

                                        const matchCount = parsedItems.filter(i => i.matched).length
                                        const ignoredCount = parsedItems.filter(i => i.ignored).length
                                        const sinMatchCount = parsedItems.length - matchCount - ignoredCount

                                        return (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-[11px] font-bold text-muted-foreground uppercase">Detalle SII Importado</h3>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
                                                            {matchCount} con match
                                                        </span>
                                                        {ignoredCount > 0 && (
                                                            <span className="text-[10px] bg-muted text-muted-foreground border border-border px-2.5 py-1 rounded-full font-semibold">
                                                                {ignoredCount} ignorados
                                                            </span>
                                                        )}
                                                        {sinMatchCount > 0 && (
                                                            <span className="text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full font-semibold">
                                                                {sinMatchCount} sin match
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Header info pills */}
                                                <div className="flex flex-wrap gap-2">
                                                    {headerLines.map((l, i) => (
                                                        <span key={i} className="text-[10px] bg-muted border border-border px-2 py-1 rounded-lg text-muted-foreground">
                                                            {l}
                                                        </span>
                                                    ))}
                                                </div>

                                                {/* Items table */}
                                                <div className="rounded-xl border border-border overflow-hidden bg-background">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-xs">
                                                            <thead>
                                                                <tr className="bg-muted/60 border-b border-border">
                                                                    <th className="px-3 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase w-8">#</th>
                                                                    <th className="px-3 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase">Código</th>
                                                                    <th className="px-3 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase">Descripción</th>
                                                                    <th className="px-3 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase">Estado Match</th>
                                                                    <th className="px-3 py-2.5 text-center text-[10px] font-bold text-muted-foreground uppercase">Cant</th>
                                                                    <th className="px-3 py-2.5 text-right text-[10px] font-bold text-muted-foreground uppercase">P.Unit</th>
                                                                    <th className="px-3 py-2.5 text-right text-[10px] font-bold text-muted-foreground uppercase">Total</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {parsedItems.map((item, i) => (
                                                                    <tr key={i} className={`border-b border-border/50 last:border-0 ${item.matched ? "" : "bg-orange-50/50"}`}>
                                                                        <td className="px-3 py-2.5 text-muted-foreground font-mono">{item.num}</td>
                                                                        <td className="px-3 py-2.5 font-mono text-[10.5px] text-muted-foreground">{item.code}</td>
                                                                        <td className="px-3 py-2.5 font-medium max-w-[200px] truncate" title={item.name}>{item.name}</td>
                                                                        <td className="px-3 py-2.5">
                                                                            {item.matched
                                                                                ? <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md font-semibold">✓ {item.matchedName}</span>
                                                                                : item.ignored
                                                                                    ? <span className="inline-flex text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md border border-border font-semibold">Ignorado</span>
                                                                                    : <span className="inline-flex text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md font-semibold">Sin match</span>
                                                                            }
                                                                        </td>
                                                                        <td className="px-3 py-2.5 text-center font-medium">{item.cant}</td>
                                                                        <td className="px-3 py-2.5 text-right text-muted-foreground font-mono">${item.punit}</td>
                                                                        <td className="px-3 py-2.5 text-right font-bold font-mono">${item.total}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                                {/* Footer warning if any */}
                                                {footerLines.filter(Boolean).length > 0 && (
                                                    <div className="text-[11px] bg-orange-50 border border-orange-200 text-orange-700 rounded-xl p-3 leading-relaxed mt-2 flex items-start gap-2">
                                                        <AlertTriangle size={16} className="mt-0.5 text-orange-600 shrink-0" />
                                                        <p>{footerLines.join(" ")}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })()}
                                </div>
                            )}
                        </div>

                        {/* Footer actions */}
                        <div className="px-8 py-5 bg-muted/30 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="text-[10px] text-muted-foreground font-semibold uppercase flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                                Auditoría: Sistema de Control
                            </div>
                            <div className="flex gap-3">
                                {selectedPurchase.state === "DRAFT" && (
                                    <>
                                        <button
                                            onClick={() => cancelPurchase(selectedPurchase.id)}
                                            className="px-6 py-2.5 text-sm font-semibold rounded-xl border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                        >
                                            Anular Orden
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                confirmPurchase(selectedPurchase.id);
                                            }}
                                            disabled={isProcessing}
                                            className="px-8 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                                        >
                                            {isProcessing ? "Procesando..." : "Confirmar Recepción"}
                                        </button>
                                    </>
                                )}
                                {selectedPurchase.state === "CONFIRMED" && (
                                    <div className="bg-emerald-100 text-emerald-700 px-6 py-2 rounded-xl border border-emerald-200 text-xs font-bold uppercase flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        Mercadería Recibida · Stock Cargado
                                    </div>
                                )}
                                {selectedPurchase.state === "CANCELLED" && (
                                    <div className="bg-red-100 text-red-700 px-6 py-2 rounded-xl border border-red-200 text-xs font-bold uppercase">
                                        Operación Cancelada
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
