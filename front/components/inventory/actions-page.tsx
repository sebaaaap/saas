"use client";

import React, { useEffect, useState } from "react";
import {
    Package,
    RefreshCcw,
    CheckCircle2,
    Info,
    MapPin,
    Plus,
    Trash2,
    Tag,
    FolderTree,
    Settings2,
    ArrowRightLeft,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiService } from "@/services/apiService";
import api from "@/lib/api";
import { BranchTransferModal } from "./branch-transfer-modal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface ProductLocationDetail {
    id: string; // ID de la instancia de producto en esa ubicación
    location_id: string;
    location_path: string;
    stock: number;
}

interface Product {
    id: string;
    name: string;
    barcode: string;
    total_stock: number;
    uom: string;
    locations: ProductLocationDetail[];
}

interface FlatLocation {
    id: string;
    path: string;
    allows_multiple_products: boolean;
}

interface Category {
    id: string;
    name: string;
    color?: string;
    full_path?: string;
}

const flattenLocations = (nodes: any[], list: FlatLocation[] = []): FlatLocation[] => {
    nodes.forEach((n) => {
        list.push({
            id: n.id,
            path: n.path,
            allows_multiple_products: !!n.allows_multiple_products
        });
        if (n.children) flattenLocations(n.children, list);
    });
    return list;
};

// Mapa de Ocupación: location_id -> { producto, barcode }
type OccupancyMap = Record<string, { name: string; barcode: string }>;

