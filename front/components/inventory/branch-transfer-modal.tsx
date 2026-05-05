"use client";

import React, { useState, useEffect } from "react";
import { 
    ArrowRightLeft, Building2, Package, 
    ArrowRight, Check, Loader2, X, Plus, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { 
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiService } from "@/services/apiService";
import { toast } from "sonner";
import useSWR from "swr";

interface BranchTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function BranchTransferModal({ isOpen, onClose, onSuccess }: BranchTransferModalProps) {
    const { data: branches } = useSWR('/branches', apiService.getBranches);
    const [fromBranchId, setFromBranchId] = useState<string>("");
    const [toBranchId, setToBranchId] = useState<string>("");
    const [items, setItems] = useState<{product_id: string, name: string, quantity: number, max: number}[]>([]);
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            const currentBranch = localStorage.getItem("branch_id");
            if (currentBranch) {
                setFromBranchId(currentBranch);
                // Fetch products for the current branch
                apiService.getProducts().then(res => {
                    // Filtrar productos que tengan stock > 0
                    setProducts(res.filter((p: any) => p.total_stock > 0));
                }).catch(err => console.error("Error al cargar productos:", err));
            }
        } else {
            // Reset al cerrar
            setItems([]);
            setToBranchId("");
        }
    }, [isOpen]);

    const addItem = (product: any) => {
        if (items.find(i => i.product_id === product.id)) {
            toast.error("Producto ya agregado");
            return;
        }
        setItems([...items, { 
            product_id: product.id, 
            name: product.name, 
            quantity: 1, 
            max: product.total_stock 
        }]);
    };

    const removeItem = (id: string) => {
        setItems(items.filter(i => i.product_id !== id));
    };

    const handleTransfer = async () => {
        if (!fromBranchId || !toBranchId || items.length === 0) {
            toast.error("Completa todos los campos");
            return;
        }
        if (fromBranchId === toBranchId) {
            toast.error("Las sucursales deben ser diferentes");
            return;
        }

        setLoading(true);
        try {
            await apiService.transferStockBetweenBranches({
                from_branch_id: fromBranchId,
                to_branch_id: toBranchId,
                items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
                reason: "Traslado entre sucursales"
            });
            toast.success("Traslado completado correctamente");
            onSuccess?.();
            onClose();
        } catch (error: any) {
            const detail = error.response?.data?.detail;
            if (Array.isArray(detail)) {
                toast.error(`Error de validación: ${detail.map((e: any) => e.msg).join(', ')}`);
            } else if (typeof detail === 'string') {
                toast.error(detail);
            } else {
                toast.error("Error al transferir");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-white rounded-3xl border-none shadow-2xl">
                <DialogHeader className="p-6 bg-slate-900 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                            <ArrowRightLeft size={24} />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black tracking-tight">Traslado entre Sucursales</DialogTitle>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Mover stock de un local a otro</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* Sucursales Selector */}
                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400">Desde (Actual)</label>
                            <Select value={fromBranchId} onValueChange={setFromBranchId} disabled>
                                <SelectTrigger className="h-10 rounded-xl font-bold bg-slate-100 border-2 border-slate-200 text-slate-500 cursor-not-allowed">
                                    <SelectValue placeholder="Sucursal Origen" />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches?.map((b: any) => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="pt-6">
                            <ArrowRight size={20} className="text-slate-300" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400">Hacia (Destino)</label>
                            <Select value={toBranchId} onValueChange={setToBranchId}>
                                <SelectTrigger className="h-10 rounded-xl font-bold bg-white border-2 border-blue-200 focus:ring-blue-500 focus:border-blue-500">
                                    <SelectValue placeholder="Sucursal Destino" />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches?.filter((b: any) => b.id !== fromBranchId).map((b: any) => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Buscador de Productos */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-400">Seleccionar Producto</label>
                        <div className="relative">
                            <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                                className="w-full pl-10 pr-4 h-11 rounded-xl font-bold bg-white border-2 border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                                value=""
                                onChange={(e) => {
                                    const p = products.find(p => p.id === e.target.value);
                                    if (p) addItem(p);
                                }}
                                disabled={!fromBranchId || products.length === 0}
                            >
                                <option value="">{products.length === 0 ? "Cargando productos..." : "Buscar producto..."}</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} (Disp: {p.total_stock} {p.uom || 'unidades'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Lista de Items */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-400">Productos a Trasladar</label>
                        <div className="space-y-2 max-h-[200px] overflow-auto pr-2 custom-scrollbar">
                            {items.length === 0 ? (
                                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                    <p className="text-xs text-slate-400 font-bold uppercase">No hay productos seleccionados</p>
                                </div>
                            ) : (
                                items.map(item => (
                                    <div key={item.product_id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate">{item.name}</p>
                                            <p className="text-[9px] text-muted-foreground font-bold uppercase">Disponible: {item.max}</p>
                                        </div>
                                        <div className="w-24">
                                            <Input 
                                                type="number" 
                                                min="1" 
                                                max={item.max}
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    const cleanVal = isNaN(val) ? 0 : Math.min(val, item.max);
                                                    setItems(items.map(i => i.product_id === item.product_id ? { ...i, quantity: cleanVal } : i));
                                                }}
                                                className="h-8 rounded-lg font-black text-center"
                                            />
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                            onClick={() => removeItem(item.product_id)}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-slate-50 border-t flex gap-2">
                    <Button variant="ghost" onClick={onClose} className="flex-1 rounded-xl font-bold" disabled={loading}>
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleTransfer} 
                        className="flex-1 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 gap-2" 
                        disabled={loading || items.length === 0 || !toBranchId}
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                        Confirmar Traslado
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
