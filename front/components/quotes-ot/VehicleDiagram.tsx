"use client";

import React, { useRef } from "react";
import { MapPin } from "lucide-react";

export interface DamageMarker {
    id: string;
    zone: string;
    note: string;
    photo_url?: string;
    coords: { x: number; y: number };
    view: "top" | "front" | "rear" | "left" | "right";
    type?: "reception" | "dispatch";
}

interface VehicleDiagramProps {
    markers: DamageMarker[];
    onAddMarker: (coords: { x: number; y: number }, view: "top" | "front" | "rear" | "left" | "right", detectedZone?: string) => void;
    onClickMarker: (marker: DamageMarker) => void;
    printMode?: boolean;
}

export function VehicleDiagram({ markers, onAddMarker, onClickMarker, printMode = false }: VehicleDiagramProps) {
    const topRef = useRef<SVGSVGElement>(null);
    const frontRef = useRef<SVGSVGElement>(null);
    const rearRef = useRef<SVGSVGElement>(null);
    const leftRef = useRef<SVGSVGElement>(null);
    const rightRef = useRef<SVGSVGElement>(null);

    const handleSvgClick = (
        e: React.MouseEvent<SVGSVGElement>,
        ref: React.RefObject<SVGSVGElement | null>,
        view: "top" | "front" | "rear" | "left" | "right"
    ) => {
        if (printMode) return;
        if ((e.target as SVGElement).closest(".marker-pin")) return;

        const svg = ref.current;
        if (!svg) return;

        // Detect zone from data-zone attribute
        const target = e.target as SVGElement;
        const zoneElement = target.closest("[data-zone]");
        const detectedZone = zoneElement ? (zoneElement as HTMLElement).dataset.zone : undefined;

        const rect = svg.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        onAddMarker({ x: Math.round(x), y: Math.round(y) }, view, detectedZone);
    };

    const viewMarkers = (view: "top" | "front" | "rear" | "left" | "right") =>
        markers.filter((m) => m.view === view);

    return (
        <div className={printMode ? "grid grid-cols-5 gap-2 w-full items-start" : "space-y-6"}>
            <div className={printMode ? "" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
                <DiagramPanel printMode={printMode} title="Superior" view="top" svgRef={topRef} markers={viewMarkers("top")} onSvgClick={handleSvgClick} onClickMarker={onClickMarker}>
                    <TopViewSVG />
                </DiagramPanel>

                {!printMode && (
                    <>
                        <DiagramPanel printMode={printMode} title="Vista Frontal" view="front" svgRef={frontRef} markers={viewMarkers("front")} onSvgClick={handleSvgClick} onClickMarker={onClickMarker}>
                            <FrontViewSVG />
                        </DiagramPanel>

                        <DiagramPanel printMode={printMode} title="Vista Trasera" view="rear" svgRef={rearRef} markers={viewMarkers("rear")} onSvgClick={handleSvgClick} onClickMarker={onClickMarker}>
                            <RearViewSVG />
                        </DiagramPanel>
                    </>
                )}
            </div>

            {printMode && (
                <>
                    <div>
                        <DiagramPanel printMode={printMode} title="Frontal" view="front" svgRef={frontRef} markers={viewMarkers("front")} onSvgClick={handleSvgClick} onClickMarker={onClickMarker}>
                            <FrontViewSVG />
                        </DiagramPanel>
                    </div>
                    <div>
                        <DiagramPanel printMode={printMode} title="Trasera" view="rear" svgRef={rearRef} markers={viewMarkers("rear")} onSvgClick={handleSvgClick} onClickMarker={onClickMarker}>
                            <RearViewSVG />
                        </DiagramPanel>
                    </div>
                </>
            )}

            <div className={printMode ? "" : "grid grid-cols-1 md:grid-cols-2 gap-6"}>
                <DiagramPanel printMode={printMode} title={printMode ? "Izquierdo" : "Lateral Izquierdo (Piloto)"} view="left" svgRef={leftRef} markers={viewMarkers("left")} onSvgClick={handleSvgClick} onClickMarker={onClickMarker}>
                    <LeftSideViewSVG />
                </DiagramPanel>

                {!printMode && (
                    <DiagramPanel printMode={printMode} title={printMode ? "Derecho" : "Lateral Derecho (Copiloto)"} view="right" svgRef={rightRef} markers={viewMarkers("right")} onSvgClick={handleSvgClick} onClickMarker={onClickMarker}>
                        <RightSideViewSVG />
                    </DiagramPanel>
                )}
            </div>

            {printMode && (
                <div>
                    <DiagramPanel printMode={printMode} title="Derecho" view="right" svgRef={rightRef} markers={viewMarkers("right")} onSvgClick={handleSvgClick} onClickMarker={onClickMarker}>
                        <RightSideViewSVG />
                    </DiagramPanel>
                </div>
            )}
        </div>
    );
}

function DiagramPanel({
    title, view, svgRef, markers, onSvgClick, onClickMarker, children, printMode = false
}: {
    title: string;
    view: "top" | "front" | "rear" | "left" | "right";
    svgRef: React.RefObject<SVGSVGElement | null>;
    markers: DamageMarker[];
    onSvgClick: (e: React.MouseEvent<SVGSVGElement>, ref: React.RefObject<SVGSVGElement | null>, view: "top" | "front" | "rear" | "left" | "right") => void;
    onClickMarker: (m: DamageMarker) => void;
    children: React.ReactNode;
    printMode?: boolean;
}) {
    return (
        <div className={printMode
            ? "bg-white border border-slate-300 rounded-lg overflow-hidden shadow-none"
            : "bg-card/50 backdrop-blur-md border border-border/60 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:border-primary/40 transition-all duration-700 group"}
        >
            <div className={printMode
                ? "py-1.5 bg-slate-100 border-b border-slate-300 text-[8px] font-bold text-slate-700 uppercase text-center"
                : "px-5 py-4 bg-muted/60 border-b border-border/40 text-[11px] font-black text-muted-foreground uppercase tracking-[0.25em] text-center group-hover:bg-primary/10 group-hover:text-primary transition-all flex items-center justify-center gap-2"}
            >
                {!printMode && <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />}
                {title}
            </div>
            <div className={printMode ? "relative p-2" : "relative p-8 overflow-hidden"}>
                <svg
                    ref={svgRef}
                    viewBox="0 0 200 160"
                    className={`w-full ${!printMode ? "cursor-crosshair drop-shadow-2xl" : ""}`}
                    onClick={(e) => onSvgClick(e, svgRef, view)}
                    style={{ userSelect: "none" }}
                >
                    <defs>
                        <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: "#ffffff", stopOpacity: 1 }} />
                            <stop offset="50%" style={{ stopColor: "#f1f5f9", stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: "#e2e8f0", stopOpacity: 1 }} />
                        </linearGradient>
                        <linearGradient id="glassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: "#60a5fa", stopOpacity: 0.2 }} />
                            <stop offset="100%" style={{ stopColor: "#2563eb", stopOpacity: 0.4 }} />
                        </linearGradient>
                    </defs>

                    {/* Orientation Indicators */}
                    {view === "top" && (
                        <>
                            <text x="100" y="15" textAnchor="middle" fontSize="6" fill="#94a3b8" fontWeight="bold" opacity="0.6" className="uppercase tracking-[0.3em]">Delantero</text>
                            <text x="100" y="155" textAnchor="middle" fontSize="6" fill="#94a3b8" fontWeight="bold" opacity="0.6" className="uppercase tracking-[0.3em]">Trasero</text>
                        </>
                    )}
                    {["left", "right"].includes(view) && (
                        <>
                            <text x={view === "left" ? "170" : "30"} y="150" textAnchor="middle" fontSize="6" fill="#94a3b8" fontWeight="bold" opacity="0.6" className="uppercase tracking-[0.3em]">Delantero</text>
                            <text x={view === "left" ? "30" : "170"} y="150" textAnchor="middle" fontSize="6" fill="#94a3b8" fontWeight="bold" opacity="0.6" className="uppercase tracking-[0.3em]">Trasero</text>
                        </>
                    )}

                    {/* Shadow underneath */}
                    <ellipse cx="100" cy="152" rx="75" ry="6" fill="black" opacity="0.08" />

                    <g className={`vehicle-body transition-all duration-500 transform-gpu origin-center ${!printMode ? "group-hover:scale-[1.02]" : ""}`}>
                        {children}
                    </g>

                    {markers.map((m) => (
                        <g
                            key={m.id}
                            className="marker-pin"
                            transform={`translate(${(m.coords.x / 100) * 200}, ${(m.coords.y / 100) * 160})`}
                            onClick={(e) => { e.stopPropagation(); onClickMarker(m); }}
                            style={{ cursor: printMode ? "default" : "pointer" }}
                        >
                            <circle r={printMode ? "10" : "12"} fill={m.type === "dispatch" ? "hsl(199, 89%, 48%)" : "hsl(0, 84%, 55%)"} opacity="0.4" className={!printMode ? "animate-ping" : ""} />
                            <circle r={printMode ? "6" : "8"} fill={m.type === "dispatch" ? "hsl(199, 89%, 48%)" : "hsl(0, 84%, 55%)"} className={!printMode ? "shadow-lg" : ""} />
                            <text x="0" y={printMode ? "2.5" : "3.5"} textAnchor="middle" fontSize={printMode ? "8" : "10"} fill="white" fontWeight="900" style={{ pointerEvents: 'none' }}>
                                {m.type === "dispatch" ? "S" : "!"}
                            </text>
                        </g>
                    ))}
                </svg>

                {!printMode && (
                    <div className="mt-8 min-h-[56px] flex flex-wrap justify-center gap-2">
                        {markers.length > 0 ? (
                            markers.map((m) => {
                                const colorClass = m.type === "dispatch" ? "bg-blue-500/10 border-blue-500/30 text-blue-600" : "bg-red-500/10 border-red-500/30 text-red-600";
                                const hoverClass = m.type === "dispatch" ? "hover:bg-blue-500 hover:text-white" : "hover:bg-red-500 hover:text-white";

                                return (
                                    <button
                                        key={m.id}
                                        onClick={() => onClickMarker(m)}
                                        className={`flex items-center gap-2 px-3.5 py-2 border rounded-2xl text-[10px] transition-all duration-300 font-black uppercase tracking-wider shadow-sm ${colorClass} ${hoverClass}`}
                                    >
                                        <MapPin size={11} />
                                        <span className="max-w-[80px] truncate">{m.zone || "Detalle"}</span>
                                        {m.photo_url && <span>📷</span>}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center gap-2 opacity-30 mt-2">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] animate-pulse">
                                    Esperando registro
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── SVG Views with Zones ───

function TopViewSVG() {
    return (
        <g strokeLinejoin="round" strokeLinecap="round">
            {/* Visuals First */}
            <rect x="65" y="10" width="70" height="140" rx="15" fill="url(#bodyGradient)" stroke="#64748b" strokeWidth="1" />

            <rect x="72" y="55" width="56" height="50" rx="5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
            <rect x="72" y="20" width="56" height="35" rx="5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
            <rect x="72" y="105" width="56" height="30" rx="5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />

            <rect x="72" y="48" width="56" height="7" fill="#cbd5e1" opacity="0.6" />
            <rect x="72" y="100" width="56" height="5" fill="#cbd5e1" opacity="0.6" />

            <path d="M65 15 Q100 5 135 15" fill="none" stroke="#64748b" strokeWidth="2" />
            <path d="M65 145 Q100 155 135 145" fill="none" stroke="#64748b" strokeWidth="2" />

            <rect x="53" y="25" width="12" height="25" rx="2" fill="#1e293b" />
            <rect x="135" y="25" width="12" height="25" rx="2" fill="#1e293b" />
            <rect x="53" y="110" width="12" height="25" rx="2" fill="#1e293b" />
            <rect x="135" y="110" width="12" height="25" rx="2" fill="#1e293b" />

            <rect x="48" y="55" width="17" height="8" rx="2" fill="#64748b" />
            <rect x="135" y="55" width="17" height="8" rx="2" fill="#64748b" />

            {/* Click Zones (On Top) */}
            <rect data-zone="techo" x="72" y="55" width="56" height="50" fill="transparent" className="cursor-pointer hover:fill-primary/5 transition-colors" />
            <rect data-zone="capot" x="72" y="20" width="56" height="35" fill="transparent" className="cursor-pointer hover:fill-primary/5 transition-colors" />
            <rect data-zone="maletero" x="72" y="105" width="56" height="30" fill="transparent" className="cursor-pointer hover:fill-primary/5 transition-colors" />
            <path data-zone="parachoques_frontal" d="M65 10 L135 10 L135 25 L65 25 Z" fill="transparent" className="cursor-pointer" />
            <path data-zone="parachoques_trasero" d="M65 135 L135 135 L135 150 L65 150 Z" fill="transparent" className="cursor-pointer" />
            <rect data-zone="espejo_lat_izq" x="48" y="50" width="20" height="15" fill="transparent" className="cursor-pointer" />
            <rect data-zone="espejo_lat_der" x="132" y="50" width="20" height="15" fill="transparent" className="cursor-pointer" />
        </g>
    );
}

function FrontViewSVG() {
    return (
        <g strokeLinejoin="round" strokeLinecap="round">
            {/* Visuals */}
            <path d="M30 110 Q100 100 170 110 L160 80 Q100 70 40 80 Z" fill="url(#bodyGradient)" stroke="#64748b" strokeWidth="1.2" />
            <path d="M45 80 L155 80 L145 40 Q100 30 55 40 Z" fill="url(#glassGradient)" stroke="#3b82f6" strokeWidth="1" />
            <path d="M25 110 L175 110 Q175 140 100 140 Q25 140 25 110 Z" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" />
            <rect x="35" y="85" width="35" height="15" rx="5" fill="#fff9db" stroke="#fcc419" strokeWidth="1" />
            <rect x="130" y="85" width="35" height="15" rx="5" fill="#fff9db" stroke="#fcc419" strokeWidth="1" />
            <rect x="75" y="95" width="50" height="25" rx="4" fill="#1e293b" />

            {/* Click Zones */}
            <path data-zone="capot" d="M40 80 L160 80 L170 110 L30 110 Z" fill="transparent" className="cursor-pointer hover:fill-primary/5 transition-colors" />
            <path data-zone="parabrisas" d="M45 80 L155 80 L145 40 L55 40 Z" fill="transparent" className="cursor-pointer hover:fill-blue-500/10" />
            <path data-zone="parachoques_frontal" d="M25 110 L175 110 L175 140 L25 140 Z" fill="transparent" className="cursor-pointer hover:fill-primary/10" />
            <rect data-zone="faro_izq" x="35" y="85" width="35" height="15" fill="transparent" className="cursor-pointer" />
            <rect data-zone="faro_der" x="130" y="85" width="35" height="15" fill="transparent" className="cursor-pointer" />
        </g>
    );
}

function RearViewSVG() {
    return (
        <g strokeLinejoin="round" strokeLinecap="round">
            {/* Visuals */}
            <path d="M30 110 Q100 100 170 110 L160 80 Q100 75 40 80 Z" fill="url(#bodyGradient)" stroke="#64748b" strokeWidth="1.2" />
            <path d="M48 80 L152 80 L145 45 Q100 35 55 45 Z" fill="url(#glassGradient)" stroke="#3b82f6" strokeWidth="1" />
            <path d="M25 110 L175 110 Q175 140 100 140 Q25 140 25 110 Z" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" />
            <rect x="35" y="85" width="35" height="15" rx="4" fill="#ff8787" stroke="#e03131" strokeWidth="1" />
            <rect x="130" y="85" width="35" height="15" rx="4" fill="#ff8787" stroke="#e03131" strokeWidth="1" />
            <rect x="80" y="115" width="40" height="12" rx="2" fill="white" stroke="#94a3b8" strokeWidth="0.5" />

            {/* Click Zones */}
            <path data-zone="maletero" d="M40 80 L160 80 L170 110 L30 110 Z" fill="transparent" className="cursor-pointer hover:fill-primary/5" />
            <path data-zone="luneta" d="M48 80 L152 80 L145 45 L55 45 Z" fill="transparent" className="cursor-pointer hover:fill-blue-500/10" />
            <path data-zone="parachoques_trasero" d="M25 110 L175 110 L175 140 L25 140 Z" fill="transparent" className="cursor-pointer hover:fill-primary/10" />
            <rect data-zone="luz_trasera_izq" x="35" y="85" width="35" height="15" fill="transparent" className="cursor-pointer" />
            <rect data-zone="luz_trasera_der" x="130" y="85" width="35" height="15" fill="transparent" className="cursor-pointer" />
        </g>
    );
}

function LeftSideViewSVG() {
    return (
        <g strokeLinejoin="round" strokeLinecap="round">
            {/* Visuals - SEDAN PROPER FACING RIGHT */}
            {/* Main Body */}
            <path d="M10 100 L190 100 L195 90 L195 75 L155 75 L140 45 Q100 38 65 45 L50 75 L10 75 Z" fill="url(#bodyGradient)" stroke="#64748b" strokeWidth="1.2" />

            {/* Roof/Glass Area */}
            <path d="M65 45 Q100 38 140 45 L145 50 L60 50 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
            <path d="M68 75 L100 75 L100 50 L73 50 Z" fill="url(#glassGradient)" stroke="#3b82f6" strokeWidth="0.8" />
            <path d="M105 75 L140 75 L135 50 L105 50 Z" fill="url(#glassGradient)" stroke="#3b82f6" strokeWidth="0.8" />

            {/* Lights */}
            <rect x="188" y="78" width="7" height="12" rx="2" fill="#fff9db" stroke="#fcc419" strokeWidth="0.5" /> {/* Front Headlight */}
            <rect x="10" y="78" width="8" height="12" rx="2" fill="#ff8787" stroke="#e03131" strokeWidth="0.5" /> {/* Rear Taillight */}

            {/* Door Lines */}
            <path d="M102 75 L102 100" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,2" />
            <path d="M68 75 L68 100" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,2" />
            <path d="M140 75 L140 100" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,2" />

            {/* Wheels */}
            <circle cx="50" cy="115" r="22" fill="#1e293b" />
            <circle cx="50" cy="115" r="12" fill="#64748b" />
            <circle cx="150" cy="115" r="22" fill="#1e293b" />
            <circle cx="150" cy="115" r="12" fill="#64748b" />

            {/* Handles */}
            <rect x="92" y="82" width="8" height="3" rx="1" fill="#64748b" />
            <rect x="128" y="82" width="8" height="3" rx="1" fill="#64748b" />

            {/* Click Zones (On Top) */}
            <path data-zone="capot" d="M150 75 L195 75 L195 90 L185 100 L150 100 Z" fill="transparent" className="cursor-pointer hover:fill-primary/5" />
            <path data-zone="maletero" d="M10 75 L50 75 L50 100 L10 100 Z" fill="transparent" className="cursor-pointer hover:fill-primary/5" />
            <path data-zone="techo" d="M65 45 Q100 38 140 45 L145 50 L60 50 Z" fill="transparent" className="cursor-pointer" />
            <rect data-zone="puerta_delantera_izq" x="102" y="75" width="45" height="40" fill="transparent" className="cursor-pointer hover:fill-primary/5" />
            <rect data-zone="puerta_trasera_izq" x="68" y="75" width="34" height="40" fill="transparent" className="cursor-pointer hover:fill-primary/5" />
            <path data-zone="vidrio_lat_izq" d="M68 50 L140 50 L140 75 L68 75 Z" fill="transparent" className="cursor-pointer hover:fill-blue-500/5" />
            <g data-zone="llanta_tra_izq" className="cursor-pointer"><circle cx="50" cy="115" r="22" fill="transparent" /></g>
            <g data-zone="llanta_del_izq" className="cursor-pointer"><circle cx="150" cy="115" r="22" fill="transparent" /></g>
            <path data-zone="parachoques_trasero" d="M5 80 L15 80 L15 100 L5 100 Z" fill="transparent" className="cursor-pointer" />
            <path data-zone="parachoques_frontal" d="M185 80 L195 80 L195 100 L185 100 Z" fill="transparent" className="cursor-pointer" />
        </g>
    );
}

function RightSideViewSVG() {
    return (
        <g strokeLinejoin="round" strokeLinecap="round">
            {/* TRANSFORM MIRROR: The car will point LEFT visually */}
            <g transform="scale(-1, 1) translate(-200, 0)">
                {/* Visuals - SAME AS LEFT SIDE BUT MIRRORED */}
                <path d="M10 100 L190 100 L195 90 L195 75 L155 75 L140 45 Q100 38 65 45 L50 75 L10 75 Z" fill="url(#bodyGradient)" stroke="#64748b" strokeWidth="1.2" />

                <path d="M65 45 Q100 38 140 45 L145 50 L60 50 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
                <path d="M68 75 L100 75 L100 50 L73 50 Z" fill="url(#glassGradient)" stroke="#3b82f6" strokeWidth="0.8" />
                <path d="M105 75 L140 75 L135 50 L105 50 Z" fill="url(#glassGradient)" stroke="#3b82f6" strokeWidth="0.8" />

                <rect x="188" y="78" width="7" height="12" rx="2" fill="#fff9db" stroke="#fcc419" strokeWidth="0.5" />
                <rect x="10" y="78" width="8" height="12" rx="2" fill="#ff8787" stroke="#e03131" strokeWidth="0.5" />

                <path d="M102 75 L102 100" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,2" />
                <path d="M68 75 L68 100" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,2" />
                <path d="M140 75 L140 100" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,2" />

                <circle cx="50" cy="115" r="22" fill="#1e293b" />
                <circle cx="50" cy="115" r="12" fill="#64748b" />
                <circle cx="150" cy="115" r="22" fill="#1e293b" />
                <circle cx="150" cy="115" r="12" fill="#64748b" />

                <rect x="92" y="82" width="8" height="3" rx="1" fill="#64748b" />
                <rect x="128" y="82" width="8" height="3" rx="1" fill="#64748b" />

                {/* Click Zones (On Top) - Corrected for Mirroring */}
                {/* Original x=150 area (FRONT in Left View) is now at x=50 area visually (FRONT in Right View) */}
                <path data-zone="capot" d="M150 75 L195 75 L195 90 L185 100 L150 100 Z" fill="transparent" className="cursor-pointer hover:fill-primary/5" />
                <path data-zone="maletero" d="M10 75 L50 75 L50 100 L10 100 Z" fill="transparent" className="cursor-pointer hover:fill-primary/5" />
                <path data-zone="techo" d="M65 45 Q100 38 140 45 L145 50 L60 50 Z" fill="transparent" className="cursor-pointer" />

                {/* 
                    Mirroring scale(-1) translate(-200):
                    Original x=102 -> -102 + 200 = 98 (visually center-right)
                    Original x=68  -> -68 + 200 = 132 (visually far right)
                    So Puerta Delantera (Front) was at x=102, visually at 98.
                */}
                <rect data-zone="puerta_delantera_der" x="102" y="75" width="45" height="40" fill="transparent" className="cursor-pointer hover:fill-primary/5" />
                <rect data-zone="puerta_trasera_der" x="68" y="75" width="34" height="40" fill="transparent" className="cursor-pointer hover:fill-primary/5" />
                <path data-zone="vidrio_lat_der" d="M68 50 L140 50 L140 75 L68 75 Z" fill="transparent" className="cursor-pointer hover:fill-blue-500/5" />

                {/* Fixed Wheeler Assignments for Mirror:
                    Original x=150 (FRONT) -> Mirrored to 50 (FRONT)
                    Original x=50  (REAR)  -> Mirrored to 150 (REAR)
                */}
                <g data-zone="llanta_del_der" className="cursor-pointer"><circle cx="150" cy="115" r="22" fill="transparent" /></g>
                <g data-zone="llanta_tra_der" className="cursor-pointer"><circle cx="50" cy="115" r="22" fill="transparent" /></g>

                <path data-zone="parachoques_frontal" d="M185 80 L195 80 L195 100 L185 100 Z" fill="transparent" className="cursor-pointer" />
                <path data-zone="parachoques_trasero" d="M5 80 L15 80 L15 100 L5 100 Z" fill="transparent" className="cursor-pointer" />
            </g>
        </g>
    );
}
