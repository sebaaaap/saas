import React from "react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock, Wrench, CheckCircle, Car } from "lucide-react"

export type OTStatus = "quote" | "in_progress" | "ready"

export interface VehicleServiceProps {
    id: string
    patente: string
    marcaModelo: string
    clienteNombre: string
    total: number
    abonos: number
    status: OTStatus
    kmActual?: number
    onClick?: () => void
}

export function VehicleServiceCard({
    patente,
    marcaModelo,
    clienteNombre,
    total,
    abonos,
    status,
    kmActual,
    onClick
}: VehicleServiceProps) {
    const isPaidOut = total > 0 && abonos >= total;
    const progressPercent = total > 0 ? (abonos / total) * 100 : 0;

    let statusColor = "bg-slate-100 border-slate-300 text-slate-700"
    let icon = <Clock className="w-5 h-5 text-slate-500" />
    let statusLabel = "Cotización"

    if (status === "in_progress") {
        statusColor = "bg-blue-50 border-blue-300 text-blue-700"
        icon = <Wrench className="w-5 h-5 text-blue-500" />
        statusLabel = "En Progreso"
    } else if (status === "ready") {
        statusColor = "bg-green-50 border-green-300 text-green-700"
        icon = <CheckCircle className="w-5 h-5 text-green-500" />
        statusLabel = "Listo"
    } else if (status === "quote") {
        statusColor = "bg-slate-50 border-slate-300 text-slate-700"
        icon = <Clock className="w-5 h-5 text-slate-500" />
        statusLabel = "Cotización (Pendiente)"
    }

    return (
        <div
            onClick={onClick}
            className={`relative w-full border-2 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer ${statusColor} `}
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-black tracking-tight">{patente.toUpperCase()}</h3>
                    <p className="text-sm font-medium opacity-80 flex items-center gap-1 mt-1"><Car className="w-4 h-4" /> {marcaModelo}</p>
                </div>
                <div className="flex flex-col items-end">
                    <Badge variant="outline" className={`border-current font-bold bg-white/50 backdrop-blur-sm shadow-sm gap-1`}>
                        {icon} {statusLabel}
                    </Badge>
                    {status === "ready" && (
                        <span className="text-xs font-semibold mt-2 animate-pulse text-green-700">¡Llamar al cliente!</span>
                    )}
                </div>
            </div>

            <div className="bg-white/60 p-3 rounded-lg border border-black/5 mb-4">
                <p className="text-sm font-bold text-gray-800">{clienteNombre}</p>
            </div>

            {/* Progress Bar of Payments */}
            <div className="space-y-2 mt-auto">
                <div className="flex justify-between text-sm font-semibold">
                    <span className="text-gray-600">Abonado: ${abonos.toLocaleString("es-CL")}</span>
                    <span className="text-gray-900">Total: ${total.toLocaleString("es-CL")}</span>
                </div>
                <Progress value={progressPercent} className={`h-3 bg-black/10`} />
                {isPaidOut && total > 0 && (
                    <p className="text-xs font-bold text-green-600 text-right">¡Pagado en su totalidad!</p>
                )}
            </div>

            {kmActual && (
                <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between text-xs font-semibold text-gray-600">
                    <span>KM Actual: {kmActual.toLocaleString("es-CL")}</span>
                    <span className="text-blue-700 font-bold bg-blue-100 px-2 py-1 rounded">
                        Sugerir cambio en {(kmActual + 10000).toLocaleString("es-CL")} KM
                    </span>
                </div>
            )}
        </div>
    )
}
