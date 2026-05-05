"use client";

import PurchasesReport from "@/components/reportesLOVABLE/comprasreporte";

export default function PurchasesReportPage() {
    return (
        <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold tracking-tight">Reporte de Compras</h2>
            <PurchasesReport />
        </div>
    );
}
