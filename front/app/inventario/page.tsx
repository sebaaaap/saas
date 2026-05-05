"use client";

import React, { useState } from "react";
import { Package, MapPin, Settings2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProductsPage } from "@/components/inventory/products-page";
import { LocationsPage } from "@/components/inventory/locations-page";
import { ActionsPage } from "@/components/inventory/actions-page";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState("products");

    return (
        <ProtectedRoute allowedRoles={['admin', 'inventario']}>
            <div className="flex h-screen flex-col bg-background overflow-hidden">
                {/* Odoo Style Header */}
                <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Backend
                        </Link>
                        <div className="h-5 w-px bg-border" />
                        <h1 className="text-sm font-bold text-foreground">Inventario</h1>
                    </div>

                    {/* Navigation Tabs in Navbar */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                        <TabsList className="bg-muted/50 border border-border p-1 rounded-xl">
                            <TabsTrigger
                                value="products"
                                className="flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                            >
                                <Package size={14} />
                                <span>Productos</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="locations"
                                className="flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                            >
                                <MapPin size={14} />
                                <span>Ubicaciones</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="actions"
                                className="flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                            >
                                <Settings2 size={14} />
                                <span>Acciones</span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="w-[100px]" /> {/* Spacer for balance */}
                </header>

                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    <Tabs value={activeTab} className="w-full h-full">
                        <TabsContent value="products" className="m-0 h-full border-none p-0 outline-none">
                            <ProductsPage />
                        </TabsContent>
                        <TabsContent value="locations" className="m-0 h-full border-none p-0 outline-none">
                            <LocationsPage />
                        </TabsContent>
                        <TabsContent value="actions" className="m-0 h-full border-none p-0 outline-none">
                            <ActionsPage />
                        </TabsContent>
                    </Tabs>
                </main>
            </div>
        </ProtectedRoute>
    );
}
