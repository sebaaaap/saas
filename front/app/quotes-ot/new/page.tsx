"use client"

import React from "react"
import { ServiceEditor } from "@/components/quotes-ot/ServiceEditor"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

export default function NewQuoteOTPage() {
    return (
        <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
            <div className="flex h-screen flex-col bg-background overflow-hidden relative">
                {/* Odoo Style Header */}
                <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/quotes-ot"
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Volver al Tablero
                        </Link>
                        <div className="h-5 w-px bg-border hidden md:block" />
                        <h1 className="text-sm font-bold text-foreground hidden md:block">Nuevo Documento Taller</h1>
                    </div>
                </header>

                {/* Main scrollable area */}
                <main className="flex-1 overflow-y-auto bg-muted/20 p-6 md:p-8 flex justify-center">
                    <ServiceEditor />
                </main>
            </div>
        </ProtectedRoute>
    )
}
