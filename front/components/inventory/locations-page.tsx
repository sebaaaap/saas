"use client";

import React, { useEffect, useState } from 'react';
import { Plus, Folder, MapPin, Package, Search, ChevronRight, FolderTree, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';

interface Location {
    id: string;
    name: string;
    path: string;
    allows_multiple_products: boolean;
    children: Location[];
}

interface ProductInfo {
    id: string;
    name: string;
    barcode: string;
    stock: number;
    price: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function LocationsPage() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [locationProducts, setLocationProducts] = useState<ProductInfo[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [form, setForm] = useState({ name: "", parent_id: "", allows_multiple_products: true });
    const [generateForm, setGenerateForm] = useState({ zone_prefix: "A", num_columns: 10, num_levels: 7, allows_multiple_products: false });

    const fetchLocations = async () => {
        try {
            const res = await api.get('/locations/tree');
            setLocations(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocationProducts = async (loc: Location) => {
        setIsLoadingProducts(true);
        setSelectedLocation(loc);
        try {
            const res = await api.get(`/locations/${loc.id}/products`);
            setLocationProducts(res.data || []);
        } catch (e) {
            console.error(e);
            setLocationProducts([]);
        } finally {
            setIsLoadingProducts(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name) return;
        try {
            await api.post('/locations/', {
                name: form.name,
                parent_id: form.parent_id ? form.parent_id : null,
                allows_multiple_products: form.allows_multiple_products,
            });
            setForm({ name: "", parent_id: "", allows_multiple_products: true });
            setIsCreating(false);
            fetchLocations();
        } catch {
            alert("Error creando ubicación");
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/locations/generate', generateForm);
            setIsGenerating(false);
            setGenerateForm({ zone_prefix: "A", num_columns: 10, num_levels: 7, allows_multiple_products: false });
            await fetchLocations();
            alert("Pasillo generado correctamente");
        } catch {
            alert("Error generando pasillo");
        }
    };

    const getFlatOptions = (nodes: Location[], list: { id: string; path: string }[] = []) => {
        nodes.forEach((node) => {
            list.push({ id: node.id, path: node.path });
            if (node.children) getFlatOptions(node.children, list);
        });
        return list;
    };

    const flatLocations = getFlatOptions(locations);

    const handleDelete = async (e: React.MouseEvent, location: Location) => {
        e.stopPropagation();
        if (!confirm(`¿Está seguro de que desea eliminar la ubicación "${location.name}" y todas sus sub-ubicaciones?`)) {
            return;
        }

        try {
            await api.delete(`/locations/${location.id}`);
            if (selectedLocation?.id === location.id) {
                setSelectedLocation(null);
            }
            fetchLocations();
        } catch (e: any) {
            console.error(e);
            alert(e.response?.data?.detail || "Error al eliminar la ubicación");
        }
    };

    const renderTree = (nodes: Location[], level = 0) =>
        nodes.map((node) => (
            <div key={node.id} className="group/item relative">
                <div
                    onClick={() => fetchLocationProducts(node)}
                    className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl cursor-pointer transition-all group
            ${selectedLocation?.id === node.id
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10'
                            : 'hover:bg-accent text-foreground'
                        }`}
                    style={{ paddingLeft: `${12 + level * 16}px` }}
                >
                    <Folder
                        size={15}
                        className={selectedLocation?.id === node.id ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'}
                    />
                    <span className="font-semibold text-xs truncate flex-1">{node.name}</span>
                    <div className="flex items-center gap-1">
                        {!node.allows_multiple_products && (
                            <span className="text-[8px] font-black bg-amber-500/10 text-amber-600 px-1 rounded border border-amber-500/20 mr-1" title="Admite 1 solo producto">
                                STRICT
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={(e) => handleDelete(e, node)}
                            className={`p-1 rounded-md transition-all opacity-0 group-hover:opacity-100 hover:scale-110
                                ${selectedLocation?.id === node.id
                                    ? 'hover:bg-white/20 text-primary-foreground'
                                    : 'hover:bg-red-500/10 text-muted-foreground hover:text-red-500'
                                }`}
                            title="Eliminar"
                        >
                            <Trash2 size={12} />
                        </button>
                        {node.children?.length > 0 && (
                            <ChevronRight
                                size={12}
                                className={`opacity-40 transition-transform ${selectedLocation?.id === node.id ? 'rotate-90' : ''}`}
                            />
                        )}
                    </div>
                </div>
                {node.children && renderTree(node.children, level + 1)}
            </div>
        ));

    const getStockColor = (stock: number) => {
        if (stock > 10) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
        if (stock > 0) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-red-700 bg-red-50 border-red-200';
    };

    const handleDeleteProduct = async (e: React.MouseEvent, productId: string) => {
        e.stopPropagation();
        if (!selectedLocation) return;

        const qtyStr = prompt("Ingrese cantidad a eliminar (dejar vacío para eliminar todo):");
        if (qtyStr === null) return; // Cancelled

        let quantity: number | undefined = undefined;
        if (qtyStr.trim() !== "") {
            quantity = parseFloat(qtyStr);
            if (isNaN(quantity) || quantity <= 0) {
                alert("Cantidad inválida");
                return;
            }
        }

        try {
            let url = `/locations/${selectedLocation.id}/products/${productId}`;
            if (quantity !== undefined) {
                url += `?quantity=${quantity}`;
            }

            await api.delete(url);
            fetchLocationProducts(selectedLocation);
            alert("Producto eliminado/reducido correctamente.");
        } catch (e: any) {
            console.error(e);
            alert(e.response?.data?.detail || "Error al eliminar producto");
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-lg font-bold text-foreground">Ubicaciones Logísticas</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Estructura jerárquica de su almacén y control de existencias por zona.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setIsGenerating(!isGenerating);
                            setIsCreating(false);
                        }}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all border
                ${isGenerating
                                ? 'bg-card border-primary text-primary'
                                : 'bg-card border-border text-muted-foreground hover:bg-accent'
                            }`}
                    >
                        {isGenerating ? 'Cerrar Generador' : <><Plus size={16} /><span>Generar Pasillo</span></>}
                    </button>
                    <button
                        onClick={() => {
                            setIsCreating(!isCreating);
                            setIsGenerating(false);
                        }}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all
                ${isCreating
                                ? 'bg-card border border-border text-muted-foreground hover:bg-accent'
                                : 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90'
                            }`}
                    >
                        {isCreating ? 'Cancelar' : <><Plus size={16} /><span>Añadir Zona</span></>}
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-[500px]">
                <div className="bg-card rounded-2xl border border-border w-full md:w-80 flex flex-col shrink-0 shadow-sm">
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FolderTree size={14} className="text-primary" />
                            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
                                Navegador
                            </h2>
                        </div>
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold">
                            {flatLocations.length}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-0.5">
                        {isGenerating && (
                            <div className="mb-4 p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-3 animate-in slide-in-from-top-4 duration-300">
                                <div className="text-[10px] font-bold text-primary uppercase tracking-[0.15em]">
                                    Generar Matriz de Pasillo
                                </div>
                                <form onSubmit={handleGenerate} className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-muted-foreground uppercase px-1">Prefijo Pasillo</label>
                                        <input
                                            className="form-input h-8 text-xs"
                                            placeholder="Ej: A"
                                            value={generateForm.zone_prefix}
                                            onChange={(e) => setGenerateForm({ ...generateForm, zone_prefix: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-muted-foreground uppercase px-1">Columnas</label>
                                            <input
                                                type="number"
                                                className="form-input h-8 text-xs"
                                                value={generateForm.num_columns}
                                                onChange={(e) => setGenerateForm({ ...generateForm, num_columns: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-muted-foreground uppercase px-1">Niveles</label>
                                            <input
                                                type="number"
                                                className="form-input h-8 text-xs"
                                                value={generateForm.num_levels}
                                                onChange={(e) => setGenerateForm({ ...generateForm, num_levels: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-1 py-1">
                                        <input
                                            type="checkbox"
                                            id="gen-multiple"
                                            className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20"
                                            checked={generateForm.allows_multiple_products}
                                            onChange={(e) => setGenerateForm({ ...generateForm, allows_multiple_products: e.target.checked })}
                                        />
                                        <label htmlFor="gen-multiple" className="text-[10px] font-bold text-muted-foreground uppercase cursor-pointer">Permitir Múltiples Productos</label>
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full h-9 bg-primary text-primary-foreground rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors shadow-sm"
                                    >
                                        Generar Ubicaciones
                                    </button>
                                </form>
                            </div>
                        )}

                        {isCreating && (
                            <div className="mb-4 p-4 bg-muted/50 rounded-xl border border-border space-y-3 animate-in slide-in-from-top-4 duration-300">
                                <div className="text-[10px] font-bold text-primary uppercase tracking-[0.15em]">
                                    Nueva Ubicación Manual
                                </div>
                                <form onSubmit={handleCreate} className="space-y-3">
                                    <input
                                        className="form-input h-9 text-xs"
                                        placeholder="Nombre (ej: Pasillo 04)"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        autoFocus
                                    />
                                    <select
                                        className="form-input h-9 text-xs"
                                        value={form.parent_id}
                                        onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                                    >
                                        <option value="">Zona Raíz (Top)</option>
                                        {flatLocations.map((loc) => (
                                            <option key={loc.id} value={loc.id}>{loc.path}</option>
                                        ))}
                                    </select>
                                    <div className="flex items-center gap-2 px-1">
                                        <input
                                            type="checkbox"
                                            id="create-multiple"
                                            className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20"
                                            checked={form.allows_multiple_products}
                                            onChange={(e) => setForm({ ...form, allows_multiple_products: e.target.checked })}
                                        />
                                        <label htmlFor="create-multiple" className="text-[10px] font-bold text-muted-foreground uppercase cursor-pointer">Permitir Múltiples Productos</label>
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full h-9 bg-primary text-primary-foreground rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors"
                                    >
                                        Registrar
                                    </button>
                                </form>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="space-y-2 p-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-9 rounded-xl" />
                                ))}
                            </div>
                        ) : (
                            <>
                                {renderTree(locations)}
                                {locations.length === 0 && !isCreating && (
                                    <div className="text-center py-12 text-muted-foreground/50">
                                        <Folder size={32} className="mx-auto mb-3" />
                                        <p className="text-[10px] font-bold uppercase tracking-[0.15em]">Almacén Vacío</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="bg-card rounded-2xl border border-border flex-1 flex flex-col shadow-sm overflow-hidden min-h-[400px]">
                    {selectedLocation ? (
                        <>
                            <div className="px-8 py-6 border-b border-border flex justify-between items-start shrink-0">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/15">
                                            <MapPin size={12} />
                                            <span className="text-[10px] font-bold uppercase tracking-[0.15em]">Localización</span>
                                        </span>
                                        <div className="h-px w-6 bg-border" />
                                        <h2 className="text-xl font-bold text-foreground">{selectedLocation.name}</h2>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground font-mono">
                                        PATH: {selectedLocation.path}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-foreground tracking-tight">
                                        {locationProducts.length}
                                    </div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
                                        SKUs Únicos
                                    </p>
                                </div>
                                <div className="ml-6 flex flex-col items-center">
                                    <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${selectedLocation.allows_multiple_products ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                        {selectedLocation.allows_multiple_products ? 'Múltiples SKU' : 'SKU Único'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {isLoadingProducts ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                        {Array.from({ length: 8 }).map((_, i) => (
                                            <Skeleton key={i} className="h-40 rounded-2xl" />
                                        ))}
                                    </div>
                                ) : locationProducts.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                        {locationProducts.map((prod) => (
                                            <div
                                                key={prod.id}
                                                className="group bg-card border border-border p-5 rounded-2xl hover:border-primary hover:shadow-lg hover:shadow-primary/5 transition-all relative"
                                            >
                                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => handleDeleteProduct(e, prod.id)}
                                                        className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                                                        title="Eliminar o reducir stock de esta ubicación"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                        <Package size={18} />
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getStockColor(prod.stock)}`}>
                                                        Stock: {prod.stock}
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-foreground text-sm truncate mb-1" title={prod.name}>
                                                    {prod.name}
                                                </h3>
                                                <p className="text-[10px] text-muted-foreground font-mono mb-4">{prod.barcode}</p>
                                                <div className="pt-3 border-t border-border flex justify-between items-center">
                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Valor U.</span>
                                                    <span className="font-bold text-foreground">${prod.price.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-5">
                                            <Search size={36} className="opacity-30" />
                                        </div>
                                        <p className="text-sm font-bold uppercase tracking-[0.15em]">Ubicación Vacía</p>
                                        <p className="text-xs mt-2 opacity-60 max-w-xs text-center">
                                            No se detectaron existencias asignadas a esta zona de almacenamiento.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-6 p-8 min-h-[400px]">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl scale-150" />
                                <div className="relative w-28 h-28 bg-card rounded-3xl border border-border shadow-xl flex items-center justify-center -rotate-6">
                                    <MapPin size={56} className="text-primary opacity-50" />
                                </div>
                            </div>
                            <div className="text-center max-w-sm">
                                <p className="text-lg font-bold text-foreground">Seleccione un Nodo</p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Navegue por la estructura logística para auditar las existencias por pasillo, estante o bodega.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
