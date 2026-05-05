"use client";

import { Sidebar } from "@/components/backend/sidebar";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { user } = useAuth();
    const isClientesPage = pathname.startsWith("/dashboard/clientes");

    // Determine allowed roles for this specific dashboard path
    // Default is admin only for most dashboard things (reports)
    let allowedRoles: ('admin' | 'vendedor' | 'inventario')[] = ['admin'];

    // Clientes is allowed for both
    if (isClientesPage) {
        allowedRoles = ['admin', 'vendedor'];
    }

    // Determine title based on path
    let title = "Reportes";
    if (isClientesPage) title = "Gestión de Clientes";
    else if (pathname.includes("/reportes/ventas")) title = "Reportes de Ventas";
    else if (pathname.includes("/reportes/compras")) title = "Reportes de Compras";
    else if (pathname.includes("/reportes/inventario")) title = "Reportes de Inventario";

    return (
        <ProtectedRoute allowedRoles={allowedRoles} redirectTo="/">
            <div className="flex min-h-screen w-full bg-muted/40">
                {!isClientesPage && <Sidebar />}

                <div className="flex flex-1 flex-col">
                    {!isClientesPage && (
                        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6 lg:h-[60px] lg:px-6">
                            <div className="w-full flex-1">
                                <h1 className="text-lg font-semibold">{title}</h1>
                            </div>
                        </header>
                    )}

                    <main className={cn(
                        "flex flex-1 flex-col overflow-hidden",
                        !isClientesPage && "gap-4 p-4 lg:gap-6 lg:p-6"
                    )}>
                        {children}
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
