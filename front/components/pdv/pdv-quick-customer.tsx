"use client";

import React, { useState, useRef, useEffect } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiService } from "@/services/apiService";
import { toast } from "sonner";
import { Loader2, ArrowRight, Check, X, Search } from "lucide-react";
import api from "@/lib/api";

// ── Tipos de vehículo con emoji ────────────────────────────────────────────

const VEHICLE_TYPES = [
    { value: "automovil",   emoji: "🚗", label: "Auto" },
    { value: "camioneta",   emoji: "🚙", label: "Camioneta" },
    { value: "camion",      emoji: "🚛", label: "Camión" },
    { value: "motocicleta", emoji: "🏍️", label: "Moto" },
    { value: "furgon",      emoji: "🚐", label: "Furgón" },
    { value: "otro",        emoji: "🚘", label: "Otro" },
];

// ── Pasos del wizard ───────────────────────────────────────────────────────

type Step = "plate" | "details" | "success";

interface QuickCreateResult {
    created: boolean;
    customer: {
        id: string;
        name: string;
        phone?: string;
        email?: string;
        rut: string;
        vehicles: { id: string; license_plate: string; vehicle_type: string }[];
    };
}

interface PdvQuickCustomerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (customer: any) => void;
}

export function PdvQuickCustomer({ open, onOpenChange, onSuccess }: PdvQuickCustomerProps) {
    const [step, setStep] = useState<Step>("plate");
    const [loading, setLoading] = useState(false);
    const [checkingPlate, setCheckingPlate] = useState(false);
    const [plateExists, setPlateExists] = useState<boolean | null>(null);
    const [existingData, setExistingData] = useState<QuickCreateResult | null>(null);

    const [plate, setPlate] = useState("");
    const [vehicleType, setVehicleType] = useState("automovil");
    const [customerName, setCustomerName] = useState("");
    const [contact, setContact] = useState("");

    const plateRef = useRef<HTMLInputElement>(null);

    // Reset al abrir
    useEffect(() => {
        if (open) {
            setStep("plate");
            setPlate("");
            setVehicleType("automovil");
            setCustomerName("");
            setContact("");
            setPlateExists(null);
            setExistingData(null);
            setTimeout(() => plateRef.current?.focus(), 100);
        }
    }, [open]);

    // Buscar patente en tiempo real (debounce)
    useEffect(() => {
        if (plate.length < 5) { setPlateExists(null); return; }
        const timer = setTimeout(async () => {
            setCheckingPlate(true);
            try {
                const res = await api.get(`/customers/vehicles/plate/${plate.toUpperCase()}/history`);
                if (res.data?.customer) {
                    setPlateExists(true);
                    setExistingData({
                        created: false,
                        customer: {
                            id: res.data.customer.id,
                            name: res.data.customer.name,
                            phone: res.data.customer.phone,
                            email: res.data.customer.email,
                            rut: "",
                            vehicles: [{ id: res.data.vehicle.id, license_plate: res.data.vehicle.license_plate, vehicle_type: res.data.vehicle.type }],
                        }
                    });
                }
            } catch {
                setPlateExists(false);
                setExistingData(null);
            } finally {
                setCheckingPlate(false);
            }
        }, 600);
        return () => clearTimeout(timer);
    }, [plate]);

    const handlePlateNext = () => {
        if (plate.length < 4) { toast.error("Ingresa una patente válida"); return; }
        if (plateExists && existingData) {
            // Cliente ya existe — seleccionar directamente
            onSuccess(existingData.customer);
            toast.success(`Cliente encontrado: ${existingData.customer.name}`);
            onOpenChange(false);
            return;
        }
        setStep("details");
    };

    const handleCreate = async () => {
        if (!customerName.trim()) { toast.error("Ingresa el nombre del cliente"); return; }
        if (!contact.trim()) { toast.error("Ingresa un teléfono o email"); return; }

        setLoading(true);
        try {
            const res = await api.post("/customers/quick-create", {
                license_plate: plate,
                vehicle_type: vehicleType,
                customer_name: customerName,
                contact,
            });
            onSuccess(res.data.customer);
            toast.success(res.data.created ? "✅ Cliente y vehículo creados" : "✅ Vehículo encontrado");
            setStep("success");
            setTimeout(() => onOpenChange(false), 1200);
        } catch (e: any) {
            toast.error(e.response?.data?.detail || "Error al crear el cliente");
        } finally {
            setLoading(false);
        }
    };

    const selectedType = VEHICLE_TYPES.find(t => t.value === vehicleType);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border px-6 py-4">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <span className="text-xl">{selectedType?.emoji ?? "🚗"}</span>
                            {step === "plate" ? "Registro Rápido" : step === "details" ? "Datos del Cliente" : "✅ Listo"}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {step === "plate" ? "Ingresa la patente del vehículo" : step === "details" ? "Solo 2 datos más y listo" : ""}
                        </DialogDescription>
                    </DialogHeader>
                    {/* Stepper */}
                    <div className="flex items-center gap-1 mt-3">
                        {["plate", "details"].map((s, i) => (
                            <React.Fragment key={s}>
                                <div className={`h-1.5 flex-1 rounded-full transition-all ${
                                    step === "success" || (step === "details" && i === 0) || (step === "plate" && i === 0 && step === "plate")
                                        ? step === "success" || (step === "details" && i === 0) ? "bg-primary" : "bg-primary/40"
                                        : "bg-muted"
                                }`} />
                                {i < 1 && <div className="w-1" />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {/* ── PASO 1: Patente ──────────────────────────────── */}
                    {step === "plate" && (
                        <>
                            {/* Selector de tipo de vehículo */}
                            <div>
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                                    Tipo de vehículo
                                </Label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {VEHICLE_TYPES.map(t => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => setVehicleType(t.value)}
                                            className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border text-[11px] font-semibold transition-all ${
                                                vehicleType === t.value
                                                    ? "bg-primary/10 border-primary/50 text-primary"
                                                    : "bg-muted/40 border-transparent text-muted-foreground hover:border-border hover:bg-muted"
                                            }`}
                                        >
                                            <span className="text-lg">{t.emoji}</span>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Patente */}
                            <div>
                                <Label htmlFor="plate" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Patente
                                </Label>
                                <div className="relative mt-1.5">
                                    <Input
                                        id="plate"
                                        ref={plateRef}
                                        placeholder="ABCD12 / AB1234"
                                        value={plate}
                                        onChange={e => setPlate(e.target.value.toUpperCase())}
                                        onKeyDown={e => e.key === "Enter" && handlePlateNext()}
                                        className="pr-10 font-mono text-base uppercase tracking-widest h-11 text-center"
                                        maxLength={8}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {checkingPlate && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                        {!checkingPlate && plateExists === true && <Check className="h-4 w-4 text-emerald-500" />}
                                        {!checkingPlate && plateExists === false && plate.length >= 5 && <X className="h-4 w-4 text-muted-foreground" />}
                                    </div>
                                </div>

                                {/* Feedback de búsqueda */}
                                {plateExists === true && existingData && (
                                    <div className="mt-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs">
                                        <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                                            Vehículo encontrado — {existingData.customer.name}
                                        </p>
                                        <p className="text-muted-foreground mt-0.5">
                                            {existingData.customer.phone || existingData.customer.email || "Sin contacto"}
                                        </p>
                                    </div>
                                )}
                                {plateExists === false && plate.length >= 5 && (
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Patente nueva — se creará el registro
                                    </p>
                                )}
                            </div>

                            <Button
                                className="w-full h-11 font-semibold"
                                onClick={handlePlateNext}
                                disabled={plate.length < 4 || checkingPlate}
                            >
                                {plateExists === true ? (
                                    <><Check className="h-4 w-4 mr-2" />Seleccionar cliente</>
                                ) : (
                                    <><ArrowRight className="h-4 w-4 mr-2" />Continuar</>
                                )}
                            </Button>
                        </>
                    )}

                    {/* ── PASO 2: Datos del cliente ───────────────────── */}
                    {step === "details" && (
                        <>
                            {/* Resumen patente */}
                            <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                                <span className="text-xl">{selectedType?.emoji}</span>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground">{selectedType?.label}</p>
                                    <p className="font-mono text-sm font-bold tracking-widest">{plate}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setStep("plate")}
                                    className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
                                >
                                    cambiar
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <Label htmlFor="custName" className="text-xs font-semibold">Nombre del cliente</Label>
                                    <Input
                                        id="custName"
                                        autoFocus
                                        placeholder="Juan Pérez"
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && handleCreate()}
                                        className="mt-1.5 h-10"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="contact" className="text-xs font-semibold">
                                        Teléfono <span className="text-muted-foreground">o</span> Email
                                    </Label>
                                    <Input
                                        id="contact"
                                        placeholder="+569... o nombre@email.com"
                                        value={contact}
                                        onChange={e => setContact(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && handleCreate()}
                                        className="mt-1.5 h-10"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                                <Button variant="outline" className="flex-1" onClick={() => setStep("plate")}>
                                    Atrás
                                </Button>
                                <Button
                                    className="flex-1 font-semibold"
                                    onClick={handleCreate}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    {loading ? "Creando..." : "Crear y Seleccionar"}
                                </Button>
                            </div>
                        </>
                    )}

                    {/* ── PASO 3: Éxito ────────────────────────────────── */}
                    {step === "success" && (
                        <div className="flex flex-col items-center gap-3 py-4">
                            <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <Check className="h-7 w-7 text-emerald-500" />
                            </div>
                            <p className="text-sm font-semibold">¡Cliente registrado!</p>
                            <p className="text-xs text-muted-foreground">Asociado a la orden actual</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