function OperationsTab() {
    const [products, setProducts] = useState<Product[]>([]);
    const [locations, setLocations] = useState<FlatLocation[]>([]);
    const [occupancyMap, setOccupancyMap] = useState<OccupancyMap>({});

    // Selección
    const [selectedParentProduct, setSelectedParentProduct] = useState<Product | null>(null);
    const [selectedSourceInstanceId, setSelectedSourceInstanceId] = useState<string>("");

    // Formulario
    const [quantity, setQuantity] = useState("");
    const [operationType, setOperationType] = useState("INTERNAL_TRANSFER"); // Default a interno
    const [reason, setReason] = useState("");
    const [toLocationId, setToLocationId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

    useEffect(() => {
        fetchProducts();
        fetchLocations();
    }, []);

    // Actualizar mapa de ocupación cuando cambian los productos
    useEffect(() => {
        const newMap: OccupancyMap = {};
        products.forEach(p => {
            if (p.locations) {
                p.locations.forEach(loc => {
                    newMap[loc.location_id] = {
                        name: p.name,
                        barcode: p.barcode
                    };
                });
            }
        });
        setOccupancyMap(newMap);
    }, [products]);

    const fetchProducts = async () => {
        try {
            const data = await apiService.getProducts();
            setProducts(data as any);
        } catch { }
    };

    const fetchLocations = async () => {
        try {
            const res = await api.get('/locations/tree');
            setLocations(flattenLocations(res.data));
        } catch { }
    };

    const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const prodId = e.target.value;
        const prod = products.find(p => p.id === prodId) || null;
        setSelectedParentProduct(prod);

        // Reset source selection
        setSelectedSourceInstanceId("");

        // Auto-select source if only one location
        if (prod && prod.locations && prod.locations.length === 1) {
            setSelectedSourceInstanceId(prod.locations[0].id.toString());
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Validación
        if (!selectedSourceInstanceId || !quantity) return;

        // Si es traslado, validar destino
        if (operationType === "INTERNAL_TRANSFER" && !toLocationId) {
            alert("Debe seleccionar una ubicación de destino");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/inventory/adjustments', {
                type: operationType,
                reason: reason || "Operación manual de inventario",
                to_location_id: operationType === "INTERNAL_TRANSFER" ? toLocationId : null,
                items: [
                    {
                        product_id: selectedSourceInstanceId,
                        quantity: parseFloat(quantity),
                    },
                ],
            });
            setQuantity("");
            setReason("");
            setToLocationId("");
            fetchProducts();
            alert("Operación realizada con éxito");
        } catch (e: any) {
            alert(`Error: ${e.response?.data?.detail || "Error en la operación"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const operationTypes = [
        { value: "INTERNAL_TRANSFER", label: "Movimiento Interno (Traslado)" },
        { value: "OUT_WASTE", label: "Baja por Merma" },
        { value: "IN_ADJUSTMENT", label: "Ajuste de Entrada (Sobra)" },
        { value: "OUT_ADJUSTMENT", label: "Ajuste de Salida (Falta)" },
    ];

    // Helper para obtener el stock disponible en la ubicación seleccionada
    const getSelectedSourceStock = () => {
        if (!selectedParentProduct || !selectedSourceInstanceId) return 0;
        const loc = selectedParentProduct.locations.find(l => l.id.toString() === selectedSourceInstanceId);
        return loc ? loc.stock : 0;
    };

    return (
        <div className="flex flex-col items-center">
            <div className="w-full max-w-4xl space-y-8">
                <div className="text-center flex flex-col items-center gap-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 text-primary rounded-full border border-primary/10 font-bold text-[10px] uppercase tracking-widest">
                        Centro de Control Logístico
                    </div>
                    
                    <button
                        onClick={() => setIsTransferModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all font-bold text-xs uppercase tracking-wider"
                    >
                        <ArrowRightLeft size={16} />
                        Traslado entre Sucursales
                    </button>
                </div>

                <BranchTransferModal 
                    isOpen={isTransferModalOpen} 
                    onClose={() => setIsTransferModalOpen(false)} 
                    onSuccess={fetchProducts}
                />

                <form
                    onSubmit={handleSubmit}
                    className="bg-card rounded-2xl border border-border shadow-sm p-8 md:p-10 space-y-8"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1. Selección de Producto */}
                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                                Selección de Producto
                            </label>
                            <div className="relative">
                                <Package
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    size={16}
                                />
                                <select
                                    className="form-input pl-10"
                                    value={selectedParentProduct?.id || ""}
                                    onChange={handleProductChange}
                                    required
                                >
                                    <option value="">Buscar producto...</option>
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} (Total: {p.total_stock} {p.uom})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* 2. Tipo de Operación */}
                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                                Naturaleza del Ajuste
                            </label>
                            <div className="relative">
                                <RefreshCcw
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    size={16}
                                />
                                <select
                                    className="form-input pl-10"
                                    value={operationType}
                                    onChange={(e) => setOperationType(e.target.value)}
                                >
                                    {operationTypes.map((op) => (
                                        <option key={op.value} value={op.value}>
                                            {op.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 3. Selección de Origen (Si aplica) */}
                    {selectedParentProduct && (
                        <div className="p-6 bg-muted/30 border border-border rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-foreground uppercase tracking-widest">
                                        Ubicación de Origen (Donde está el stock)
                                    </label>
                                    <select
                                        className="form-input"
                                        value={selectedSourceInstanceId}
                                        onChange={(e) => setSelectedSourceInstanceId(e.target.value)}
                                        required
                                    >
                                        <option value="">Seleccione origen...</option>
                                        {selectedParentProduct.locations.map((loc) => (
                                            <option key={loc.id} value={loc.id}>
                                                {loc.location_path} (Stock: {loc.stock})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-baseline mb-2">
                                        <label className="block text-[11px] font-bold text-foreground uppercase tracking-widest">
                                            Cantidad a Mover
                                        </label>
                                        <span className="text-[10px] font-medium text-muted-foreground">
                                            Max: {getSelectedSourceStock()}
                                        </span>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        max={getSelectedSourceStock()}
                                        min="0.01"
                                        className="form-input text-lg font-bold"
                                        placeholder="0.00"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. Selección de Destino (Solo Traslados) */}
                    {operationType === "INTERNAL_TRANSFER" && selectedParentProduct && (
                        <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl animate-in zoom-in-95 duration-200">
                            <label className="block text-[11px] font-bold text-primary uppercase tracking-widest mb-3">
                                Zona Logística de Destino
                            </label>
                            <div className="relative">
                                <MapPin
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-primary"
                                    size={16}
                                />
                                <select
                                    className="form-input pl-10"
                                    value={toLocationId}
                                    onChange={(e) => setToLocationId(e.target.value)}
                                    required={operationType === "INTERNAL_TRANSFER"}
                                >
                                    <option value="">Seleccione ubicación receptora...</option>
                                    {locations.map((loc) => {
                                        const occupancy = occupancyMap[loc.id];
                                        const isMyProduct = occupancy && occupancy.barcode === selectedParentProduct.barcode;
                                        const isOccupiedByOther = occupancy && !isMyProduct;

                                        let label = loc.path;
                                        let disabled = false;

                                        // REGLA DE DISPONIBILIDAD:
                                        // 1. Está vacío -> Disponible
                                        // 2. Tiene mi producto -> Fusionar (Disponible)
                                        // 3. Tiene otro producto PERO acepta múltiples -> Disponible
                                        // 4. Tiene otro producto Y ES estricto -> Ocupado (Bloqueado)

                                        if (occupancy) {
                                            if (isMyProduct) {
                                                label += " (Fusionar con existente)";
                                            } else if (loc.allows_multiple_products) {
                                                label += ` (Multiproducto / Ocupado por ${occupancy.name})`;
                                            } else {
                                                label += ` (Estricto / Ocupado por ${occupancy.name})`;
                                                disabled = true;
                                            }
                                        } else {
                                            label += " (Disponible / Vacío)";
                                        }

                                        return (
                                            <option key={loc.id} value={loc.id} disabled={disabled}>
                                                {label}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* 5. Justificación */}
                    <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                            Justificación Auditoría
                        </label>
                        <input
                            className="form-input"
                            placeholder="Especifique motivo del ajuste..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    <div className="pt-6 border-t border-border">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 text-base font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                "Procesando Operación..."
                            ) : (
                                <>
                                    <CheckCircle2 size={22} />
                                    <span>Confirmar Operación</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <div className="flex items-start gap-4 p-5 bg-muted/50 rounded-2xl border border-border text-foreground">
                    <Info size={22} className="shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1.5">
                        <p className="font-bold uppercase tracking-widest text-[10px]">
                            Políticas de Auditoría
                        </p>
                        <p>
                            Las mermas y ajustes de salida restarán stock físicamente. Verifique siempre el
                            conteo manual antes de procesar.
                        </p>
                        <p>
                            Los movimientos internos bloquean ubicaciones ocupadas por productos diferentes
                            para mantener el orden.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CategoriesTab() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [newName, setNewName] = useState("");
    const [newColor, setNewColor] = useState("");

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const data = await apiService.getCategories();
            setCategories(data);
        } catch { }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        try {
            const payload: any = { name: newName.trim() };
            if (newColor) payload.color = newColor;

            await api.post('/categories/', payload);
            setNewName("");
            setNewColor("");
            fetchCategories();
        } catch { }
    };

    const handleUpdateColor = async (id: string, color: string) => {
        try {
            await api.put(`/categories/${id}`, { color });
            setCategories(prev => prev.map(c => c.id === id ? { ...c, color } : c));
        } catch (e: any) {
            console.error("Error actualizando color", e);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Deseas eliminar esta categoría?")) return;
        try {
            await api.delete(`/categories/${id}`);
            fetchCategories();
        } catch (e: any) {
            alert(e.response?.data?.detail || "Error al eliminar");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-6">
                <div className="flex items-center gap-2">
                    <Plus size={16} className="text-primary" />
                    <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                        Crear Nueva Categoría
                    </h3>
                </div>

                <form onSubmit={handleCreate} className="space-y-5">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                Nombre de Entidad
                            </label>
                            <input
                                className="form-input text-base font-medium"
                                placeholder="Ej: Repuestos de Motor"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="w-24 shrink-0">
                            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                Color Asignado
                            </label>
                            <div className="flex items-center justify-center p-1 rounded-xl border border-border h-10 w-full bg-background transition-colors focus-within:border-primary">
                                {newColor ? (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <input
                                            type="color"
                                            value={newColor}
                                            onChange={(e) => setNewColor(e.target.value)}
                                            className="w-full h-full p-0 border-0 bg-transparent cursor-pointer rounded-lg relative z-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setNewColor("")}
                                            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center z-20 hover:bg-red-600 transition-colors shadow-sm"
                                            title="Auto-asignar Color"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setNewColor("#e11d48")} // Color de inicio al querer asignarlo manual
                                        className="w-full h-full text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                                        title="Click para escoger manualmente"
                                    >
                                        Auto
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        <span>Registrar Categoría</span>
                    </button>
                </form>

                <div className="p-4 bg-muted/50 rounded-xl border border-border flex items-start gap-3">
                    <Tag size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Las categorías agrupan productos similares para reportes de ventas más detallados.
                    </p>
                </div>
            </div>

            <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
                    <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                        Jerarquía Existente
                    </h2>
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[11px] font-bold border border-primary/20">
                        {categories.length} registradas
                    </span>
                </div>

                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="table-header w-24">ID</th>
                                <th className="table-header">Nombre de Categoría</th>
                                <th className="table-header w-32 text-center">Color Visual</th>
                                <th className="table-header w-24 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((cat) => (
                                <tr
                                    key={cat.id}
                                    className="group border-b border-border/50 last:border-b-0 hover:bg-muted/40 transition-colors"
                                >
                                    <td className="px-5 py-3.5 font-mono text-muted-foreground text-xs">
                                        #{cat.id.toString().padStart(3, "0")}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary/30 group-hover:bg-primary transition-all" />
                                            <span className="font-medium text-foreground text-sm">{cat.full_path || cat.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                        <div className="flex items-center justify-center gap-2 group/color">
                                            <div className="relative w-6 h-6 rounded-full overflow-hidden border border-border shadow-sm cursor-pointer hover:scale-110 hover:shadow-md transition-all">
                                                <input
                                                    type="color"
                                                    value={cat.color || "#cccccc"}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, color: val } : c));
                                                    }}
                                                    onBlur={(e) => handleUpdateColor(cat.id, e.target.value)}
                                                    className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer pointer-events-auto"
                                                    title="Modificar Color"
                                                />
                                            </div>
                                            <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                                                {cat.color || "#Auto"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                        <button
                                            onClick={() => handleDelete(cat.id)}
                                            className="p-2 text-muted-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {categories.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <FolderTree size={48} strokeWidth={1} className="mb-3 opacity-30" />
                            <p className="text-sm font-medium">No hay categorías definidas</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function ActionsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-foreground">Acciones</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Operaciones de inventario, ajustes de stock y gestión de categorías.
                </p>
            </div>

            <Tabs defaultValue="operations" className="space-y-6">
                <TabsList className="bg-muted border border-border">
                    <TabsTrigger value="operations" className="gap-2 data-[state=active]:shadow-sm">
                        <Settings2 size={14} />
                        <span>Operaciones</span>
                    </TabsTrigger>
                    <TabsTrigger value="categories" className="gap-2 data-[state=active]:shadow-sm">
                        <Tag size={14} />
                        <span>Categorías</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="operations">
                    <OperationsTab />
                </TabsContent>

                <TabsContent value="categories">
                    <CategoriesTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
