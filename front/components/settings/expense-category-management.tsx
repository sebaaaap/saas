"use client";

import React, { useState } from "react";
import { 
    Receipt, Plus, Trash2, Edit2, Check, X, 
    Palette, Loader2, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import useSWR from "swr";
import api from "@/lib/api";

interface ExpenseCategory {
    id: string;
    name: string;
    color: string;
    icon: string;
    is_active: bool;
}

const COLORS = [
    "#6366f1", "#10b981", "#f59e0b", "#ef4444", 
    "#8b5cf6", "#ec4899", "#06b6d4", "#6b7280"
];

export function ExpenseCategoryManagement() {
    const { data: categories, mutate, isLoading } = useSWR<ExpenseCategory[]>(
        "/expenses/categories",
        () => api.get("/expenses/categories").then(r => r.data)
    );

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: "", color: "#6366f1", icon: "receipt" });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!formData.name) {
            toast.error("El nombre es obligatorio");
            return;
        }

        setSaving(true);
        try {
            if (editingId) {
                await api.put(`/expenses/categories/${editingId}`, formData);
                toast.success("Categoría actualizada");
            } else {
                await api.post("/expenses/categories", formData);
                toast.success("Categoría creada");
            }
            mutate();
            setIsAdding(false);
            setEditingId(null);
            setFormData({ name: "", color: "#6366f1", icon: "receipt" });
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que deseas desactivar esta categoría?")) return;
        try {
            await api.delete(`/expenses/categories/${id}`);
            toast.success("Categoría desactivada");
            mutate();
        } catch (error) {
            toast.error("Error al eliminar");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Categorías de Gasto</h2>
                    <p className="text-sm text-muted-foreground">Gestiona las categorías para gastos rápidos en el PDV.</p>
                </div>
                <Button 
                    onClick={() => {
                        setIsAdding(true);
                        setEditingId(null);
                        setFormData({ name: "", color: "#6366f1", icon: "receipt" });
                    }}
                    className="gap-2"
                >
                    <Plus size={16} />
                    Nueva Categoría
                </Button>
            </div>

            {(isAdding || editingId) && (
                <Card className="p-4 bg-muted/30 border-dashed">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Nombre</label>
                            <Input 
                                placeholder="Ej: Propinas, Almuerzos..." 
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Color</label>
                            <div className="flex flex-wrap gap-2">
                                {COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setFormData({ ...formData, color: c })}
                                        className={`w-6 h-6 rounded-full border-2 transition-all ${formData.color === c ? 'border-foreground' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex items-end gap-2">
                            <Button 
                                onClick={handleSave} 
                                disabled={saving}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} className="mr-2" />}
                                Guardar
                            </Button>
                            <Button 
                                variant="ghost" 
                                onClick={() => { setIsAdding(false); setEditingId(null); }}
                                disabled={saving}
                            >
                                <X size={16} />
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <Card key={i} className="h-24 animate-pulse bg-muted" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories?.map(cat => (
                        <Card key={cat.id} className="p-4 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                                    style={{ backgroundColor: cat.color }}
                                >
                                    <Receipt size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">{cat.name}</h3>
                                    <Badge variant="outline" className="text-[9px] uppercase">Activa</Badge>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 text-blue-500"
                                    onClick={() => {
                                        setEditingId(cat.id);
                                        setFormData({ name: cat.name, color: cat.color, icon: cat.icon });
                                    }}
                                >
                                    <Edit2 size={14} />
                                </Button>
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => handleDelete(cat.id)}
                                >
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
