"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Package, Lock, User, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(username, password);
        } catch (err: any) {
            setError(err.message || 'Usuario o contraseña incorrectos');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-6">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))] -z-10" />

            <div className="w-full max-w-md">
                {/* Logo y Título */}
                <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-2xl shadow-indigo-500/30 mb-6">
                        <Package size={40} className="text-white" strokeWidth={2.5} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        VKI
                    </h1>
                    <p className="text-sm text-slate-600 font-medium">
                        Sistema de Punto de Venta e Inventario
                    </p>
                </div>

                {/* Card de Login */}
                <div className="bg-white rounded-3xl shadow-2xl shadow-slate-300/50 border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    <div className="p-8">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Iniciar Sesión</h2>
                            <p className="text-sm text-slate-600 mt-1">
                                Ingrese sus credenciales para continuar
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Error Alert */}
                            {error && (
                                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                    <div className="text-sm font-medium">{error}</div>
                                </div>
                            )}

                            {/* Username */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Usuario
                                </label>
                                <div className="relative">
                                    <User
                                        size={18}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-slate-900 font-medium placeholder:text-slate-400"
                                        placeholder="Ingrese su usuario"
                                        required
                                        autoFocus
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Contraseña
                                </label>
                                <div className="relative">
                                    <Lock
                                        size={18}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-slate-900 font-medium placeholder:text-slate-400"
                                        placeholder="Ingrese su contraseña"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        <span>Iniciando sesión...</span>
                                    </>
                                ) : (
                                    <>
                                        <Lock size={20} />
                                        <span>Ingresar al Sistema</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>


                </div>

                {/* Footer */}
                <div className="text-center mt-6 text-xs text-slate-500 animate-in fade-in duration-500 delay-200">
                    <p>© 2026 VKI. Sistema de Gestión Empresarial.</p>
                    <p className="mt-1.5 font-semibold text-slate-400">Powered by VankaiLabs</p>
                </div>
            </div>
        </div>
    );
}
