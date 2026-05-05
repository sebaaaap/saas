"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BarChart3,
    ShoppingBag,
    Package,
    LayoutDashboard,
    LogOut,
    Settings,
    Users,
    Monitor
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
    { href: "/dashboard", label: "Panel de Reportes", icon: LayoutDashboard, roles: ['admin'] },
    { href: "/dashboard/clientes", label: "Clientes", icon: Users, roles: ['admin', 'vendedor'] },
    { href: "/dashboard/reportes/ventas", label: "Reportes de Ventas", icon: BarChart3, roles: ['admin'] },
    { href: "/dashboard/reportes/compras", label: "Reportes de Compras", icon: ShoppingBag, roles: ['admin'] },
    { href: "/dashboard/reportes/inventario", label: "Reportes de Inventario", icon: Package, roles: ['admin'] },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout, isAdmin } = useAuth();

    // Hide sidebar completely on clientes page
    if (pathname.startsWith("/dashboard/clientes")) return null;

    const isReportPage = pathname.startsWith("/dashboard");

    // Filtrar items según el rol del usuario
    const filteredMenuItems = menuItems.filter(item => {
        // Si no hay usuario, no mostrar nada
        if (!user) return false;

        // Verificar si el usuario tiene permiso para este item
        const hasPermission = item.roles.includes(user.role);

        // Si estamos en página de reportes, solo mostrar items de reportes
        if (isReportPage) {
            return hasPermission && item.label.toLowerCase().includes("reportes");
        }

        return hasPermission;
    });

    const handleLogout = () => {
        if (confirm('¿Está seguro que desea cerrar sesión?')) {
            logout();
        }
    };

    return (
        <aside className="hidden h-screen w-64 flex-col border-r bg-card md:flex">
            <div className="flex h-14 items-center border-b px-6">
                <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
                    <span className="h-6 w-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                        <Monitor size={14} />
                    </span>
                    <span>{isAdmin ? "Backend" : "Punto de Venta"}</span>
                </Link>
            </div>


            <div className="flex-1 overflow-auto py-4">
                <nav className="grid items-start px-4 text-sm font-medium gap-1">

                    {filteredMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
                                    isActive && "bg-muted text-primary font-semibold"
                                )}
                            >
                                <Icon size={18} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="border-t p-4 space-y-2">
                {/* Solo admin ve configuración */}
                {isAdmin && !isReportPage && (
                    <Link
                        href="/ajustes"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                    >
                        <Settings size={18} />
                        Configuración
                    </Link>
                )}

                {/* User info encima de cerrar sesión */}
                {user && (
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/40">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">
                                {user.username.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                                {user.full_name || user.username}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                {user.role === 'admin' ? 'Administrador' : 'Vendedor'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Botón de cerrar sesión para todos */}
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={handleLogout}
                >
                    <LogOut size={18} />
                    Cerrar Sesión
                </Button>
            </div>
        </aside>
    );
}
