"use client";

import { useEffect, useState } from 'react';
import { Monitor, Plus, Edit2, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { toast } from 'sonner';

interface CashRegister {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
}

export function CashRegisterManagement() {
    const [registers, setRegisters] = useState<CashRegister[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRegister, setEditingRegister] = useState<CashRegister | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        is_active: true,
    });

    useEffect(() => {
        fetchRegisters();
    }, []);

    const fetchRegisters = async () => {
        setIsLoading(true);
        try {
            const data = await apiService.getRegisters(false); // list all including inactive
            setRegisters(data);
        } catch (error) {
            console.error('Error fetching registers:', error);
            toast.error('Error al cargar las cajas');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                is_active: formData.is_active,
            };

            if (editingRegister) {
                await apiService.updateRegister(editingRegister.id, payload);
                toast.success('Caja actualizada correctamente');
            } else {
                await apiService.createRegister(payload);
                toast.success('Caja creada correctamente');
            }

            setShowModal(false);
            setEditingRegister(null);
            resetForm();
            fetchRegisters();
        } catch (error: any) {
            const message = error.response?.data?.detail || 'Error al guardar caja';
            toast.error(message);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de desactivar esta caja? No se podrá usar para nuevas sesiones.')) {
            try {
                await apiService.deleteRegister(id);
                toast.success('Caja desactivada');
                fetchRegisters();
            } catch (error: any) {
                toast.error(error.response?.data?.detail || 'Error al eliminar');
            }
        }
    };

    const handleEdit = (register: CashRegister) => {
        setEditingRegister(register);
        setFormData({
            name: register.name,
            description: register.description || '',
            is_active: register.is_active,
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            is_active: true,
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-foreground font-outfit uppercase tracking-tight">Cajas y Terminales</h3>
                    <p className="text-xs text-muted-foreground">
                        Gestione las terminales físicas habilitadas para ventas y arqueos.
                    </p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setEditingRegister(null);
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Terminal
                </button>
            </div>

            {/* Registers Table */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="px-5 py-4 text-left text-[11px] font-black text-muted-foreground uppercase tracking-widest">Nombre / Terminal</th>
                                <th className="px-5 py-4 text-left text-[11px] font-black text-muted-foreground uppercase tracking-widest">Descripción</th>
                                <th className="px-5 py-4 text-center text-[11px] font-black text-muted-foreground uppercase tracking-widest">Estado</th>
                                <th className="px-5 py-4 text-right text-[11px] font-black text-muted-foreground uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-5 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                            <p className="text-sm text-muted-foreground font-medium">Cargando terminales...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : registers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-5 py-20 text-center text-muted-foreground">
                                        <Monitor className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                        <p className="font-bold text-foreground">No hay cajas configuradas</p>
                                        <p className="text-sm mt-1">Cree una terminal para comenzar a operar el PDV.</p>
                                    </td>
                                </tr>
                            ) : (
                                registers.map((reg) => (
                                    <tr key={reg.id} className="group border-b border-border/50 last:border-b-0 hover:bg-muted/40 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${reg.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                    <Monitor className="w-5 h-5" />
                                                </div>
                                                <div className="font-bold text-foreground text-sm">{reg.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-muted-foreground">
                                            {reg.description || 'Sin descripción'}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {reg.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-full border border-emerald-200">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Activa
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 text-[10px] font-black uppercase rounded-full border border-red-200">
                                                    <XCircle className="w-3 h-3" />
                                                    Inactiva
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={() => handleEdit(reg)}
                                                    className="p-2 hover:bg-primary/10 hover:text-primary rounded-xl transition-all text-muted-foreground"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(reg.id)}
                                                    disabled={!reg.is_active}
                                                    className={`p-2 rounded-xl transition-all ${reg.is_active ? 'hover:bg-red-100 hover:text-red-500 text-muted-foreground' : 'opacity-20 cursor-not-allowed'}`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Hint */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <p className="text-[11px] text-blue-800 leading-relaxed font-medium capitalize">
                    <strong>Gestión de Terminales:</strong> Estas cajas representan el punto físico donde se maneja dinero. Al abrir una sesión, el sistema vinculará todas las ventas a la terminal seleccionada para facilitar el arqueo diario.
                </p>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-border bg-primary text-primary-foreground">
                            <h3 className="text-lg font-bold">
                                {editingRegister ? 'Editar Terminal' : 'Nueva Terminal de Venta'}
                            </h3>
                            <p className="text-xs opacity-70 mt-1">
                                Identifique la caja física para el control de efectivo.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest px-1">
                                    Nombre de la Caja
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Caja Principal 01"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest px-1">
                                    Descripción / Ubicación
                                </label>
                                <textarea
                                    className="form-input resize-none h-24"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Ej: Mesón principal cerca de la entrada..."
                                />
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border/50">
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        id="active-toggle"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-muted-foreground/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </div>
                                <label htmlFor="active-toggle" className="text-sm font-bold text-foreground font-outfit uppercase tracking-tighter">
                                    Habilitada para Ventas
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingRegister(null);
                                        resetForm();
                                    }}
                                    className="flex-1 px-4 py-3 border border-border rounded-xl text-sm font-bold hover:bg-muted transition-colors opacity-70"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                                >
                                    {editingRegister ? 'Guardar Cambios' : 'Registrar Caja'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
