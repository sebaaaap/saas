"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Camera, Upload, Trash2, AlertTriangle } from "lucide-react";
import { DamageMarker } from "./VehicleDiagram";
import { apiService } from "@/services/apiService";

interface DamageModalProps {
    marker: DamageMarker | null;
    tempCoords: { x: number; y: number; view: "top" | "front" | "rear" | "left" | "right"; detectedZone?: string } | null;
    onSave: (data: { note: string; photo_url?: string; zone: string }, markerId?: string) => void;
    onDelete: (markerId: string) => void;
    onClose: () => void;
    otId: string;
}

const VIEW_LABELS: Record<string, string> = {
    top: "Vista Superior",
    front: "Vista Frontal",
    rear: "Vista Trasera",
    left: "Lateral Izquierda",
    right: "Lateral Derecha",
};

const ZONE_MAP: Record<string, string> = {
    capot: "Capot / Hood",
    maletero: "Maletero / Baúl",
    techo: "Techo",
    parabrisas: "Parabrisas",
    luneta: "Luneta Trasera",
    parachoques_frontal: "Parachoques Frontal",
    parachoques_trasero: "Parachoques Trasero",
    faro_izq: "Faro Delantero Izq.",
    faro_der: "Faro Delantero Der.",
    luz_trasera_izq: "Luz Trasera Izq.",
    luz_trasera_der: "Luz Trasera Der.",
    parrilla: "Parrilla Frontal",
    puerta_delantera_izq: "Puerta Delantera Izq.",
    puerta_delantera_der: "Puerta Delantera Der.",
    puerta_trasera_izq: "Puerta Trasera Izq.",
    puerta_trasera_der: "Puerta Trasera Der.",
    vidrio_lat_izq: "Vidrio Lateral Izq.",
    vidrio_lat_der: "Vidrio Lateral Der.",
    llanta_del_izq: "Llanta Delantera Izq.",
    llanta_del_der: "Llanta Delantera Der.",
    llanta_tra_izq: "Llanta Trasera Izq.",
    llanta_tra_der: "Llanta Trasera Der.",
    espejo_lat_izq: "Espejo Lateral Izq.",
    espejo_lat_der: "Espejo Lateral Der.",
};

export function DamageModal({ marker, tempCoords, onSave, onDelete, onClose, otId }: DamageModalProps) {
    const [note, setNote] = useState(marker?.note || "");
    const [zone, setZone] = useState(marker?.zone || tempCoords?.detectedZone || "");
    const [preview, setPreview] = useState<string | null>(marker?.photo_url || null);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const view = marker?.view || tempCoords?.view || "top";

    // Set zone label if detected
    useEffect(() => {
        if (tempCoords?.detectedZone && !marker) {
            const readableZone = ZONE_MAP[tempCoords.detectedZone] || tempCoords.detectedZone;
            setZone(readableZone);
        }
    }, [tempCoords, marker]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Local preview
        const url = URL.createObjectURL(file);
        setPreview(url);
        setUploading(true);

        try {
            const data = await apiService.uploadDamagePhoto(otId, file);
            if (data.url) {
                setPreview(data.url);
            }
        } catch (error) {
            console.error("Photo upload error:", error);
            console.warn("Upload failed, using local preview");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = () => {
        if (!note.trim()) return;
        onSave({
            note: note.trim(),
            photo_url: preview || undefined,
            zone: zone || (tempCoords?.detectedZone ? ZONE_MAP[tempCoords.detectedZone] : undefined) || `Zona ${VIEW_LABELS[view]}`
        }, marker?.id);
        onClose();
    };

    const isNew = !marker;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative bg-card border border-border rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-red-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-200 text-white">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-foreground text-sm tracking-tight">
                                {isNew ? "Registrar Daño" : "Editar Registro"}
                            </h3>
                            <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{VIEW_LABELS[view]}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-red-100 text-muted-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Zone tag if detected */}
                    {tempCoords?.detectedZone && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-xl border border-primary/20">
                            <span className="text-[10px] font-black text-primary uppercase">Zona Detectada:</span>
                            <span className="text-xs font-bold text-foreground">{ZONE_MAP[tempCoords.detectedZone] || tempCoords.detectedZone}</span>
                        </div>
                    )}

                    {/* Zone selector */}
                    <div>
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 block">
                            Parte del Vehículo
                        </label>
                        <select
                            value={zone}
                            onChange={(e) => setZone(e.target.value)}
                            className="w-full form-input text-sm h-11 bg-muted/30 border-transparent focus:bg-card focus:border-primary"
                        >
                            <option value="">Seleccionar pieza...</option>
                            {Object.entries(ZONE_MAP).map(([key, label]) => (
                                <option key={key} value={label}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 block">
                            Detalles del Daño *
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Ej: Raspón profundo, abolladura, mica rota..."
                            rows={3}
                            className="w-full form-input text-sm resize-none bg-muted/30 border-transparent focus:bg-card focus:border-primary min-h-[100px]"
                            autoFocus
                        />
                    </div>

                    {/* Photo */}
                    <div>
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 block">
                            Evidencia Fotográfica
                        </label>

                        {preview ? (
                            <div className="relative rounded-2xl overflow-hidden border-2 border-primary/20 group">
                                <img src={preview} alt="Evidencia" className="w-full h-48 object-cover transition-transform group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                    <button
                                        onClick={() => setPreview(null)}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-bold text-xs"
                                    >
                                        <Trash2 size={14} /> Eliminar Foto
                                    </button>
                                </div>
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                                        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span className="text-white text-xs font-black uppercase tracking-widest">Subiendo...</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => fileRef.current?.click()}
                                    className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-border rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group"
                                >
                                    <div className="p-3 bg-muted rounded-xl group-hover:bg-primary/10 group-hover:scale-110 transition-all">
                                        <Upload size={22} className="text-muted-foreground group-hover:text-primary" />
                                    </div>
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Galería</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (fileRef.current) {
                                            fileRef.current.accept = "image/*";
                                            fileRef.current.capture = "environment";
                                            fileRef.current.click();
                                        }
                                    }}
                                    className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-secondary/50 rounded-2xl hover:bg-secondary/5 hover:border-secondary transition-all group"
                                >
                                    <div className="p-3 bg-secondary/10 rounded-xl group-hover:scale-110 transition-all">
                                        <Camera size={22} className="text-secondary" />
                                    </div>
                                    <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Cámara</span>
                                </button>
                            </div>
                        )}

                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 pt-2 flex items-center gap-3">
                    {!isNew && (
                        <button
                            onClick={() => { onDelete(marker!.id); onClose(); }}
                            className="flex items-center gap-2 px-4 py-3 text-xs font-black text-red-600 bg-red-50 border border-red-100 rounded-2xl hover:bg-red-100 transition-colors uppercase"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="ml-auto px-6 py-3 text-xs font-black text-muted-foreground bg-muted rounded-2xl hover:bg-muted/80 transition-colors uppercase"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!note.trim()}
                        className="px-8 py-3 text-xs font-black text-white bg-primary rounded-2xl hover:bg-primary-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-primary/30 uppercase tracking-widest"
                    >
                        {isNew ? "Registrar Daño" : "Guardar Cambios"}
                    </button>
                </div>
            </div>
        </div>
    );
}
