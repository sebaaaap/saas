"use client";

import PosReports from "@/components/reportesLOVABLE/puntodeventareporte";

export default function SalesReportPage() {
    return (
        <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold tracking-tight">Reporte de Ventas, Caja y Rentabilidad</h2>
            <PosReports />
        </div>
    );
}
