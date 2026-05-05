"use client"

import React from "react"
import { useSettings } from "@/hooks/useSettings"
import { ReceptionFormData } from "./VehicleReceptionCard"
import { VehicleDiagram } from "./VehicleDiagram"

interface ReceptionDocumentTemplateProps {
    data: ReceptionFormData;
    otId: string;
    activeTab?: "reception" | "dispatch";
}

export function ReceptionDocumentTemplate({ data, otId, activeTab = "reception" }: ReceptionDocumentTemplateProps) {
    const { settings, isLoaded } = useSettings()

    // Configurable business details, fallback to static if not set
    const logoUrl = settings.logoBase64 || "/fblogo3.png"
    const businessName = settings.businessName || "VANKAI"
    const businessDescription = settings.description || "KRYPTONITA VULCANIZA"
    const address = settings.address || "Av. Central 1234, Santiago, Chile"
    const phone = settings.phone || "+56 9 1234 5678"
    const email = settings.email || "contacto@vankai.cl"
    const website = settings.website || "www.vankai.cl"

    if (!isLoaded) {
        return <div className="p-8 text-center text-muted-foreground">Cargando documento...</div>;
    }

    return (
        <div id="reception-document-to-print" className="bg-white text-black p-4 md:p-8 max-w-[800px] mx-auto font-sans text-[11px] leading-tight flex flex-col gap-6">
            {/* ENCABEZADO EMPRESA */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                <div className="w-1/2 pt-2">
                    <div className="font-black text-2xl leading-tight uppercase text-slate-900">{businessName}</div>
                    <div className="uppercase tracking-[0.2em] text-[10px] mb-4 text-slate-500 font-bold">{businessDescription}</div>
                    <div className="text-xs leading-relaxed text-slate-700">
                        {address}<br />
                        {phone}<br />
                        {email}<br />
                        {website}
                    </div>
                </div>
                <div className="w-1/2 flex flex-col items-end">
                    {/* Logo dinámico */}
                    <img src={logoUrl} alt="Logo" className="max-h-20 object-contain mb-6" />

                    <div className="text-right">
                        <div className="text-xl font-black uppercase tracking-tight">
                            {activeTab === "reception" ? "Ficha de Recepción" : "Ficha de Despacho"}
                        </div>
                        <div className="text-sm font-bold text-slate-500">OT-{otId.slice(0, 4)}</div>
                    </div>
                </div>
            </div>

            {/* DATOS DEL VEHÍCULO Y RESPONSABLES */}
            <div className="grid grid-cols-2 gap-4">
                <table className="w-full text-[10px] border-collapse border border-slate-300">
                    <thead>
                        <tr className="bg-slate-100"><th colSpan={2} className="border border-slate-300 p-1.5 text-left font-bold uppercase">Vehículo</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-slate-300 p-1.5 font-bold w-1/3 bg-slate-50">Placa</td>
                            <td className="border border-slate-300 p-1.5">{data.placa || "N/A"}</td>
                        </tr>
                        <tr>
                            <td className="border border-slate-300 p-1.5 font-bold bg-slate-50">Marca / Modelo</td>
                            <td className="border border-slate-300 p-1.5">{(data.marca + " " + data.modelo).trim() || "N/A"}</td>
                        </tr>
                        <tr>
                            <td className="border border-slate-300 p-1.5 font-bold bg-slate-50">Año / Color</td>
                            <td className="border border-slate-300 p-1.5">{data.anio || "-"} / {data.color || "-"}</td>
                        </tr>
                        <tr>
                            <td className="border border-slate-300 p-1.5 font-bold bg-slate-50">
                                {activeTab === "reception" ? "KM Ingreso" : "KM Salida"}
                            </td>
                            <td className="border border-slate-300 p-1.5">
                                {activeTab === "reception" ? data.km_entrega || "0" : data.km_devolucion || "0"} km
                            </td>
                        </tr>
                    </tbody>
                </table>
                <table className="w-full text-[10px] border-collapse border border-slate-300">
                    <thead>
                        <tr className="bg-slate-100"><th colSpan={2} className="border border-slate-300 p-1.5 text-left font-bold uppercase">Responsables</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-slate-300 p-1.5 font-bold w-1/3 bg-slate-50">
                                {activeTab === "reception" ? "Admin. (Recibe)" : "Admin. (Entrega)"}
                            </td>
                            <td className="border border-slate-300 p-1.5">
                                {activeTab === "reception" ? data.funcionario_recibe : data.funcionario_entrega || "N/A"}
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-slate-300 p-1.5 font-bold bg-slate-50">
                                {activeTab === "reception" ? "Fecha Ingreso" : "Fecha Salida"}
                            </td>
                            <td className="border border-slate-300 p-1.5">
                                {activeTab === "reception" ? data.fecha_entrega : data.fecha_devolucion || "N/A"}
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-slate-300 p-1.5 font-bold bg-slate-50">
                                {activeTab === "reception" ? "Cliente (Entrega)" : "Cliente (Recibe)"}
                            </td>
                            <td className="border border-slate-300 p-1.5">
                                {activeTab === "reception" ? data.funcionario_entrega : data.funcionario_recibe || "N/A"}
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-slate-300 p-1.5 font-bold bg-slate-50">Combustible</td>
                            <td className="border border-slate-300 p-1.5">{data.fuel_level}%</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* CHECKLIST */}
            <div className="mt-4 break-inside-avoid">
                <div className="bg-slate-100 py-1.5 px-3 border border-slate-300 font-bold uppercase text-[10px] mb-2">
                    Checklist de Inventario
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {data.checklist.map((group, idx) => (
                        <div key={idx} className="border border-slate-300 p-2">
                            <h4 className="font-bold text-[9px] uppercase border-b border-slate-200 pb-1 mb-2 tracking-wider">{group.title}</h4>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px]">
                                {group.items.map(item => {
                                    const statusText = item.status === "good" ? "✓ BUENO" : item.status === "bad" ? "✗ MALO" : "— N/A";
                                    return (
                                        <div key={item.id} className="flex justify-between items-center border-b border-slate-100 last:border-0 pb-0.5">
                                            <span className="text-slate-600 truncate mr-2">{item.label}</span>
                                            <span className={`font-bold shrink-0 ${item.status === "good" ? "text-emerald-600" : item.status === "bad" ? "text-red-600" : "text-slate-400"}`}>
                                                {statusText}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ESTADO EXTERIOR: DIAGRAMA Y DETALLES */}
            <div className="mt-4 break-inside-avoid">
                <div className="bg-slate-100 py-1.5 px-3 border border-slate-300 font-bold uppercase text-[10px] mb-2 flex justify-between items-center">
                    <span>Estado Exterior y Daños Registrados</span>
                </div>

                {/* Diagrama (Ancho completo, horizontal) */}
                <div className="pointer-events-none transform origin-top-left mb-2 w-full flex justify-center overflow-hidden h-[180px]">
                    <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center', width: '100%' }}>
                        <VehicleDiagram
                            markers={data.markers}
                            onAddMarker={() => { }}
                            onClickMarker={() => { }}
                            printMode={true}
                        />
                    </div>
                </div>

                {/* Tabla de Daños (Ancho completo) */}
                <div className="w-full mt-2">
                    {data.markers.length > 0 ? (
                        <table className="w-full text-[9px] border-collapse border border-slate-300">
                            <thead>
                                <tr className="bg-slate-50 text-left">
                                    <th className="border border-slate-300 p-1.5 font-bold w-8 text-center">N°</th>
                                    <th className="border border-slate-300 p-1.5 font-bold w-[120px]">ZONA</th>
                                    <th className="border border-slate-300 p-1.5 font-bold">DESCRIPCIÓN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.markers.map((m, idx) => (
                                    <tr key={m.id}>
                                        <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-500">{idx + 1}</td>
                                        <td className="border border-slate-300 p-1.5 font-bold uppercase text-slate-700">{m.zone || "Detalle"}</td>
                                        <td className="border border-slate-300 p-1.5 text-slate-600 leading-tight">{m.note || "Sin descripción"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center p-4 border border-slate-300 border-dashed text-slate-500 italic text-[10px]">
                            El vehículo no presenta daños visuales a la recepción.
                        </div>
                    )}
                    <p className="text-[8px] font-normal italic text-slate-500 mt-1">* Zonas rojas marcadas coinciden con el diagrama superior.</p>
                </div>
            </div>


            {/* OBSERVACIONES GENERALES */}
            {data.observaciones && (
                <div className="mt-4 border border-slate-300 p-3 break-inside-avoid">
                    <div className="font-bold uppercase text-[9px] mb-1">Observaciones Generales:</div>
                    <p className="text-[10px] text-slate-700 italic">{data.observaciones}</p>
                </div>
            )}

            {/* FIRMAS */}
            <div className="flex mt-16 mb-8 break-inside-avoid">
                <div className="w-1/2 text-center text-[10px] font-bold uppercase text-slate-600">
                    <div className="w-48 mx-auto border-t border-slate-800 pt-2">
                        Firma Taller<br />
                        <span className="font-normal text-[9px] capitalize">{data.funcionario_recibe || "Responsable"}</span>
                    </div>
                </div>
                <div className="w-1/2 text-center text-[10px] font-bold uppercase text-slate-600">
                    <div className="w-48 mx-auto border-t border-slate-800 pt-2">
                        Firma Cliente<br />
                        <span className="font-normal text-[9px] capitalize">{data.funcionario_entrega || "Cliente"}</span>
                    </div>
                </div>
            </div>

        </div>
    )
}
