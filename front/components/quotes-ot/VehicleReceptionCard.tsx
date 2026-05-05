"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
    CheckCircle, XCircle, Minus, Save, FileDown,
    RotateCcw, ClipboardList, User, Car, Calendar,
    Navigation, AlertCircle, ArrowRightLeft, Check,
    Truck, LogIn, LogOut, MapPin, Fuel
} from "lucide-react";
import { VehicleDiagram, DamageMarker } from "./VehicleDiagram";
import { FuelGauge } from "./FuelGauge";
import { DamageModal } from "./DamageModal";
import { toast } from "sonner";
import { apiService } from "@/services/apiService";
import { useAuth } from "@/contexts/AuthContext";
import { ReceptionDocumentTemplate } from "./ReceptionDocumentTemplate";

// ─── Types ─────────────────────────────────────────────────────────────────────

type CheckStatus = "good" | "bad" | "na" | null;

interface ChecklistItem {
    id: string;
    label: string;
    status: CheckStatus;
}

interface ChecklistGroup {
    title: string;
    items: ChecklistItem[];
}

export interface ReceptionFormData {
    // Cabecera
    marca: string;
    color: string;
    modelo: string;
    tipo: string;
    placa: string;
    anio: string;
    km_entrega: string;
    km_devolucion: string;
    fecha_entrega: string;
    fecha_devolucion: string;
    funcionario_entrega: string;
    funcionario_recibe: string;
    licencia_entrega: string;
    licencia_recibe: string;
    // Daños
    markers: DamageMarker[];
    // Checklist
    checklist: ChecklistGroup[];
    // Combustible
    fuel_level: number;
    // Observaciones
    observaciones: string;
}

// ─── Initial Checklist Data ──────────────────────────────────────────────────

const INITIAL_CHECKLIST: ChecklistGroup[] = [
    {
        title: "Exteriores",
        items: [
            { id: "luces_principales", label: "Luces principales", status: null },
            { id: "luz_media", label: "Luz media", status: null },
            { id: "luz_stop_guiadores", label: "Luz stop – guiadores", status: null },
            { id: "antena_radio", label: "Antena de radio", status: null },
            { id: "limpiaparabrisas", label: "Un par de limpia parabrisas", status: null },
            { id: "espejo_lateral_izq", label: "Espejo lateral izquierdo", status: null },
            { id: "espejo_lateral_der", label: "Espejo lateral derecho", status: null },
            { id: "vidrios_laterales", label: "Vidrios laterales", status: null },
            { id: "parabrisas_ventana_trasera", label: "Parabrisas y ventana trasera", status: null },
            { id: "tapones_llanta", label: "4 tapones de llanta", status: null },
            { id: "tapon_gasolina", label: "Tapón de gasolina", status: null },
            { id: "carroceria_delantero", label: "Carrocería delantero", status: null },
            { id: "carroceria_trasero", label: "Carrocería trasero", status: null },
            { id: "placas_delantera_trasera", label: "Placas delantera y trasera", status: null },
        ],
    },
    {
        title: "Interiores",
        items: [
            { id: "calefaccion", label: "Calefacción", status: null },
            { id: "radio_cd", label: "Radio-CD", status: null },
            { id: "bocinas", label: "Bocinas", status: null },
            { id: "encendedor", label: "Encendedor", status: null },
            { id: "espejo_retrovisor", label: "Espejo retrovisor", status: null },
            { id: "ceniceros", label: "Ceniceros", status: null },
            { id: "cinturones", label: "Cinturones", status: null },
            { id: "manijas_vidrios", label: "Manijas de vidrios", status: null },
            { id: "pisos_goma", label: "Pisos de goma", status: null },
            { id: "tapetes", label: "Tapetes", status: null },
            { id: "funda_asientos", label: "Funda de asientos", status: null },
            { id: "jalador_puertas", label: "Jalador de puertas", status: null },
            { id: "sujetador_manos", label: "Sujetador de manos", status: null },
        ],
    },
    {
        title: "Accesorios",
        items: [
            { id: "gata", label: "Gata", status: null },
            { id: "estuche_llaves", label: "Estuche de llaves", status: null },
            { id: "triangulo", label: "Triángulo", status: null },
            { id: "llanta_auxilio", label: "Llanta de auxilio", status: null },
            { id: "extintor", label: "Extintor", status: null },
            { id: "botiquin", label: "Botiquín", status: null },
        ],
    },
];

