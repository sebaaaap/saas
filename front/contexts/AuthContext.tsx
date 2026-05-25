"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    username: string;
    full_name: string | null;
    role: 'superadmin' | 'admin' | 'vendedor' | 'inventario';
    id: string;
    branch_id?: string | null;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    isAdmin: boolean;
    isSeller: boolean;
    isInventory: boolean;
    isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');

        console.log("AuthContext: Re-hidratando sesión...", { hasToken: !!storedToken });

        if (storedToken && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setToken(storedToken);
                setUser(parsedUser);
                // Sincronizar cookie de forma inmediata
                document.cookie = `auth_token=${storedToken}; path=/; max-age=43200; SameSite=Lax`;

                // Fetch fresh user data in the background
                fetch(`${API_BASE}/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${storedToken}`,
                        'X-Tenant-ID': 'default',
                    },
                })
                .then(res => res.json())
                .then(freshUser => {
                    if (freshUser && freshUser.username) {
                        localStorage.setItem('auth_user', JSON.stringify(freshUser));
                        setUser(freshUser);
                    }
                })
                .catch(err => console.error("Error refreshing user data:", err));

            } catch (e) {
                console.error("Error al recuperar sesión:", e);
                localStorage.clear();
            }
        }

        // Damos un tiempo extra para que React asiente los estados
        const timer = setTimeout(() => setIsLoading(false), 200);
        return () => clearTimeout(timer);
    }, []);

    const login = async (username: string, password: string) => {
        try {
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Error de autenticación');
            }

            const data = await response.json();

            // Guardar token
            localStorage.setItem('auth_token', data.access_token);
            setToken(data.access_token);

            // Obtener información completa del usuario
            const userResponse = await fetch(`${API_BASE}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${data.access_token}`,
                    'X-Tenant-ID': 'default',
                },
            });

            if (userResponse.ok) {
                const userData = await userResponse.json();
                localStorage.setItem('auth_user', JSON.stringify(userData));
                setUser(userData);

                // Sincronizar con cookie para el middleware
                document.cookie = `auth_token=${data.access_token}; path=/; max-age=43200; SameSite=Lax`;

                // Si el vendedor tiene sucursal asignada, activarla automáticamente
                // Usamos 'branch_id' que es la clave que lee el interceptor en api.ts
                if (userData.branch_id) {
                    localStorage.setItem('branch_id', userData.branch_id);
                }

                // Redirigir según rol
                if (userData.role === 'superadmin') {
                    router.push('/superadmin');
                } else if (userData.role === 'admin') {
                    router.push('/');
                } else {
                    router.push('/');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        // Eliminar cookie
        document.cookie = 'auth_token=; path=/; max-age=0';
        setToken(null);
        setUser(null);
        router.push('/login');
    };

    const isAdmin = user?.role === 'admin';
    const isSeller = user?.role === 'vendedor';
    const isInventory = user?.role === 'inventario';
    const isSuperAdmin = user?.role === 'superadmin';

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                login,
                logout,
                isLoading,
                isAdmin,
                isSeller,
                isInventory,
                isSuperAdmin,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
