"use client";

import { useEffect, useState } from 'react';
import { Users, Plus, Edit2, Trash2, Mail, Phone, Shield, CheckCircle, XCircle, Key, MapPin } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface User {
    id: string;
    username: string;
    full_name: string;
    email: string;
    phone: string;
    role: 'admin' | 'vendedor' | 'inventario';
    is_active: boolean;
    branch_id?: string | null;
}

interface Branch {
    id: string;
    name: string;
}

export function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [formData, setFormData] = useState({
        username: '',
        fullName: '',
        email: '',
        phone: '',
        password: '',
        role: 'vendedor' as 'admin' | 'vendedor' | 'inventario',
        isActive: true,
        branchId: '' as string,
    });

    useEffect(() => {
        fetchUsers();
        fetchBranches();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/users/');
            setUsers(res.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Error al cargar usuarios');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await api.get('/branches/');
            setBranches(res.data);
        } catch (e) {
            console.error('Error fetching branches:', e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const payload = {
                username: formData.username,
                full_name: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                role: formData.role,
                is_active: formData.isActive,
                branch_id: formData.role === 'vendedor' && formData.branchId ? formData.branchId : null,
                ...(formData.password && { password: formData.password })
            };

            if (editingUser) {
                await api.put(`/users/${editingUser.id}`, payload);
                toast.success('Usuario actualizado correctamente');
            } else {
                if (!formData.password) {
                    toast.error('La contraseña es obligatoria para nuevos usuarios');
                    return;
                }
                await api.post('/users/', { ...payload, password: formData.password });
                toast.success('Usuario creado correctamente');
            }

            setShowModal(false);
            setEditingUser(null);
            resetForm();
            fetchUsers();
        } catch (error: any) {
            const message = error.response?.data?.detail || 'Error al guardar usuario';
            toast.error(message);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar este usuario?')) {
            try {
                await api.delete(`/users/${id}`);
                toast.success('Usuario eliminado');
                fetchUsers();
            } catch (error: any) {
                toast.error(error.response?.data?.detail || 'Error al eliminar');
            }
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            fullName: user.full_name,
            email: user.email || '',
            phone: user.phone || '',
            password: '', // No cargamos la contraseña por seguridad
            role: user.role,
            isActive: user.is_active,
            branchId: user.branch_id || '',
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            username: '',
            fullName: '',
            email: '',
            phone: '',
            password: '',
            role: 'vendedor',
            isActive: true,
            branchId: '',
        });
    };

    const getRoleBadge = (role: string) => {
        const badges = {
            admin: 'bg-primary/10 text-primary border-primary/20',
            vendedor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            inventario: 'bg-blue-100 text-blue-700 border-blue-200',
        };
        return badges[role as keyof typeof badges] || badges.vendedor;
    };

    const getRoleLabel = (role: string) => {
        const labels = {
            admin: 'Administrador',
            vendedor: 'Vendedor (PDV)',
            inventario: 'Bodeguero',
        };
        return labels[role as keyof typeof labels] || role;
    };

    return (
        <div className="space-y-6">
            {/* Header Context */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-foreground">Equipo de Trabajo</h3>
                    <p className="text-xs text-muted-foreground">
                        Gestión de cuentas de acceso y niveles de permiso.
                    </p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setEditingUser(null);
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Usuario
                </button>
            </div>

            {/* Users Table */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="table-header text-left">Colaborador</th>
                                <th className="table-header text-left">Rol / Permisos</th>
                                <th className="table-header text-left">Sucursal</th>
                                <th className="table-header text-center whitespace-nowrap">Estado Acceso</th>
                                <th className="table-header w-24 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-20 text-center">
                                        <div className="flex justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        </div>
                                        <p className="text-sm mt-4 text-muted-foreground">Cargando equipo...</p>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-20 text-center text-muted-foreground">
                                        <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                        <p className="font-semibold">No hay usuarios activos</p>
                                        <p className="text-sm mt-1">Cree una cuenta para permitir el acceso al sistema.</p>
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="group border-b border-border/50 last:border-b-0 hover:bg-muted/40 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <img
                                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=random&color=fff`}
                                                        alt={user.full_name}
                                                        className="w-11 h-11 rounded-full object-cover border-2 border-background shadow-sm"
                                                    />
                                                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-foreground text-sm leading-tight">
                                                        {user.full_name || user.username}
                                                        <span className="ml-2 text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">@{user.username}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                                                            <Mail className="w-3 h-3" />
                                                            {user.email || 'Sin correo'}
                                                        </div>
                                                        {user.phone && (
                                                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium border-l border-border pl-3">
                                                                <Phone className="w-3 h-3" />
                                                                {user.phone}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getRoleBadge(user.role)}`}>
                                                <Shield className="w-3 h-3" />
                                                {getRoleLabel(user.role)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            {user.branch_id ? (
                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                                                    <MapPin className="w-3 h-3 text-primary" />
                                                    {branches.find(b => b.id === user.branch_id)?.name || 'Asignada'}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-muted-foreground/50 italic">Sin asignar</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {user.is_active ? (
                                                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                    <span>HABILITADO</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-red-500">
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    <span>BLOQUEADO</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-2 hover:bg-primary/10 hover:text-primary rounded-xl transition-all text-muted-foreground"
                                                    title="Editar Perfil"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-2 hover:bg-red-100 hover:text-red-500 rounded-xl transition-all text-muted-foreground"
                                                    title="Eliminar Cuenta"
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

            {/* Info Warning */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex gap-3 items-start">
                <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>Aviso de Seguridad:</strong> Los usuarios con rol de <i>Administrador</i> tienen acceso total a todas las funciones financieras y de configuración. Evite compartir claves de acceso.
                </p>
            </div>

            {/* Modal User Form */}
            {showModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full border border-border overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-border bg-primary">
                            <h3 className="text-lg font-bold text-primary-foreground">
                                {editingUser ? 'Actualizar Colaborador' : 'Nueva Ficha de Usuario'}
                            </h3>
                            <p className="text-xs text-primary-foreground/70 mt-1">
                                Configure los accesos y credenciales de su equipo.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-muted-foreground uppercase px-1">
                                        Usuario (Login)
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        disabled={!!editingUser}
                                        className="form-input disabled:opacity-50"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        placeholder="Ej: jperez"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-muted-foreground uppercase px-1">
                                        {editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña de Acceso'}
                                    </label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                                        <input
                                            type="password"
                                            required={!editingUser}
                                            className="form-input pl-9"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase px-1">
                                    Nombre Completo
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="form-input"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    placeholder="Ej: Juan Pérez"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-muted-foreground uppercase px-1">
                                        Email Corporativo
                                    </label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="juan@empresa.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-muted-foreground uppercase px-1">
                                        Teléfono Móvil
                                    </label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+56 9 1234 5678"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase px-1">
                                    Nivel de Acceso (Rol)
                                </label>
                                <select
                                    className="form-input"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any, branchId: '' })}
                                >
                                    <option value="vendedor">Vendedor (Solo PDV)</option>
                                    <option value="inventario">Inventario (Control Stock)</option>
                                    <option value="admin">Administrador (Control Total)</option>
                                </select>
                            </div>

                            {/* Sucursal: solo visible si es vendedor */}
                            {formData.role === 'vendedor' && (
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-muted-foreground uppercase px-1 flex items-center gap-1.5">
                                        <MapPin className="w-3 h-3" /> Sucursal Asignada
                                    </label>
                                    <select
                                        className="form-input"
                                        value={formData.branchId}
                                        onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                                    >
                                        <option value="">-- Sin sucursal asignada --</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-muted-foreground px-1">El vendedor verá el inventario de esta sucursal en el PDV al iniciar sesión.</p>
                                </div>
                            )}

                            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border/50">
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-muted-foreground/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </div>
                                <label htmlFor="is_active" className="text-sm font-semibold text-foreground">
                                    Habilitar inicio de sesión
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingUser(null);
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
                                    {editingUser ? 'Guardar Cambios' : 'Crear Cuenta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