// ─── Sub-Components ──────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
    return (
        <div className="flex items-center gap-3 mb-6 p-1">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shadow-sm">
                <Icon size={20} strokeWidth={2.5} />
            </div>
            <div>
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">{title}</h3>
                {subtitle && <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{subtitle}</p>}
            </div>
        </div>
    );
}

function StatusButtons({ status, onSetStatus }: { status: CheckStatus; onSetStatus: (s: CheckStatus) => void }) {
    return (
        <div className="flex items-center gap-1.5 p-1.5 bg-muted/30 rounded-2xl border border-transparent hover:border-border/60 transition-all">
            <button
                onClick={() => onSetStatus(status === "good" ? null : "good")}
                className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all shadow-sm ${status === "good"
                    ? "bg-green-500 text-white translate-y-[-1px] shadow-lg shadow-green-500/20"
                    : "bg-card text-muted-foreground hover:bg-green-50 hover:text-green-600"
                    }`}
            >
                <CheckCircle size={18} />
            </button>
            <button
                onClick={() => onSetStatus(status === "bad" ? null : "bad")}
                className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all shadow-sm ${status === "bad"
                    ? "bg-red-500 text-white translate-y-[-1px] shadow-lg shadow-red-500/20"
                    : "bg-card text-muted-foreground hover:bg-red-50 hover:text-red-600"
                    }`}
            >
                <XCircle size={18} />
            </button>
            <button
                onClick={() => onSetStatus(status === "na" ? null : "na")}
                className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all shadow-sm ${status === "na"
                    ? "bg-slate-400 text-white translate-y-[-1px] shadow-lg shadow-slate-500/20"
                    : "bg-card text-muted-foreground hover:bg-slate-100 hover:text-slate-600"
                    }`}
            >
                <Minus size={18} />
            </button>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface VehicleReceptionCardProps {
    otId: string;
    initialData?: Partial<ReceptionFormData>;
    onSave?: (data: ReceptionFormData) => Promise<void>;
}

export function VehicleReceptionCard({ otId, initialData, onSave }: VehicleReceptionCardProps) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<"reception" | "dispatch">("reception");

    const [form, setForm] = useState<ReceptionFormData>(() => ({
        marca: "",
        color: "",
        modelo: "",
        tipo: "Sedán",
        placa: "",
        anio: "",
        km_entrega: "",
        km_devolucion: "",
        fecha_entrega: new Date().toISOString().split("T")[0],
        fecha_devolucion: "",
        funcionario_entrega: "",
        funcionario_recibe: "",
        licencia_entrega: "",
        licencia_recibe: "",
        markers: [],
        checklist: INITIAL_CHECKLIST,
        fuel_level: 50,
        observaciones: "",
        ...initialData,
    }));

    const [saving, setSaving] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);

    // Auto-fill user detection
    useEffect(() => {
        if (user) {
            const currentName = user.full_name || user.username;
            if (activeTab === "reception" && !form.funcionario_recibe) {
                setForm(prev => ({ ...prev, funcionario_recibe: currentName }));
            } else if (activeTab === "dispatch" && !form.funcionario_entrega) {
                setForm(prev => ({ ...prev, funcionario_entrega: currentName }));
            }
        }
    }, [user, activeTab, form.funcionario_recibe, form.funcionario_entrega]);

    // Damage modal state
    const [damageModal, setDamageModal] = useState<{
        marker: DamageMarker | null;
        tempCoords: { x: number; y: number; view: "top" | "front" | "rear" | "left" | "right"; detectedZone?: string } | null;
    } | null>(null);

    // ── Field updater ────────────────────────────────────
    const setField = <K extends keyof ReceptionFormData>(key: K, value: ReceptionFormData[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    // ── Checklist updater ────────────────────────────────
    const updateCheckStatus = useCallback(
        (groupIdx: number, itemId: string, status: CheckStatus) => {
            setForm((prev) => {
                const checklist = prev.checklist.map((grp, gi) =>
                    gi !== groupIdx
                        ? grp
                        : {
                            ...grp,
                            items: grp.items.map((item) =>
                                item.id === itemId ? { ...item, status } : item
                            ),
                        }
                );
                return { ...prev, checklist };
            });
        },
        []
    );

    // ── Damage markers ───────────────────────────────────
    const handleAddMarker = useCallback(
        (coords: { x: number; y: number }, view: "top" | "front" | "rear" | "left" | "right", detectedZone?: string) => {
            setDamageModal({ marker: null, tempCoords: { ...coords, view, detectedZone } });
        },
        []
    );

    const handleClickMarker = useCallback((marker: DamageMarker) => {
        setDamageModal({ marker, tempCoords: null });
    }, []);

    const handleSaveDamage = (data: { note: string; photo_url?: string; zone: string }, markerId?: string) => {
        if (markerId) {
            setForm((prev) => ({
                ...prev,
                markers: prev.markers.map((m) => (m.id === markerId ? { ...m, ...data } : m)),
            }));
        } else if (damageModal?.tempCoords) {
            const newMarker: DamageMarker = {
                id: Math.random().toString(36).substr(2, 9),
                ...data,
                coords: { x: damageModal.tempCoords.x, y: damageModal.tempCoords.y },
                view: damageModal.tempCoords.view,
                type: activeTab, // Record whether it was found during reception or dispatch
            };
            setForm((prev) => ({ ...prev, markers: [...prev.markers, newMarker] }));
        }
        setDamageModal(null);
    };

    const handleDeleteDamage = (markerId: string) => {
        setForm((prev) => ({
            ...prev,
            markers: prev.markers.filter((m) => m.id !== markerId),
        }));
        toast.success("Marcador eliminado");
    };

    // ── Persistence ──────────────────────────────────────
    const handleSave = async () => {
        setSaving(true);
        const savePromise = onSave ? onSave(form) : apiService.saveReception(otId, form);

        toast.promise(savePromise, {
            loading: 'Guardando ficha técnica...',
            success: 'Ficha guardada correctamente',
            error: (err) => `Error al guardar: ${err.message || 'Intente nuevamente'}`
        });

        try {
            await savePromise;
        } catch (error) {
            console.error("Save error:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleExportPDF = async () => {
        setExportingPdf(true);
        // Uses frontend print logic similar to quote printing.
        try {
            const printContent = document.getElementById("reception-document-to-print");
            if (!printContent) throw new Error("Plantilla de impresión no encontrada");

            const windowUrl = 'about:blank';
            const uniqueName = new Date().getTime();
            const windowName = 'Print' + uniqueName;
            const printWindow = window.open(windowUrl, windowName, 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');

            if (printWindow) {
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Ficha_OT_${otId}.pdf</title>
                            <script src="https://cdn.tailwindcss.com"></script>
                            <style>
                                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                                body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; }
                                @page { margin: 1cm; size: auto; }
                            </style>
                        </head>
                        <body>
                            ${printContent.innerHTML}
                            <script>
                                setTimeout(() => {
                                    window.print();
                                    window.close();
                                }, 1000);
                            </script>
                        </body>
                    </html>
                `);
                printWindow.document.close();
            }
        } catch (error) {
            console.error("PDF export error:", error);
            toast.error("Error al generar PDF localmente");
        } finally {
            setExportingPdf(false);
        }
    };

    // ── Stats ────────────────────────────────────────────
    const totalItems = form.checklist.flatMap((g) => g.items).length;
    const checkedItems = form.checklist.flatMap((g) => g.items).filter((i) => i.status !== null).length;
    const progress = Math.round((checkedItems / totalItems) * 100);

    return (
        <div className="space-y-8 pb-12">
            {/* ── Top Dynamic Header ── */}
            <div className="relative overflow-hidden bg-card border border-border rounded-[2.5rem] shadow-xl p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />

                <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                            <ClipboardList size={32} className="text-primary" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-[10px] font-black text-primary uppercase tracking-widest border border-primary/30">ORDEN DE TRABAJO {otId}</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-border" />
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">{activeTab === "reception" ? "Entrada" : "Salida"}</span>
                            </div>
                            <h2 className="text-2xl font-black text-foreground tracking-tight">Registro Técnico del Vehículo</h2>
                            <p className="text-xs text-muted-foreground font-medium">Inspección de calidad y estado para taller.</p>
                        </div>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex bg-muted/50 p-1.5 rounded-[1.5rem] border border-border/60 shadow-inner">
                        <button
                            onClick={() => setActiveTab("reception")}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-500 ${activeTab === "reception"
                                ? "bg-white text-primary shadow-xl shadow-black/5 border border-border/20"
                                : "text-muted-foreground hover:text-foreground"}`}
                        >
                            <LogIn size={15} />
                            Recepción
                        </button>
                        <button
                            onClick={() => setActiveTab("dispatch")}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-500 ${activeTab === "dispatch"
                                ? "bg-white text-secondary shadow-xl shadow-black/5 border border-border/20"
                                : "text-muted-foreground hover:text-foreground"}`}
                        >
                            <LogOut size={15} />
                            Despacho
                        </button>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3">
                        <button
                            onClick={() => setForm({ ...form, checklist: INITIAL_CHECKLIST, markers: [] })}
                            className="group flex items-center gap-2 px-5 py-3 text-[11px] font-black text-muted-foreground bg-muted border border-border rounded-2xl hover:bg-white hover:text-red-500 transition-all duration-300 uppercase tracking-widest"
                        >
                            <RotateCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                            Reset
                        </button>
                        <button
                            onClick={handleExportPDF}
                            disabled={exportingPdf}
                            className="group flex items-center gap-2 px-6 py-3 text-[11px] font-black text-secondary-foreground bg-secondary border border-secondary/20 rounded-2xl hover:shadow-lg transition-all duration-300 uppercase tracking-widest disabled:opacity-50"
                        >
                            <FileDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
                            {exportingPdf ? "Exportando..." : "Descargar"}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="group flex items-center gap-2 px-8 py-3 text-[11px] font-black text-primary-foreground bg-primary rounded-2xl border border-primary/20 hover:shadow-xl transition-all duration-300 uppercase tracking-widest disabled:opacity-50"
                        >
                            <Save size={14} />
                            {saving ? "Guardando..." : "Finalizar Registro"}
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-8 pt-6 border-t border-border/40">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Estado de la Inspección</span>
                        <span className="text-[10px] font-black text-primary uppercase">{progress}% COMPLETADO</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* ── Left Column: Data ── */}
                <div className="xl:col-span-4 space-y-8">
                    {/* Vehicle Data */}
                    <div className={`p-8 bg-card border rounded-[2.5rem] shadow-sm transition-all duration-500 ${activeTab === 'reception' ? 'border-primary/20 ring-4 ring-primary/5' : 'border-secondary/20 ring-4 ring-secondary/5'}`}>
                        <SectionHeader
                            icon={Car}
                            title="Identificación del Vehículo"
                            subtitle={activeTab === 'reception' ? "Estado de entrada" : "Estado de salida"}
                        />
                        <div className="grid grid-cols-2 gap-5">
                            <FormField label="Placa" value={form.placa} onChange={(v) => setField("placa", v)} uppercase placeholder="PATENTE" />
                            <FormField label="Año" value={form.anio} onChange={(v) => setField("anio", v)} type="number" placeholder="2024" />
                            <FormField label="Marca" value={form.marca} onChange={(v) => setField("marca", v)} placeholder="MARCA" />
                            <FormField label="Modelo" value={form.modelo} onChange={(v) => setField("modelo", v)} placeholder="MODELO" />
                            <FormField label="Color" value={form.color} onChange={(v) => setField("color", v)} placeholder="COLOR" />
                            <FormField label="Tipo" value={form.tipo} onChange={(v) => setField("tipo", v)} placeholder="TIPO" />
                        </div>

                        <div className="mt-8 pt-6 border-t border-border/40 space-y-5">
                            <div className={`p-4 rounded-2xl transition-all ${activeTab === 'reception' ? 'bg-primary/5 border border-primary/20' : 'bg-muted/40'}`}>
                                <FormField
                                    label="Kilometraje Recepción"
                                    value={form.km_entrega}
                                    onChange={(v) => setField("km_entrega", v)}
                                    suffix="KM"
                                    placeholder="0"
                                />
                            </div>
                            <div className={`p-4 rounded-2xl transition-all ${activeTab === 'dispatch' ? 'bg-secondary/5 border border-secondary/20' : 'bg-muted/40'}`}>
                                <FormField
                                    label="Kilometraje Entrega"
                                    value={form.km_devolucion}
                                    onChange={(v) => setField("km_devolucion", v)}
                                    suffix="KM"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* People */}
                    <div className="p-8 bg-card border border-border/60 rounded-[2.5rem] shadow-sm">
                        <SectionHeader icon={User} title="Responsables" />
                        <div className="space-y-6">
                            <div className={`p-5 rounded-2xl border transition-all ${activeTab === 'reception' ? 'bg-primary/5 border-primary/20' : 'bg-muted/20 border-transparent text-muted-foreground'}`}>
                                <p className="text-[10px] font-black uppercase mb-4 opacity-70 flex items-center gap-2">
                                    <LogIn size={10} /> Admisión Taller
                                </p>
                                <div className="space-y-4">
                                    <FormField label="Técnico Validador" value={form.funcionario_recibe} onChange={(v) => setField("funcionario_recibe", v)} />
                                    <FormField label="Cliente que entrega" value={form.funcionario_entrega} onChange={(v) => setField("funcionario_entrega", v)} />
                                    <FormField label="Fecha Entrada" value={form.fecha_entrega} onChange={(v) => setField("fecha_entrega", v)} type="date" />
                                </div>
                            </div>

                            <div className={`p-5 rounded-2xl border transition-all ${activeTab === 'dispatch' ? 'bg-secondary/5 border-secondary/20' : 'bg-muted/20 border-transparent text-muted-foreground rotate-1'}`}>
                                <p className="text-[10px] font-black uppercase mb-4 opacity-70 flex items-center gap-2">
                                    <LogOut size={10} /> Entrega Cliente
                                </p>
                                <div className="space-y-4">
                                    <FormField label="Técnico Despachador" value={form.funcionario_entrega} onChange={(v) => setField("funcionario_entrega", v)} />
                                    <FormField label="Fecha Salida" value={form.fecha_devolucion} onChange={(v) => setField("fecha_devolucion", v)} type="date" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fuel */}
                    <div className="p-8 bg-card border border-border/60 rounded-[2.5rem] shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <SectionHeader icon={Fuel} title="Nivel de Combustible" />
                            <div className="text-xl font-black text-primary">{form.fuel_level}%</div>
                        </div>
                        <FuelGauge value={form.fuel_level} onChange={(v) => setField("fuel_level", v)} />

                        <div className="mt-10 pt-8 border-t border-border/40">
                            <SectionHeader icon={AlertCircle} title="Observaciones" />
                            <textarea
                                value={form.observaciones}
                                onChange={(e) => setField("observaciones", e.target.value)}
                                className="w-full form-input text-sm min-h-[140px] bg-muted/30 border-transparent rounded-[1.5rem] p-5 focus:bg-white focus:border-primary/20 transition-all font-medium"
                                placeholder="Anota cualquier detalle adicional importante..."
                            />
                        </div>
                    </div>
                </div>

                {/* ── Right Column: Diagram & Checklist ── */}
                <div className="xl:col-span-8 space-y-8">
                    {/* Vehicle Diagram */}
                    <div className="p-8 bg-card border border-border rounded-[2.5rem] shadow-sm relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-8">
                            <div className={`px-4 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'dispatch' ? 'bg-secondary/10 border-secondary/20 text-secondary' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                                <div className={`w-2 h-2 rounded-full animate-ping ${activeTab === 'dispatch' ? 'bg-secondary' : 'bg-primary'}`} />
                                Modo {activeTab === 'reception' ? 'RECEPCIÓN' : 'DESPACHO'}
                            </div>
                        </div>

                        <SectionHeader icon={Car} title="Estado Exterior" subtitle="Haz clic para registrar daños en la zona indicada" />

                        <VehicleDiagram
                            markers={form.markers}
                            onAddMarker={handleAddMarker}
                            onClickMarker={handleClickMarker}
                        />

                        <div className="mt-10 p-5 bg-muted/40 rounded-[2rem] border border-border/40 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/20" />
                                    <span className="text-[10px] font-black text-muted-foreground uppercase opacity-70">Recepción (Entrada)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/20" />
                                    <span className="text-[10px] font-black text-muted-foreground uppercase opacity-70">Despacho (Salida)</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl text-[10px] font-medium text-muted-foreground border border-border/60 italic">
                                <AlertCircle size={14} className="text-primary" /> Los registros marcados con "S" son incidentes de salida.
                            </div>
                        </div>
                    </div>

                    {/* Inventory */}
                    <div className="p-8 bg-card border border-border rounded-[3rem] shadow-sm">
                        <SectionHeader icon={CheckCircle} title="Checklist de Inventario" subtitle="Revisión detallada por secciones" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                            {form.checklist.map((group, gIdx) => (
                                <div key={group.title} className="space-y-5">
                                    <h4 className="flex items-center gap-3 text-[11px] font-black text-primary uppercase tracking-[0.25em] mb-4">
                                        <div className="w-1 h-5 bg-primary rounded-full" />
                                        {group.title}
                                    </h4>
                                    <div className="space-y-1.5">
                                        {group.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between py-2.5 px-3 rounded-2xl hover:bg-muted/40 transition-all border border-transparent hover:border-border/40 group/item"
                                            >
                                                <span className="text-xs font-bold text-muted-foreground group-hover/item:text-foreground transition-colors mr-4">
                                                    {item.label}
                                                </span>
                                                <StatusButtons
                                                    status={item.status}
                                                    onSetStatus={(s) => updateCheckStatus(gIdx, item.id, s)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {damageModal && (
                <DamageModal
                    marker={damageModal.marker}
                    tempCoords={damageModal.tempCoords}
                    onSave={handleSaveDamage}
                    onDelete={handleDeleteDamage}
                    onClose={() => setDamageModal(null)}
                    otId={otId}
                />
            )}

            {/* Print Template (Hidden from UI view) */}
            <div className="hidden">
                <ReceptionDocumentTemplate data={form} otId={otId} activeTab={activeTab} />
            </div>
        </div>
    );
}

function FormField({
    label,
    value,
    onChange,
    type = "text",
    placeholder = "",
    suffix,
    uppercase,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
    suffix?: string;
    uppercase?: boolean;
}) {
    return (
        <div className="group">
            <label className="block text-[10px] font-black text-muted-foreground mb-2 px-1 uppercase tracking-widest group-focus-within:text-primary transition-colors">
                {label}
            </label>
            <div className="relative">
                <input
                    type={type}
                    value={value || ""}
                    onChange={(e) => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
                    placeholder={placeholder}
                    className={`w-full form-input text-sm h-12 bg-muted/40 border border-transparent focus:bg-white focus:border-primary/20 rounded-[1rem] px-4 transition-all ${suffix ? "pr-14" : "pr-4"}`}
                    style={uppercase ? { textTransform: "uppercase" } : undefined}
                />
                {suffix && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground uppercase pointer-events-none">
                        {suffix}
                    </span>
                )}
            </div>
        </div>
    );
}
