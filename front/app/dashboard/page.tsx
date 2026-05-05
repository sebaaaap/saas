"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BarChart3, ShoppingBag, Package, TrendingUp } from "lucide-react";

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Panel de Reportes</h2>
                <p className="text-muted-foreground mt-1">
                    Accede a los reportes de tu negocio
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Link href="/dashboard/reportes/ventas">
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <BarChart3 className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Reportes de Ventas</h3>
                                <p className="text-sm text-muted-foreground">
                                    Ventas, caja y rentabilidad
                                </p>
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link href="/dashboard/reportes/compras">
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <ShoppingBag className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Reportes de Compras</h3>
                                <p className="text-sm text-muted-foreground">
                                    Proveedores y movimientos
                                </p>
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link href="/dashboard/reportes/inventario">
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Package className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Reportes de Inventario</h3>
                                <p className="text-sm text-muted-foreground">
                                    Stock y ubicaciones
                                </p>
                            </div>
                        </div>
                    </Card>
                </Link>
            </div>

            <Card className="p-6 bg-muted/50">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">Bienvenido al Panel de Reportes</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Aquí puedes acceder a todos los reportes de tu negocio. Utiliza los filtros de fecha y categoría para obtener información específica. Todos los reportes se actualizan en tiempo real con los datos de tu sistema.
                        </p>
                        <div className="flex gap-2">
                            <Link href="/dashboard/reportes/ventas">
                                <Button size="sm">Ver Reportes de Ventas</Button>
                            </Link>
                            <Link href="/">
                                <Button size="sm" variant="outline">Volver al POS</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
