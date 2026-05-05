"use client"

import React from "react"
import { QuoteOtItem } from "./quotes-ot-manager"
import { useSettings } from "@/hooks/useSettings"

interface DocumentTemplateProps {
    data: QuoteOtItem
    type: "quote" | "ot"
}

export function DocumentTemplate({ data, type }: DocumentTemplateProps) {
    const { settings, isLoaded } = useSettings()

    const isOT = type === "ot" || data.type === "ot"
    const title = isOT ? "ORDEN DE TRABAJO" : "PRESUPUESTO"
    const nroStr = isOT ? "OT" : "COT"

    // Configurable business details, fallback to static if not set
    const logoUrl = settings.logoBase64 || "/fblogo3.png"
    const businessName = settings.businessName || "VANKAI"
    const businessDescription = settings.description || "KRYPTONITA VULCANIZA"
    const address = settings.address || "Av. Central 1234, Santiago, Chile"
    const phone = settings.phone || "+56 9 1234 5678"
    const email = settings.email || "contacto@vankai.cl"
    const website = settings.website || "www.vankai.cl"

    // Mapeo de datos para los cálculos
    const subtotalNeto = data.total / 1.19
    const iva = data.total - subtotalNeto
    const total = data.total

    if (!isLoaded) {
        return <div className="p-8 text-center text-muted-foreground">Cargando documento...</div>;
    }

    return (
        <div id="document-to-print" className="bg-white text-black p-4 md:p-8 max-w-[800px] mx-auto font-sans text-[13px] leading-tight print:p-0">
            {/* ENCABEZADO */}
            <div className="flex justify-between items-start mb-6">
                <div className="w-1/2 pt-2">
                    <div className="font-bold text-lg leading-tight uppercase">{businessName}</div>
                    <div className="uppercase tracking-widest text-[10px] mb-4">{businessDescription}</div>
                    <div className="text-xs leading-relaxed">
                        {address}<br />
                        {phone}<br />
                        {email}<br />
                        {website}
                    </div>
                </div>
                <div className="w-1/2 flex flex-col items-end">
                    {/* Logo dinámico */}
                    <img src={logoUrl} alt="Logo" className="max-h-20 object-contain mb-8" />

                    {/* Tabla Cliente */}
                    <table className="w-[90%] text-xs border-collapse border border-black max-w-sm">
                        <tbody>
                            <tr className="bg-[#e6ebeb]">
                                <td className="border border-black p-1.5 font-bold">CLIENTE</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-2 leading-relaxed">
                                    {data.customer_name}<br />
                                    DUI/RUT: {data.customer_rut || "N/A"}<br />
                                    Placa de {data.vehicle_model?.toLowerCase().includes("moto") ? "moto" : "vehículo"}: {data.vehicle_plate}<br />
                                    Modelo: {data.vehicle_model || "N/A"}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="h-6"></div>

            {/* FECHA / VALIDEZ / Nº COTIZACIÓN */}
            <table className="w-full text-xs border-collapse border border-black mb-6 text-center">
                <thead>
                    <tr className="bg-[#e6ebeb]">
                        <th className="border border-black p-2 font-bold w-1/3">Fecha del presupuesto</th>
                        <th className="border border-black p-2 font-bold w-1/3">Validez</th>
                        <th className="border border-black p-2 font-bold w-1/3">Nº de Cotización</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="border border-black p-2">{data.date_created}</td>
                        <td className="border border-black p-2">15 días</td>
                        <td className="border border-black p-2">{nroStr}-{data.date_created.split('-')[0]}-{data.id.slice(0, 4)}</td>
                    </tr>
                </tbody>
            </table>

            <div className="h-2"></div>

            {/* TABLA PRINCIPAL */}
            <table className="w-full text-xs border-collapse border border-black mb-6">
                <thead>
                    <tr className="bg-[#e6ebeb]">
                        <th className="border border-black p-2 text-left font-bold">DESCRIPCIÓN</th>
                        <th className="border border-black p-2 text-center font-bold w-20">UNIDADES</th>
                        <th className="border border-black p-2 text-center font-bold w-24">PRECIO</th>
                        <th className="border border-black p-2 text-center font-bold w-24">IVA (19%)</th>
                        <th className="border border-black p-2 text-center font-bold w-28">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    {data.items.map((item, index) => {
                        const rowTotal = item.price * item.quantity;
                        const rowNeto = rowTotal / 1.19;
                        const rowIva = rowTotal - rowNeto;
                        // alternate lightgray and white
                        const bgColor = index % 2 !== 0 ? "bg-[#e6ebeb]" : "bg-white";
                        return (
                            <tr key={index} className={bgColor}>
                                <td className="border-x border-black p-2">{item.product_name}</td>
                                <td className="border-x border-black p-2 text-center">{item.quantity}</td>
                                <td className="border-x border-black p-2 text-center">$ {Math.round(rowNeto).toLocaleString("es-CL")}</td>
                                <td className="border-x border-black p-2 text-center">$ {Math.round(rowIva).toLocaleString("es-CL")}</td>
                                <td className="border-x border-black p-2 text-center">$ {Math.round(rowTotal).toLocaleString("es-CL")}</td>
                            </tr>
                        )
                    })}
                    {/* Padding row */}
                    <tr>
                        <td className="border-x border-b border-black p-2 h-24"></td>
                        <td className="border-x border-b border-black p-2 h-24"></td>
                        <td className="border-x border-b border-black p-2 h-24"></td>
                        <td className="border-x border-b border-black p-2 h-24"></td>
                        <td className="border-x border-b border-black p-2 h-24"></td>
                    </tr>
                </tbody>
            </table>

            <div className="h-2"></div>

            {/* TOTALES */}
            <div className="flex justify-end mb-16">
                <table className="text-xs border-collapse border border-black w-72">
                    <tbody>
                        <tr>
                            <td className="border border-black p-2 text-left">SUB-TOTAL NETO</td>
                            <td className="border border-black p-2 text-right">$ {Math.round(subtotalNeto).toLocaleString("es-CL")}</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-2 text-left">DESCUENTO</td>
                            <td className="border border-black p-2 text-right">$ 0</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-2 text-left">IVA 19%</td>
                            <td className="border border-black p-2 text-right">$ {Math.round(iva).toLocaleString("es-CL")}</td>
                        </tr>
                        <tr className="bg-[#e6ebeb] font-bold">
                            <td className="border border-black p-2 text-left">TOTAL PRESUPUESTADO</td>
                            <td className="border border-black p-2 text-right">$ {Math.round(total).toLocaleString("es-CL")}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* FIRMAS */}
            <div className="flex mt-8 mb-16">
                <div className="w-1/2 text-center text-sm font-medium">
                    <div className="w-48 mx-auto border-t border-black pt-1">
                        Firma
                    </div>
                </div>
                <div className="w-1/2 text-center text-sm font-medium">
                    <div className="w-48 mx-auto border-t border-black pt-1">
                        Firma del cliente
                    </div>
                </div>
            </div>

            <div className="h-6"></div>

            <div className="border-t border-black mb-[2px]"></div>
            <div className="border-t border-black"></div>
        </div>
    )
}
