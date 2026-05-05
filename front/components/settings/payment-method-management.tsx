"use client";

import { useState } from 'react';
import { 
    Plus, Wallet, CreditCard, Smartphone, UserCheck, 
    Trash2, Edit2, Check, X, HelpCircle, AlertCircle,
    Save, Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiService } from "@/services/apiService";
import { toast } from "sonner";
import useSWR from 'swr';

const iconOptions = [
    { name: "Billetera", icon: Wallet, value: "Wallet" },
    { name: "Tarjeta", icon: CreditCard, value: "CreditCard" },
    { name: "Celular", icon: Smartphone, value: "Smartphone" },
    { name: "Usuario", icon: UserCheck, value: "UserCheck" },
    { name: "Ayuda", icon: HelpCircle, value: "HelpCircle" },
];

export function PaymentMethodManagement() {
    const { data: methods, mutate } = useSWR('/payment-methods/', () => apiService.getPaymentMethods(false));
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Form state
    const [name, setName] = useState("");
    const [key, setKey] = useState("");
    const [icon, setIcon] = useState("Wallet");
    const [description, setDescription] = useState("");

    const resetForm = () => {
        setName("");
        setKey("");
        setIcon("Wallet");
        setDescription("");
        setIsAdding(false);
    };

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editIcon, setEditIcon] = useState("Wallet");
    const [editDescription, setEditDescription] = useState("");

    const startEdit = (pm: any) => {
        setEditingId(pm.id);
        setEditName(pm.name);
        setEditIcon(pm.icon || "Wallet");
        setEditDescription(pm.description || "");
    };

    const handleSaveEdit = async (pm: any) => {
        if (!editName) {
            toast.error("El nombre es obligatorio");
            return;
        }
        setLoading(true);
        try {
            await apiService.updatePaymentMethod(pm.id, {
                ...pm,
                name: editName,
                icon: editIcon,
                description: editDescription
            });
            toast.success("Método de pago actualizado");
            mutate();
            setEditingId(null);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error al actualizar método");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este método de pago?")) return;
        try {
            await apiService.deletePaymentMethod(id);
            toast.success("Método de pago eliminado");
            mutate();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error al eliminar");
        }
    };

    const handleCreate = async () => {
        if (!name || !key) {
            toast.error("Nombre y Clave son obligatorios");
            return;
        }
        setLoading(true);
        try {
            await apiService.createPaymentMethod({
                name,
                key: key.toLowerCase().replace(/\s+/g, '_'),
                icon,
                description,
                is_active: true
            });
            toast.success("Método de pago creado");
            mutate();
            resetForm();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error al crear método");
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (pm: any) => {
        try {
            await apiService.updatePaymentMethod(pm.id, {
                ...pm,
                is_active: !pm.is_active
            });
            toast.success(`Método ${pm.is_active ? 'desactivado' : 'activado'}`);
            mutate();
        } catch (error) {
            toast.error("Error al actualizar estado");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-foreground">Métodos de Pago</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Define cómo tus clientes pueden pagar en el PDV.</p>
                </div>
                {!isAdding && (
                    <Button onClick={() => setIsAdding(true)} size="sm" className="gap-2 rounded-xl">
                        <Plus size={16} />
                        Nuevo Método
                    </Button>
                )}
            </div>

            {isAdding && (
                <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nombre para mostrar</label>
                            <Input 
                                placeholder="Ej: Crédito Interno" 
                                value={name} 
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (!key) setKey(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                                }}
                                className="h-10 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Clave (ID sistema)</label>
                            <Input 
                                placeholder="ej: credito_interno" 
                                value={key} 
                                onChange={(e) => setKey(e.target.value)}
                                className="h-10 rounded-xl font-mono text-xs"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Icono Representativo</label>
                            <div className="flex gap-2">
                                {iconOptions.map((opt) => {
                                    const Icon = opt.icon;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setIcon(opt.value)}
                                            className={`p-3 rounded-xl border-2 transition-all ${icon === opt.value ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-muted-foreground'}`}
                                        >
                                            <Icon size={20} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Descripción (Opcional)</label>
                            <Input 
                                placeholder="Breve descripción del método de pago..." 
                                value={description} 
                                onChange={(e) => setDescription(e.target.value)}
                                className="h-10 rounded-xl"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-6">
                        <Button variant="outline" onClick={resetForm} className="flex-1 h-10 rounded-xl" disabled={loading}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCreate} className="flex-1 h-10 rounded-xl gap-2" disabled={loading}>
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Guardar Método
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid gap-3">
                {methods?.map((pm: any) => {
                    const isDefault = ["efectivo", "tarjeta", "transferencia", "credito_interno"].includes(pm.key);
                    const IconComp = iconOptions.find(o => o.value === pm.icon)?.icon || HelpCircle;
                    const isEditing = editingId === pm.id;
                    
                    if (isEditing) {
                        return (
                            <div key={pm.id} className="bg-muted/30 border border-primary rounded-2xl p-6 animate-in fade-in duration-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nombre</label>
                                        <Input 
                                            value={editName} 
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="h-10 rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Clave</label>
                                        <Input 
                                            value={pm.key} 
                                            disabled
                                            className="h-10 rounded-xl font-mono text-xs opacity-50"
                                            title="La clave no se puede modificar una vez creada"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Icono</label>
                                        <div className="flex gap-2">
                                            {iconOptions.map((opt) => {
                                                const OptIcon = opt.icon;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setEditIcon(opt.value)}
                                                        className={`p-3 rounded-xl border-2 transition-all ${editIcon === opt.value ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-muted-foreground'}`}
                                                    >
                                                        <OptIcon size={20} />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Descripción</label>
                                        <Input 
                                            value={editDescription} 
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            className="h-10 rounded-xl"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <Button variant="outline" size="sm" onClick={() => setEditingId(null)} disabled={loading} className="rounded-xl">
                                        Cancelar
                                    </Button>
                                    <Button size="sm" onClick={() => handleSaveEdit(pm)} disabled={loading} className="rounded-xl gap-2">
                                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        Guardar
                                    </Button>
                                </div>
                            </div>
                        );
                    }
                    
                    return (
                        <div key={pm.id} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${pm.is_active ? 'bg-card border-border' : 'bg-muted/20 border-transparent grayscale'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pm.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                    <IconComp size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-sm">{pm.name}</h4>
                                        <Badge variant="outline" className="text-[9px] font-mono py-0 h-4 border-muted-foreground/30 text-muted-foreground uppercase">{pm.key}</Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{pm.description || 'Sin descripción.'}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {!isDefault && (
                                    <>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => startEdit(pm)}
                                            className="h-8 w-8 p-0 rounded-lg text-blue-500 hover:bg-blue-50"
                                            title="Editar"
                                        >
                                            <Edit2 size={16} />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => handleDelete(pm.id)}
                                            className="h-8 w-8 p-0 rounded-lg text-red-500 hover:bg-red-50"
                                            title="Eliminar permanentemente"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </>
                                )}
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => toggleStatus(pm)}
                                    className={`h-8 w-8 p-0 rounded-lg ${pm.is_active ? 'text-orange-500 hover:bg-orange-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                                    title={pm.is_active ? "Desactivar" : "Activar"}
                                >
                                    {pm.is_active ? <X size={16} /> : <Check size={16} />}
                                </Button>
                            </div>
                        </div>
                    );
                })}
                
                {methods?.length === 0 && !isAdding && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-3xl">
                        <AlertCircle size={32} className="opacity-20 mb-2" />
                        <p className="text-sm font-medium">No hay métodos de pago configurados</p>
                        <p className="text-[11px]">Inicia creando uno para usar en el PDV.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
