"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Plus, Edit, Trash2, Package, MapPin, ChevronDown, Upload, Loader2, Settings, Coffee } from "lucide-react";
import { ProductModal } from "@/components/shared/product-modal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiService } from "@/services/apiService";
import api from "@/lib/api";

interface LocationDetail {
    id: string;
    location_id: string;
    location_path: string;
    stock: number;
}

interface Product {
    id: string;
    name: string;
    barcode: string;
    price: number;
    cost: number;
    product_type: string;
    total_stock: number;
    stock_quantity: number;
    uom: string;
    internal_reference?: string;
    category_id?: string;
    min_stock?: number;
    locations: LocationDetail[];
    location_id?: string;
}

interface Location {
    id: string;
    name: string;
    path: string;
    allows_multiple_products: boolean;
}

interface Category {
    id: string;
    name: string;
    color?: string;
}

const API_BASE = "http://localhost:8000/api/v1";

export function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        barcode: "",
        price: "" as string,
        cost: "" as string,
        product_type: "STORABLE",
        location_id: "",
        category_id: "",
        uom: "unidades",
        internal_reference: "",
        is_variable_consumption: false,
        default_consumption_rate: "1.0",
        min_stock: "5",
    });

    useEffect(() => {
        fetchProducts();
        fetchLocations();
        fetchCategories();
    }, []);

    useEffect(() => {
        if (typeof document === "undefined") return;
        const orig = document.body.style.overflow;
        if (isModalOpen) document.body.style.overflow = "hidden";
        else document.body.style.overflow = orig;
        return () => {
            document.body.style.overflow = orig;
        };
    }, [isModalOpen]);

    const fetchCategories = async () => {
        try {
            const data = await apiService.getCategories();
            setCategories(data);
        } catch (e) {
            console.error("Error fetching categories", e);
        }
    };

    const fetchProducts = async () => {
        try {
            const data = await apiService.getProducts();
            setProducts(data as any);
        } catch (e) {
            console.error("Error fetching products", e);
        }
    };

    const fetchLocations = async () => {
        try {
            const res = await api.get("/locations/tree");
            if (res.data) {
                setLocations(flattenLocations(res.data));
            }
        } catch (e) {
            console.error("Error fetching locations", e);
        }
    };

    const flattenLocations = (nodes: any[], list: any[] = []) => {
        nodes.forEach((n) => {
            list.push({
                id: n.id,
                name: n.name,
                path: n.path,
                allows_multiple_products: n.allows_multiple_products
            });
            if (n.children) flattenLocations(n.children, list);
        });
        return list;
    };

    const openCreateModal = () => {
        setEditingId(null);
        setFormData({
            name: "",
            barcode: "",
            price: "",
            cost: "",
            product_type: "STORABLE",
            location_id: "",
            category_id: "",
            uom: "unidades",
            internal_reference: "",
            is_variable_consumption: false,
            default_consumption_rate: "1.0",
            min_stock: "5",
        });
        setIsModalOpen(true);
    };

    const openEditModal = (product: Product) => {
        setEditingId(product.id);
        setFormData({
            name: product.name,
            barcode: product.barcode,
            price: product.price.toString(),
            cost: product.cost.toString(),
            product_type: product.product_type,
            location_id: product.location_id?.toString() || "",
            category_id: product.category_id?.toString() || "",
            uom: product.uom || "unidades",
            internal_reference: product.internal_reference || "",
            is_variable_consumption: (product as any).is_variable_consumption || false,
            default_consumption_rate: ((product as any).default_consumption_rate || 1.0).toString(),
            min_stock: ((product as any).min_stock ?? 5).toString(),
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este producto?")) return;
        try {
            await api.delete(`/products/${id}`);
            alert("Producto eliminado");
            fetchProducts();
        } catch (e: any) {
            alert("Error: " + (e.response?.data?.detail || "Error al eliminar"));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isService = formData.product_type === "SERVICE";
        const payload = {
            ...formData,
            price: parseFloat(formData.price) || 0,
            cost: parseFloat(formData.cost) || 0,
            location_id: isService || !formData.location_id ? null : formData.location_id,
            category_id: formData.category_id ? formData.category_id : null,
            uom: isService ? "servicio" : (formData.uom || "unidades"),
            is_variable_consumption: !isService && formData.uom !== "unidades",
            default_consumption_rate: parseFloat(formData.default_consumption_rate) || 1.0,
            min_stock: parseFloat(formData.min_stock) || 0,
        };

        try {
            if (editingId) {
                await api.put(`/products/${editingId}`, payload);
            } else {
                await api.post(`/products/`, payload);
            }
            setIsModalOpen(false);
            alert(editingId ? "Producto Actualizado" : "Producto Creado");
            fetchProducts();
        } catch (e: any) {
            alert("Error: " + (e.response?.data?.detail || "Error al guardar"));
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            await api.post("/products/import", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            alert("Productos importados correctamente");
            fetchProducts();
            fetchCategories();
            fetchLocations();
        } catch (error: any) {
            alert("Error: " + (error.response?.data?.detail || "Error en la importación"));
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const filteredProducts = products.filter(
        (p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.barcode.includes(searchTerm) ||
            (p.internal_reference &&
                p.internal_reference.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Obtener IDs de ubicaciones ocupadas por OTROS productos (diferentes al que editamos)
    const currentBarcode = products.find(p => p.id === editingId)?.barcode;
    const occupiedLocationIds = products
        .flatMap(p => (p.locations || []).map(l => ({ loc_id: l.location_id, barcode: p.barcode })))
        .filter(item => item.barcode !== currentBarcode)
        .map(item => item.loc_id);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                <div>
                    <h2 className="text-lg font-bold text-foreground">
                        Catálogo de Productos
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Gestione sus existencias, precios y categorías desde una vista
                        centralizada.
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search
                            size={16}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, código o referencia..."
                            className="form-input pl-11"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    <button
                        onClick={handleImportClick}
                        disabled={isImporting}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-muted text-foreground hover:bg-muted/80 transition-colors border border-border disabled:opacity-50"
                    >
                        {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        <span className="hidden md:inline">{isImporting ? "Importando..." : "Importar"}</span>
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                    >
                        <Plus size={16} />
                        <span>Nuevo</span>
                    </button>
                </div>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="table-header w-14">Icono</th>
                                <th className="table-header">Producto</th>
                                <th className="table-header">Referencia / Barcode</th>
                                <th className="table-header">Ubicación</th>
                                <th className="table-header">Categoría</th>
                                <th className="table-header text-center">Stock</th>
                                <th className="table-header text-right">Precio</th>
                                <th className="table-header w-24 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product) => (
                                <tr
                                    key={product.id}
                                    className="group border-b border-border/50 last:border-b-0 hover:bg-muted/40 transition-colors"
                                >
                                    <td className="px-5 py-4 text-center">
                                        <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center text-base group-hover:bg-card transition-colors">
                                            {product.product_type === "SERVICE"
                                                ? <Settings size={18} className="text-muted-foreground" />
                                                : product.category_id === "1"
                                                    ? <Coffee size={18} className="text-muted-foreground" />
                                                    : <Package size={18} className="text-muted-foreground" />}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-foreground text-sm">
                                                {product.name}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground uppercase font-medium">
                                                {product.product_type === "SERVICE" ? "Servicio" : product.uom}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex flex-col gap-1.5">
                                            {product.internal_reference && (
                                                <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-md w-fit uppercase tracking-wider">
                                                    REF: {product.internal_reference}
                                                </span>
                                            )}
                                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded-lg border border-border text-muted-foreground w-fit">
                                                {product.barcode}
                                            </code>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        {product.product_type === "SERVICE" ? (
                                            <span className="text-sm font-bold text-muted-foreground">-</span>
                                        ) : (!product.locations || product.locations.length === 0) ? (
                                            <span className="text-sm font-bold text-muted-foreground">-</span>
                                        ) : product.locations.length === 1 ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold font-mono">
                                                <MapPin size={10} />
                                                {product.locations[0].location_path.split('/').pop()}
                                            </span>
                                        ) : (
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold border-dashed gap-1 px-2">
                                                        <MapPin size={10} />
                                                        Múltiples (+{product.locations.length})
                                                        <ChevronDown size={10} className="opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-56 p-2" align="start">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] uppercase font-bold text-muted-foreground px-2 mb-2">Desglose de Stock</p>
                                                        {product.locations.map((loc) => (
                                                            <div key={loc.id} className="flex justify-between items-center text-xs p-2 rounded-lg hover:bg-muted transition-colors">
                                                                <div className="flex items-center gap-2">
                                                                    <MapPin size={12} className="text-muted-foreground" />
                                                                    <span className="font-mono font-medium">{loc.location_path.split('/').pop()}</span>
                                                                </div>
                                                                <Badge variant="secondary" className="h-5 text-[10px]">{loc.stock}</Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        {(() => {
                                            const cat = categories.find((c) => c.id === product.category_id);
                                            const catName = cat?.name || "General";
                                            const catColor = cat?.color || "#6366f1";
                                            return (
                                                <div className="flex items-center">
                                                    <span
                                                        className="text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-normal"
                                                        style={{
                                                            backgroundColor: `${catColor}25`,
                                                            color: catColor,
                                                            borderColor: `${catColor}45`,
                                                            filter: 'brightness(0.75)' // Hace el texto más oscuro y legible
                                                        }}
                                                    >
                                                        {catName}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            {product.product_type === "SERVICE" ? (
                                                <span className="text-sm font-bold text-muted-foreground">-</span>
                                            ) : (
                                                <span
                                                    className={`text-sm font-bold ${product.total_stock <= (product.min_stock ?? 5)
                                                        ? "text-red-600"
                                                        : "text-emerald-600"
                                                        }`}
                                                >
                                                    {product.total_stock}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-right font-bold text-foreground">
                                        ${product.price.toLocaleString()}
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditModal(product)}
                                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                                title="Editar"
                                            >
                                                <Edit size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                        <Package size={56} strokeWidth={1} className="mb-4 opacity-40" />
                        <p className="text-lg font-medium">
                            No se encontraron productos
                        </p>
                        <p className="text-sm mt-1 opacity-70">
                            Intente ajustar los filtros de búsqueda
                        </p>
                    </div>
                )}
            </div>

            <ProductModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                formData={formData}
                setFormData={setFormData}
                editingId={editingId}
                categories={categories}
                locations={locations}
                occupiedLocationIds={occupiedLocationIds}
            />
        </div>
    );
}
