"use client";

import React, { useState } from "react";
import { ArrowLeft, Clock, Wrench } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { QuotesOtManager } from "@/components/quotes-ot/quotes-ot-manager";

export default function QuotesOtPage() {
    const [activeTab, setActiveTab] = useState("quotes");

    return (
        <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
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
                        <h1 className="text-sm font-bold text-foreground">Taller</h1>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                        <TabsList className="bg-muted/50 border border-border p-1 rounded-xl">
                            <TabsTrigger
                                value="quotes"
                                className="flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                            >
                                <Clock size={14} />
                                Cotizaciones
                            </TabsTrigger>
                            {/* OT_HIDDEN: Pestaña Oculta Temporalmente */}
                            {/* <TabsTrigger
                                value="ots"
                                className="flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                            >
                                <Wrench size={14} />
                                Órdenes de Trabajo
                            </TabsTrigger> */}
                        </TabsList>
                    </Tabs>

                    <div className="w-[100px]" /> {/* Spacer to center tabs */}
                </header>

                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    <Tabs value={activeTab} className="w-full h-full">
                        <TabsContent value="quotes" className="m-0 h-full border-none p-0">
                            <QuotesOtManager type="quote" />
                        </TabsContent>
                        {/* OT_HIDDEN: Contenido de OT Oculto Temporalmente */}
                        {/* <TabsContent value="ots" className="m-0 h-full border-none p-0">
                            <QuotesOtManager type="ot" />
                        </TabsContent> */}
                    </Tabs>
                </main>
            </div>
        </ProtectedRoute>
    );
}
