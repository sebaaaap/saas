"use client";

import { useState } from 'react';
import { Settings as SettingsIcon, Building2, Users, ArrowLeft, ShieldCheck, ChevronRight, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BusinessInfo } from './business-info';

import { UserManagement } from './user-management';
import { CashRegisterManagement } from './cash-register-management';
import { BranchManagement } from './branch-management';
import { PaymentMethodManagement } from './payment-method-management';
import { ExpenseCategoryManagement } from './expense-category-management';
import { useAuth } from '@/contexts/AuthContext';
import { Monitor, Store, Receipt } from 'lucide-react';

export function SettingsPage() {
    const { isAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState('business');

    return (
        <div className="flex h-screen flex-col bg-background overflow-hidden font-sans">
            {/* Odoo Style Header */}
            <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3 shrink-0">
                <div className="flex items-center gap-3">
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all hover:bg-muted"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Backend
                    </Link>
                    <div className="h-5 w-px bg-border mx-1" />
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <SettingsIcon size={14} />
                        </div>
                        <h1 className="text-sm font-bold text-foreground">Ajustes del Sistema</h1>
                    </div>
                </div>

                {/* Global Search or User Profile could go here */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                        <ShieldCheck size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Conexión Segura</span>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Navigation */}
                <aside className="w-72 border-r border-border bg-card/50 hidden md:flex flex-col">
                    <div className="p-6">
                        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">General</h2>
                        <nav className="space-y-1">
                            <button
                                onClick={() => setActiveTab('business')}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === 'business'
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                    : 'text-muted-foreground hover:bg-muted font-medium'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Building2 size={18} />
                                    <span className="text-sm">Negocio</span>
                                </div>
                                {activeTab === 'business' && <ChevronRight size={14} />}
                            </button>


                        </nav>

                        {isAdmin && (
                            <>
                                <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4 mt-8">Operaciones</h2>
                                <nav className="space-y-1">
                                    <button
                                        onClick={() => setActiveTab('registers')}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === 'registers'
                                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                            : 'text-muted-foreground hover:bg-muted font-medium'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Monitor size={18} />
                                            <span className="text-sm">Cajas y Terminales</span>
                                        </div>
                                        {activeTab === 'registers' && <ChevronRight size={14} />}
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('branches')}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === 'branches'
                                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                            : 'text-muted-foreground hover:bg-muted font-medium'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Store size={18} />
                                            <span className="text-sm">Sucursales</span>
                                        </div>
                                        {activeTab === 'branches' && <ChevronRight size={14} />}
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('payments')}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === 'payments'
                                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                            : 'text-muted-foreground hover:bg-muted font-medium'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <CreditCard size={18} />
                                            <span className="text-sm">Métodos de Pago</span>
                                        </div>
                                        {activeTab === 'payments' && <ChevronRight size={14} />}
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('expenses')}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === 'expenses'
                                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                            : 'text-muted-foreground hover:bg-muted font-medium'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Receipt size={18} />
                                            <span className="text-sm">Categorías de Gasto</span>
                                        </div>
                                        {activeTab === 'expenses' && <ChevronRight size={14} />}
                                    </button>
                                </nav>
                            </>
                        )}

                        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4 mt-8">Seguridad</h2>
                        <nav className="space-y-1">
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === 'users'
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                    : 'text-muted-foreground hover:bg-muted font-medium'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Users size={18} />
                                    <span className="text-sm">Usuarios</span>
                                </div>
                                {activeTab === 'users' && <ChevronRight size={14} />}
                            </button>
                        </nav>
                    </div>

                    <div className="mt-auto p-6 border-t border-border bg-muted/20">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Versión</div>
                        <div className="text-xs font-mono text-muted-foreground/60">v1.2.4-stable (build 2026.02)</div>
                    </div>
                </aside>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto bg-background p-6 md:p-10">
                    <div className="max-w-4xl mx-auto">
                        {activeTab === 'business' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-foreground">Información del Negocio</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Configure los datos principales de su empresa y datos de facturación.</p>
                                </div>
                                <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
                                    <BusinessInfo />
                                </div>
                            </div>
                        )}



                        {activeTab === 'users' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Administre quién tiene acceso y qué permisos posee cada colaborador.</p>
                                </div>
                                <UserManagement />
                            </div>
                        )}

                        {activeTab === 'registers' && isAdmin && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-foreground">Gestión de Cajas</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Configure las terminales físicas para el control de efectivo en el PDV.</p>
                                </div>
                                <CashRegisterManagement />
                            </div>
                        )}

                        {activeTab === 'branches' && isAdmin && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-foreground">Gestión de Sucursales</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Configure las diferentes sucursales físicas donde opera su negocio.</p>
                                </div>
                                <BranchManagement />
                            </div>
                        )}

                        {activeTab === 'payments' && isAdmin && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-foreground">Métodos de Pago</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Administre las formas de pago disponibles en el Punto de Venta.</p>
                                </div>
                                <PaymentMethodManagement />
                            </div>
                        )}

                        {activeTab === 'expenses' && isAdmin && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-foreground">Categorías de Gasto</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Administre las categorías para el registro de gastos rápidos.</p>
                                </div>
                                <ExpenseCategoryManagement />
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
