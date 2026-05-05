"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: ('admin' | 'vendedor' | 'inventario')[];
    redirectTo?: string;
}

export function ProtectedRoute({
    children,
    allowedRoles = ['admin', 'vendedor', 'inventario'],
    redirectTo = '/'
}: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

        // Si no hay usuario NI token en disco, expulsar
        if (!user && !storedToken) {
            console.log("ProtectedRoute: Ni usuario ni token encontrados, redirigiendo a login...");
            router.push('/login');
            return;
        }

        // Si hay token pero el usuario aún no se ha cargado en el contexto,
        // esperamos al siguiente ciclo de renderizado en lugar de expulsar.
        if (!user && storedToken) {
            console.log("ProtectedRoute: Token en disco pero usuario ausente en contexto, esperando...");
            return;
        }

        // Si hay usuario, verificar permisos
        if (user && allowedRoles && !allowedRoles.includes(user.role)) {
            console.log("ProtectedRoute: Rol no permitido, redirigiendo...");
            router.push(redirectTo);
        }
    }, [user, isLoading, router, allowedRoles, redirectTo]);

    // Mostrar loader mientras se verifica la autenticación
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <Loader2 size={48} className="animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Verificando autenticación...</p>
                </div>
            </div>
        );
    }

    // Si no hay usuario, no renderizar nada (el useEffect redirigirá)
    if (!user) {
        return null;
    }

    // Si el usuario no tiene el rol permitido, no renderizar
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return null;
    }

    return <>{children}</>;
}
