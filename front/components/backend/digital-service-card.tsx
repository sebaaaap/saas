"use client";

import React, { useState } from "react";
import {
    Car,
    Droplet,
    Settings,
    CheckCircle2,
    Printer,
    Calendar,
    Gauge,
    Wrench,
    Clock,
    X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { apiService } from "@/services/apiService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ServiceData {
    engine_oil: string;
    gearbox_oil: string;
    diff_rear: string;
    diff_front: string;
    filters: {
        oil: boolean;
        air: boolean;
        cabin: boolean;
        fuel: boolean;
    };
    greasing: string;
    coolant: string;
    additives: string;
    mileage: string;
    date: string;
}

interface DigitalServiceCardProps {
    vehicle: any;
    data?: ServiceData;
    readOnly?: boolean;
    onSave?: (data: ServiceData) => Promise<void>; // Changed to Promise<void>
    onClose?: () => void;
}

export const DigitalServiceCard: React.FC<DigitalServiceCardProps> = ({
    vehicle,
    data: initialData,
    readOnly = true,
    onSave,
    onClose
}) => {
    const [isEditing, setIsEditing] = useState(!readOnly);
    const [isSaving, setIsSaving] = useState(false);

    const [data, setData] = useState<ServiceData>(initialData || (vehicle?.service_info as ServiceData) || {
        engine_oil: "10W-40",
        gearbox_oil: "-",
        diff_rear: "-",
        diff_front: "-",
        filters: {
            oil: true,
            air: true,
            cabin: false,
            fuel: false
        },
        greasing: "-",
        coolant: "G12 Red",
        additives: "-",
        mileage: "125,400",
        date: new Date().toISOString()
    });

    // Sincronizar estado cuando cambian las props
    React.useEffect(() => {
        if (initialData) {
            setData(initialData);
        } else if (vehicle?.service_info) {
            setData(vehicle.service_info as ServiceData);
        } else {
            // Reset a valores por defecto si no hay info
            setData({
                engine_oil: "-",
                gearbox_oil: "-",
                diff_rear: "-",
                diff_front: "-",
                filters: { oil: false, air: false, cabin: false, fuel: false },
                greasing: "-",
                coolant: "-",
                additives: "-",
                mileage: vehicle?.year?.toString() || "-",
                date: new Date().toISOString()
            });
        }
    }, [vehicle?.id, initialData]);

    const handleFilterToggle = (filter: keyof ServiceData['filters']) => {
        if (!isEditing) return;
        setData(prev => ({
            ...prev,
            filters: {
                ...prev.filters,
                [filter]: !prev.filters[filter]
            }
        }));
    };

    const handlePrint = () => {
        window.print();
    };

    const handleSaveInternal = async () => {
        setIsSaving(true);
        try {
            if (onSave) {
                await onSave(data); // Await onSave
                setIsEditing(false);
                return;
            }

            if (!vehicle?.id) return;

            // Cuando guardamos directamente al vehículo (Historial)
            // Actualizamos tanto el service_info como el kilometraje del vehículo si es necesario
            await apiService.updateVehicle(vehicle.id, {
                service_info: data,
                // Si el kilometraje cambió, podríamos actualizar el campo 'year' o similar si tuviéramos kilometraje en vehiculo
                // De momento lo guardamos dentro del JSON de service_info (que ya está en 'data')
            });
            toast.success("Información de servicio actualizada ✓");
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar la información");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden rounded-3xl border shadow-xl">
            {/* Sticker Header - Physical Look */}
            <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />

                <SheetTitle className="sr-only">Sticker de Lubricentro</SheetTitle> {/* Added hidden SheetTitle */}

                <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                            <Car className="w-7 h-7 text-primary" />
                        </div>
                        <div>
                            <div className="text-2xl font-black font-mono tracking-tighter uppercase">{vehicle?.license_plate}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{vehicle?.brand} {vehicle?.model}</div>
                        </div>
                    </div>
                    {onClose && (
                        <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-white hover:bg-white/10" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    )}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                            <Gauge className="w-3 h-3 text-primary" /> Kilometraje
                        </div>
                        {isEditing ? (
                            <Input
                                value={data.mileage}
                                onChange={(e) => setData({ ...data, mileage: e.target.value })}
                                className="h-8 bg-white/10 border-white/20 text-white font-mono font-bold text-sm rounded-lg"
                                placeholder="KM..."
                            />
                        ) : (
                            <div className="text-lg font-black font-mono">{data.mileage} KM</div>
                        )}
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                            <Calendar className="w-3 h-3 text-emerald-400" /> Último Servicio
                        </div>
                        <div className="text-lg font-black font-mono">{new Date(data.date).toLocaleDateString()}</div>
                    </div>
                </div>
            </div>

            {/* Sticker Body - Grid Layout */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">

                {/* Oils Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <Droplet className="w-4 h-4 text-blue-500" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Lubricantes y Fluidos</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <ServiceField label="Aceite Motor" value={data.engine_oil} readOnly={!isEditing}
                            onChange={(v: string) => setData({ ...data, engine_oil: v })} />
                        <ServiceField label="Caja Cambios" value={data.gearbox_oil} readOnly={!isEditing}
                            onChange={(v: string) => setData({ ...data, gearbox_oil: v })} />
                        <ServiceField label="Diff. Trasero" value={data.diff_rear} readOnly={!isEditing}
                            onChange={(v: string) => setData({ ...data, diff_rear: v })} />
                        <ServiceField label="Diff. Delantero" value={data.diff_front} readOnly={!isEditing}
                            onChange={(v: string) => setData({ ...data, diff_front: v })} />
                    </div>
                </div>

                {/* Filters Section - Pill Style */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <Settings className="w-4 h-4 text-amber-500" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Cambio de Filtros</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <FilterPill label="Aceite" active={data.filters.oil} onClick={() => handleFilterToggle('oil')} readOnly={!isEditing} />
                        <FilterPill label="Aire" active={data.filters.air} onClick={() => handleFilterToggle('air')} readOnly={!isEditing} />
                        <FilterPill label="Cabina" active={data.filters.cabin} onClick={() => handleFilterToggle('cabin')} readOnly={!isEditing} />
                        <FilterPill label="Combustible" active={data.filters.fuel} onClick={() => handleFilterToggle('fuel')} readOnly={!isEditing} />
                    </div>
                </div>

                {/* Additional Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <Wrench className="w-4 h-4 text-emerald-500" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Mantenciones Adicionales</h4>
                    </div>
                    <div className="space-y-3">
                        <ServiceField label="Engrase General" value={data.greasing} readOnly={!isEditing} fullWidth
                            onChange={(v: string) => setData({ ...data, greasing: v })} />
                        <div className="grid grid-cols-2 gap-3">
                            <ServiceField label="Refrigerante" value={data.coolant} readOnly={!isEditing}
                                onChange={(v: string) => setData({ ...data, coolant: v })} />
                            <ServiceField label="Aditivos" value={data.additives} readOnly={!isEditing}
                                onChange={(v: string) => setData({ ...data, additives: v })} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-white border-t space-y-3">
                {isEditing ? (
                    <div className="flex flex-col gap-2">
                        <Button
                            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl gap-2 shadow-lg shadow-primary/20"
                            onClick={handleSaveInternal}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            {isSaving ? "Guardando..." : "Guardar Información"}
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full text-slate-500 font-bold"
                            onClick={() => setIsEditing(false)}
                            disabled={isSaving}
                        >
                            Cancelar
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <Button
                            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl gap-2 shadow-lg shadow-slate-200"
                            onClick={handlePrint}
                        >
                            <Printer className="w-5 h-5" /> Imprimir Sticker
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full h-12 border-2 border-slate-200 font-black rounded-2xl gap-2 hover:bg-slate-50"
                            onClick={() => setIsEditing(true)}
                        >
                            <Settings className="w-5 h-5" /> Modificar Datos Base
                        </Button>
                        <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            <Clock className="w-3 h-3" /> Solo Lectura - Modo Historial
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface ServiceFieldProps {
    label: string;
    value: string;
    readOnly: boolean;
    onChange: (v: string) => void;
    fullWidth?: boolean;
}

const ServiceField = ({ label, value, readOnly, onChange, fullWidth = false }: ServiceFieldProps) => (
    <div className={cn("space-y-1", fullWidth ? "w-full" : "")}>
        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
            {label}
        </label>
        {readOnly ? (
            <div className="px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold text-slate-700 border border-slate-200/50">
                {value || "-"}
            </div>
        ) : (
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-10 bg-white border-slate-200 rounded-xl font-bold text-sm"
            />
        )}
    </div>
);

interface FilterPillProps {
    label: string;
    active: boolean;
    onClick: () => void;
    readOnly: boolean;
}

const FilterPill = ({ label, active, onClick, readOnly }: FilterPillProps) => (
    <button
        type="button"
        disabled={readOnly}
        onClick={onClick}
        className={cn(
            "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-2",
            active
                ? "bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-100"
                : "bg-slate-100 border-slate-200 text-slate-400"
        )}
    >
        {active && <CheckCircle2 className="w-3 h-3" />}
        {label}
    </button>
);
