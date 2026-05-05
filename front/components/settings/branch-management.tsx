"use client";

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Store, Plus, Search, Edit2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { apiService } from '@/services/apiService';

export function BranchManagement() {
    const { data: branches, isLoading } = useSWR('/branches/', () => apiService.getBranches());
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<any | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        is_active: true,
        is_default: false
    });

    const resetForm = () => {
        setFormData({
            name: '',
            address: '',
            phone: '',
            is_active: true,
            is_default: false
        });
        setEditingBranch(null);
    };

    const handleOpenAdd = () => {
        resetForm();
        setIsAddOpen(true);
    };

    const handleOpenEdit = (branch: any) => {
        setFormData({
            name: branch.name,
            address: branch.address || '',
            phone: branch.phone || '',
            is_active: branch.is_active,
            is_default: branch.is_default
        });
        setEditingBranch(branch);
        setIsAddOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingBranch) {
                await apiService.updateBranch(editingBranch.id, formData);
                toast.success('Sucursal actualizada correctamente');
            } else {
                await apiService.createBranch(formData);
                toast.success('Sucursal creada correctamente');
            }
            setIsAddOpen(false);
            mutate('/branches/');
            // Recargar la ventana para actualizar el BranchSelector si se marcó como default
            if (formData.is_default && typeof window !== "undefined") {
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Error al guardar la sucursal');
        }
    };

    const filteredBranches = branches?.filter((b: any) =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Cargando sucursales...</div>;
    }

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar sucursal..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-10 rounded-xl"
                    />
                </div>

                <Dialog open={isAddOpen} onOpenChange={(open) => {
                    setIsAddOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenAdd} className="h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white gap-2 font-semibold">
                            <Plus size={16} />
                            Nueva Sucursal
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] rounded-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">
                                {editingBranch ? 'Editar Sucursal' : 'Crear Sucursal'}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">Nombre *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="h-10 rounded-xl"
                                    required
                                    placeholder="Ej: Sucursal Centro"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">Dirección</Label>
                                <Input
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="h-10 rounded-xl"
                                    placeholder="Ej: Av. Principal 123"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">Teléfono</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="h-10 rounded-xl"
                                    placeholder="Ej: +569 1234 5678"
                                />
                            </div>
                            
                            <div className="flex items-center justify-between pt-2">
                                <Label className="text-sm font-semibold cursor-pointer">Sucursal Principal (Por defecto)</Label>
                                <input 
                                    type="checkbox" 
                                    checked={formData.is_default}
                                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                                    className="w-4 h-4 accent-purple-600"
                                />
                            </div>
                            
                            <div className="flex items-center justify-between pt-2">
                                <Label className="text-sm font-semibold cursor-pointer">Activa</Label>
                                <input 
                                    type="checkbox" 
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 accent-purple-600"
                                />
                            </div>

                            <Button type="submit" className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold mt-6">
                                {editingBranch ? 'Guardar Cambios' : 'Crear Sucursal'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="divide-y divide-border">
                {filteredBranches.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        No se encontraron sucursales.
                    </div>
                ) : (
                    filteredBranches.map((branch: any) => (
                        <div key={branch.id} className="flex items-center justify-between p-4 sm:p-6 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${branch.is_active ? 'bg-purple-100 text-purple-600' : 'bg-muted text-muted-foreground'}`}>
                                    <Store size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className={`font-bold text-base ${!branch.is_active && 'line-through opacity-50'}`}>
                                            {branch.name}
                                        </h3>
                                        {branch.is_default && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                                <CheckCircle2 size={12} /> Principal
                                            </span>
                                        )}
                                        {!branch.is_active && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                                                Inactiva
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        {branch.address || 'Sin dirección registrada'}
                                    </p>
                                </div>
                            </div>
                            
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleOpenEdit(branch)}
                                className="h-9 rounded-lg gap-2"
                            >
                                <Edit2 size={14} />
                                <span className="hidden sm:inline">Editar</span>
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
