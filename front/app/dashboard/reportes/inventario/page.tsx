"use client";

import InventoryReports from "@/components/reportesLOVABLE/inventarioreporte";

export default function InventoryReportPage() {
    return (
        <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold tracking-tight">Reporte de Inventario</h2>
            <InventoryReports />
        </div>
    );
}
