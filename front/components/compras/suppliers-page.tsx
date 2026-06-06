"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, Edit, X, Users, Building2, Phone, Mail, FileText } from "lucide-react";

interface Supplier {
    id: string;
    name: string;
    tax_id?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        tax_id: "",
        email: "",
        phone: "",
        address: "",
        notes: "",
    });

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const getHeaders = () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        return {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
        };
    };

    const fetchSuppliers = async () => {
        try {
            const res = await fetch(`${API_BASE}/suppliers/`, { headers: getHeaders() });
            if (res.ok) setSuppliers(await res.json());
        } catch (e) {
            console.error("Error fetching suppliers", e);
        }
    };

    const resetForm = () => {
        setFormData({ name: "", tax_id: "", email: "", phone: "", address: "", notes: "" });
        setIsCreating(false);
        setEditingId(null);
    };

    const openCreate = () => {
        resetForm();
        setIsCreating(true);
    };

    const openEdit = (s: Supplier) => {
        setEditingId(s.id);
        setFormData({
            name: s.name,
            tax_id: s.tax_id || "",
            email: s.email || "",
            phone: s.phone || "",
            address: s.address || "",
            notes: s.notes || "",
        });
        setIsCreating(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        const url = editingId
            ? `${API_BASE}/suppliers/${editingId}`
            : `${API_BASE}/suppliers/`;
        const method = editingId ? "PUT" : "POST";

        try {
            const body: any = { name: formData.name.trim() };
            if (formData.tax_id) body.tax_id = formData.tax_id;
            if (formData.email) body.email = formData.email;
            if (formData.phone) body.phone = formData.phone;
            if (formData.address) body.address = formData.address;
            if (formData.notes) body.notes = formData.notes;

            const res = await fetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify(body),
            });

            if (res.ok) {
                alert(editingId ? "Proveedor actualizado" : "Proveedor creado");
                resetForm();
                fetchSuppliers();
            } else {
                const err = await res.json();
                alert("Error: " + (err.detail || "Error desconocido"));
            }
        } catch {
            alert("Error de conexión");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este proveedor?")) return;
        try {
            const res = await fetch(`${API_BASE}/suppliers/${id}`, { method: "DELETE", headers: getHeaders() });
            if (res.ok) {
                fetchSuppliers();
            } else {
                const err = await res.json();
                alert(err.detail || "Error al eliminar");
            }
        } catch { }
    };

    const filtered = suppliers.filter(
        (s) =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.tax_id && s.tax_id.includes(searchTerm))
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                <div>
                    <h2 className="text-lg font-bold text-foreground">Directorio de Proveedores</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Gestione contactos y datos fiscales de sus proveedores.
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o RUT..."
                            className="form-input pl-11"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                    >
                        <Plus size={16} />
                        <span>Nuevo Proveedor</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="table-header">Proveedor</th>
                                <th className="table-header">RUT / Tax ID</th>
                                <th className="table-header">Contacto</th>
                                <th className="table-header">Dirección</th>
                                <th className="table-header w-24 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((s) => (
                                <tr
                                    key={s.id}
                                    className="group border-b border-border/50 last:border-b-0 hover:bg-muted/40 transition-colors"
                                >
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <Building2 size={16} />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-foreground text-sm block">{s.name}</span>
                                                {s.notes && (
                                                    <span className="text-[10px] text-muted-foreground truncate max-w-[200px] block">
                                                        {s.notes}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        {s.tax_id ? (
                                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded-lg border border-border text-muted-foreground">
                                                {s.tax_id}
                                            </code>
                                        ) : (
                                            <span className="text-xs text-muted-foreground/50 italic">Sin RUT</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex flex-col gap-1">
                                            {s.email && (
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Mail size={12} />
                                                    <span>{s.email}</span>
                                                </div>
                                            )}
                                            {s.phone && (
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Phone size={12} />
                                                    <span>{s.phone}</span>
                                                </div>
                                            )}
                                            {!s.email && !s.phone && (
                                                <span className="text-xs text-muted-foreground/50 italic">Sin datos</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-muted-foreground max-w-[200px] truncate">
                                        {s.address || <span className="text-muted-foreground/50 italic text-xs">—</span>}
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEdit(s)}
                                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                                title="Editar"
                                            >
                                                <Edit size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(s.id)}
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

                {filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                        <Users size={56} strokeWidth={1} className="mb-4 opacity-40" />
                        <p className="text-lg font-medium">No se encontraron proveedores</p>
                        <p className="text-sm mt-1 opacity-70">Registre un nuevo proveedor para comenzar</p>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Header */}
                        <div className="px-8 py-5 border-b border-border flex justify-between items-center bg-primary rounded-t-2xl">
                            <div>
                                <h2 className="text-lg font-bold text-primary-foreground">
                                    {editingId ? "Editar Proveedor" : "Nuevo Proveedor"}
                                </h2>
                                <p className="text-xs text-primary-foreground/70">
                                    {editingId ? "Actualice la información del contacto." : "Registre un nuevo contacto de abastecimiento."}
                                </p>
                            </div>
                            <button
                                onClick={resetForm}
                                className="p-2 rounded-lg text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                            {/* Name */}
                            <div>
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2">
                                    Razón Social / Nombre *
                                </label>
                                <input
                                    className="form-input"
                                    placeholder="Ej: Distribuidora Nacional SpA"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Tax ID */}
                                <div>
                                    <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2">
                                        RUT / Tax ID
                                    </label>
                                    <div className="relative">
                                        <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            className="form-input pl-10 font-mono"
                                            placeholder="76.123.456-7"
                                            value={formData.tax_id}
                                            onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2">
                                        Teléfono
                                    </label>
                                    <div className="relative">
                                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            className="form-input pl-10"
                                            placeholder="+56 9 1234 5678"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2">
                                    Correo Electrónico
                                </label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="email"
                                        className="form-input pl-10"
                                        placeholder="contacto@proveedor.cl"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2">
                                    Dirección
                                </label>
                                <input
                                    className="form-input"
                                    placeholder="Av. Principal 123, Santiago"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2">
                                    Notas / Observaciones
                                </label>
                                <textarea
                                    className="form-input h-20 resize-none"
                                    placeholder="Información adicional sobre el proveedor..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-6 py-2.5 text-sm font-semibold rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                                >
                                    {editingId ? "Guardar Cambios" : "Registrar Proveedor"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
