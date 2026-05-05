"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ClipboardList } from "lucide-react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { VehicleReceptionCard, ReceptionFormData } from "@/components/quotes-ot/VehicleReceptionCard";
import { apiService } from "@/services/apiService";

function ReceptionContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const otId = searchParams.get("id");

    const [loading, setLoading] = useState(true);
    const [initialData, setInitialData] = useState<Partial<ReceptionFormData> | undefined>(undefined);
    const [otInfo, setOtInfo] = useState<{ plate?: string; model?: string } | null>(null);

    useEffect(() => {
        if (!otId) {
            router.push("/quotes-ot");
            return;
        }
        loadData();
    }, [otId]);

    const loadData = async () => {
        if (!otId) return;
        setLoading(true);
        try {
            const res = await apiService.getReception(otId);
            if (res?.data) setInitialData(res.data);

            const orders = await apiService.getActiveWorkOrders();
            const ot = orders.find((o: any) => String(o.id) === String(otId));

            if (ot) {
                const plate = ot.vehicle?.license_plate || "";
                const brand = ot.vehicle?.brand || "";
                const model = ot.vehicle?.model || "";
                const year = ot.vehicle?.year ? String(ot.vehicle.year) : "";
                const type = ot.vehicle?.vehicle_type || "";
                const mileage = ot.mileage ? String(ot.mileage) : "";

                setOtInfo({
                    plate: plate,
                    model: `${brand} ${model}`.trim(),
                });

                // Si no hay datos de recepción guardados, pre-poblamos con los de la OT
                if (!res?.data) {
                    setInitialData({
                        marca: brand,
                        modelo: model,
                        placa: plate,
                        anio: year,
                        tipo: type,
                        km_entrega: mileage,
                        fecha_entrega: new Date().toISOString().split("T")[0]
                    });
                }
            }
        } catch {
            // Manejo de error silencioso
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (data: ReceptionFormData) => {
        if (!otId) return;
        await apiService.saveReception(otId, data);
    };

    return (
        <div className="flex h-screen flex-col bg-background overflow-hidden">
            <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3 shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <Link
                        href="/quotes-ot"
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Volver a OT
                    </Link>
                    <div className="h-5 w-px bg-border hidden md:block" />
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-primary/10 rounded-xl">
                            <ClipboardList size={16} className="text-primary" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-foreground leading-none">
                                Ficha de Recepción del Vehículo
                            </h1>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                {otId
                                    ? `OT-${otId.slice(0, 4).toUpperCase()}${otInfo?.plate ? ` · ${otInfo.plate}` : ""}${otInfo?.model ? ` · ${otInfo.model}` : ""}`
                                    : "Cargando..."}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto bg-muted/30 p-5 md:p-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                        <Loader2 size={36} className="animate-spin text-primary" />
                        <p className="text-sm font-semibold">Cargando ficha...</p>
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto">
                        <VehicleReceptionCard
                            otId={otId || "demo"}
                            initialData={initialData}
                            onSave={handleSave}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}

export default function ReceptionPage() {
    return (
        <ProtectedRoute allowedRoles={["admin", "vendedor"]}>
            <Suspense fallback={<div>Cargando...</div>}>
                <ReceptionContent />
            </Suspense>
        </ProtectedRoute>
    );
}
