"use client";

import React, { useState } from "react";
import { BarChart3, ShoppingBag, Package, TrendingUp, FileText, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PosReports from "@/components/reportesLOVABLE/puntodeventareporte";
import InventoryReports from "@/components/reportesLOVABLE/inventarioreporte";
import PurchasesReport from "@/components/reportesLOVABLE/comprasreporte";

export default function ReportesModule() {
    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
                    <p className="text-muted-foreground mt-1">
                        Ventas, compras e inventario
                    </p>
                </div>
            </div>

            <Tabs defaultValue="ventas" className="space-y-6">
                <TabsList className="bg-muted border border-border">
                    <TabsTrigger value="ventas" className="gap-2 data-[state=active]:shadow-sm">
                        <BarChart3 size={14} />
                        <span>Ventas</span>
                    </TabsTrigger>
                    <TabsTrigger value="inventario" className="gap-2 data-[state=active]:shadow-sm">
                        <Package size={14} />
                        <span>Inventario</span>
                    </TabsTrigger>
                    <TabsTrigger value="compras" className="gap-2 data-[state=active]:shadow-sm">
                        <ShoppingBag size={14} />
                        <span>Compras</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="ventas">
                    <PosReports />
                </TabsContent>

                <TabsContent value="inventario">
                    <InventoryReports />
                </TabsContent>

                <TabsContent value="compras">
                    <PurchasesReport />
                </TabsContent>
            </Tabs>
        </div>
    );
}
