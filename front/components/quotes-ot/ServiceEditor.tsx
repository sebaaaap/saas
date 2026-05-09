"use client"

import React, { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Car, User, Clock, CheckCircle, FileText, Send, Printer, X, ShoppingCart, Wrench, Download, Mail, Share2, ChevronDown, ChevronUp, Droplet } from "lucide-react"
import { apiService } from "@/services/apiService"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from "@/components/ui/sheet"
import { DigitalServiceCard } from "@/components/backend/digital-service-card"

export type LineItem = {
    id: string
    product_id: string
    name: string
    quantity: number
    price: number
    isService: boolean
}

export function ServiceEditor() {
    const router = useRouter()
    const [mode, setMode] = useState<"quote" | "ot">("quote")

    // Core data
    const [client, setClient] = useState("")
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [carPlate, setCarPlate] = useState("")
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
    const [km, setKm] = useState("")
    const [items, setItems] = useState<LineItem[]>([])

    // API Data
    const [apiProducts, setApiProducts] = useState<any[]>([])
    const [apiCustomers, setApiCustomers] = useState<any[]>([])

    // New item selection (Single Column)
    const [addingType, setAddingType] = useState<"STORABLE" | "SERVICE">("STORABLE")
    const [selectedItemId, setSelectedItemId] = useState("")
    const [itemPrice, setItemPrice] = useState("")
    const [itemQuantity, setItemQuantity] = useState("1")

    // Dialog state
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [savedId, setSavedId] = useState("")
    const [sharingExpanded, setSharingExpanded] = useState(false)
    const [showSticker, setShowSticker] = useState(false)
    const [stickerData, setStickerData] = useState<any>(null)

    // Template state
    const [templates, setTemplates] = useState<any[]>([])

    useEffect(() => {
        // Fetch products and customers
        apiService.getProducts().then(setApiProducts).catch(console.error)
        apiService.getCustomers().then(setApiCustomers).catch(console.error)

        // Load templates from localStorage
        const savedTemplates = localStorage.getItem('saas_quote_templates')
        if (savedTemplates) {
            try {
                setTemplates(JSON.parse(savedTemplates))
            } catch (e) {
                console.error("Error loading templates", e)
            }
        }
    }, [])

    // Case-insensitive/Enum matching fix: backend uses STORABLE, SERVICE, CONSUMABLE
    const filteredAvailableProducts = useMemo(() => {
        return apiProducts.filter(p => {
            if (addingType === "STORABLE") {
                return p.product_type === "STORABLE" || p.product_type === "CONSUMABLE" || !p.product_type
            } else {
                return p.product_type === "SERVICE"
            }
        })
    }, [apiProducts, addingType])

    const totals = useMemo(() => {
        const total = items.reduce((acc, item) => acc + item.quantity * item.price, 0)
        const tax = total * 0.19
        const net = total - tax
        return { total, tax, net }
    }, [items])

    const handleAddItem = () => {
        if (!selectedItemId) {
            toast.error("Selecciona un producto o servicio")
            return
        }

        const prod = apiProducts.find(p => String(p.id) === selectedItemId)
        if (!prod) return

        const price = Number(itemPrice) || Number(prod.price) || 0
        const qty = Number(itemQuantity) || 1

        // Check if the same product already exists → merge quantity
        const existingIndex = items.findIndex(i => i.product_id === String(prod.id) && i.price === price)
        if (existingIndex !== -1) {
            setItems(prev => prev.map((item, idx) =>
                idx === existingIndex ? { ...item, quantity: item.quantity + qty } : item
            ))
            toast.success(`Cantidad actualizada: ${prod.name} (+${qty})`)
        } else {
            const newItem: LineItem = {
                id: Date.now().toString(),
                product_id: String(prod.id),
                name: prod.name,
                quantity: qty,
                price: price,
                isService: addingType === "SERVICE"
            }
            setItems(prev => [...prev, newItem])
            toast.success(`${addingType === 'SERVICE' ? 'Servicio' : 'Producto'} añadido`)
        }

        setSelectedItemId("")
        setItemPrice("")
        setItemQuantity("1")
    }

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id))
    }

    const handleUpdateQuantity = (id: string, newQty: string) => {
        setItems(items.map(item => item.id === id ? { ...item, quantity: Number(newQty) } : item))
    }

    const handleUpdatePrice = (id: string, newPrice: string) => {
        setItems(items.map(item => item.id === id ? { ...item, price: Number(newPrice) } : item))
    }

    const handleSave = async () => {
        if (items.length === 0) {
            toast.error("Agrega al menos un ítem a la cotización/OT")
            return
        }

        if (!client) {
            toast.error("Selecciona o ingresa un cliente")
            return
        }

        try {
            // Find customer id if possible
            const customer = apiCustomers.find(c => c.name === client)
            if (!customer) {
                toast.error("Cliente no encontrado en la base de datos")
                return
            }

            const payload = {
                customer_id: customer.id,
                vehicle_id: selectedVehicle ? selectedVehicle.id : null,
                mileage: km ? Number(km) : null,
                items: items.map(i => ({
                    product_id: i.product_id,
                    quantity: i.quantity,
                    unit_price: i.price
                })),
                service_info: stickerData,
                is_ot: mode === 'ot'
            }

            toast.info("Guardando documento...")
            const res = await apiService.createQuote(payload)
            setSavedId(String(res.id).slice(0, 6).toUpperCase())
            setShowSuccessModal(true)
            toast.success("Documento guardado correctamente")
        } catch (error) {
            console.error(error)
            toast.error("Error al guardar el documento en el servidor")
        }
    }

    const handlePrint = () => {
        toast.info("Enviando a impresora...")
        setShowSuccessModal(false)
        router.push("/quotes-ot")
    }

    const handleSend = () => {
        toast.info("Abriendo envío por WhatsApp / Correo...")
        setShowSuccessModal(false)
        router.push("/quotes-ot")
    }

    const handleExport = () => {
        toast.success("PDF descargado!")
        setShowSuccessModal(false)
        router.push("/quotes-ot")
    }

    return (
        <div className="flex flex-col h-full w-full max-w-[1800px] mx-auto pb-12 px-2 md:px-0">
            <div className="w-full max-w-full bg-card rounded-2xl border border-border flex flex-col md:flex-row overflow-hidden shadow-sm mb-8 min-h-[850px]">
                {/* Sidebar Izquierdo - Datos Principales */}
                <div className="w-full md:w-[400px] bg-muted/20 p-12 border-r border-border flex flex-col gap-10 shrink-0">
                    <div>
                        <h2 className="text-3xl font-black text-foreground tracking-tight mb-3">
                            {mode === "quote" ? "Nueva Cotización" : "Orden de Trabajo"}
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${mode === 'quote' ? 'bg-yellow-100/50 text-yellow-700 border-yellow-200' : 'bg-blue-100/50 text-blue-700 border-blue-200'}`}>
                                <div className={`w-2 h-2 rounded-full ${mode === 'quote' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                                {mode === "quote" ? "Modo Cotización" : "Modo OT"}
                            </span>
                        </div>
                    </div>

                    {/* OT_HIDDEN: Selector de Modo Odoo Style */}
                    {/* <div className="bg-card border border-border rounded-xl p-1 flex">
                        <button
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'quote' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setMode('quote')}
                        >
                            Cotización
                        </button>
                        <button
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'ot' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setMode('ot')}
                        >
                            Orden de Trabajo
                        </button>
                    </div> */}

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5"><User size={14} /> Cliente</label>
                            <input
                                list="customers"
                                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="Buscar Cliente..."
                                value={client}
                                onChange={e => {
                                    const val = e.target.value
                                    setClient(val)
                                    const cust = apiCustomers.find(c => c.name === val)
                                    if (cust) {
                                        setSelectedCustomer(cust)
                                        // Auto-select first vehicle if it's único
                                        if (cust.vehicles?.length === 1) {
                                            setCarPlate(cust.vehicles[0].license_plate)
                                            setSelectedVehicle(cust.vehicles[0])
                                        } else {
                                            setCarPlate("")
                                            setSelectedVehicle(null)
                                        }
                                    } else {
                                        setSelectedCustomer(null)
                                    }
                                }}
                            />
                            <datalist id="customers">
                                {apiCustomers.map(c => <option key={c.id} value={c.name} />)}
                            </datalist>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5"><Car size={14} /> Patente / Vehículo</label>
                            {selectedCustomer && selectedCustomer.vehicles?.length > 0 ? (
                                <select
                                    className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    value={carPlate}
                                    onChange={e => {
                                        const val = e.target.value
                                        if (val === "NEW") {
                                            setCarPlate("")
                                            setSelectedVehicle(null)
                                        } else {
                                            setCarPlate(val)
                                            const v = selectedCustomer.vehicles.find((v: any) => v.license_plate === val)
                                            setSelectedVehicle(v)
                                        }
                                    }}
                                >
                                    <option value="" className="tracking-normal font-medium normal-case">Seleccionar Patente...</option>
                                    {selectedCustomer.vehicles.map((v: any) => (
                                        <option key={v.id} value={v.license_plate}>
                                            {v.license_plate} - {v.brand} {v.model}
                                        </option>
                                    ))}
                                    <option value="NEW" className="tracking-normal font-medium normal-case">+ Otra patente...</option>
                                </select>
                            ) : (
                                <input
                                    className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:normal-case placeholder:tracking-normal placeholder:font-medium"
                                    placeholder="Ej: KXPS-22"
                                    value={carPlate}
                                    onChange={e => {
                                        const val = e.target.value.toUpperCase()
                                        setCarPlate(val)
                                        // Optional: if it matches some vehicle globally, select it
                                    }}
                                />
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5"><Clock size={14} /> Kilometraje Actual</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pr-12"
                                    placeholder="0"
                                    value={km}
                                    onChange={e => setKm(e.target.value)}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase">KM</span>
                            </div>
                        </div>

                        {mode === 'ot' && selectedVehicle && (
                            <div className="space-y-2 pt-2">
                                <Button
                                    onClick={() => setShowSticker(true)}
                                    variant="outline"
                                    className="w-full h-12 bg-white border-2 border-emerald-500/20 text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 hover:border-emerald-500/40 transition-all flex items-center justify-center gap-2 group shadow-sm"
                                >
                                    <Droplet className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                                    <span>Sticker Lubricentro {stickerData ? "✓" : ""}</span>
                                </Button>
                                <p className="text-[10px] text-muted-foreground font-medium text-center italic">
                                    Define aceites, filtros y próximos servicios
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Panel - Editor */}
                <div className="flex-1 flex flex-col min-h-[850px] relative">
                    {/* Overlay de Bloqueo por Cliente */}
                    {!client.trim() && (
                        <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[2px] flex items-center justify-center rounded-r-2xl">
                            <div className="bg-card p-6 rounded-2xl border border-border shadow-xl text-center max-w-xs flex flex-col items-center animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                    <User className="text-primary w-8 h-8" />
                                </div>
                                <h4 className="font-black text-foreground text-lg mb-1">Selecciona un Cliente</h4>
                                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                                    Ingresa el nombre o selecciona un cliente en el panel izquierdo para desbloquear el editor.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="p-8 border-b border-border bg-card">

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <h3 className="text-sm font-bold text-foreground">Añadir Tareas o Productos</h3>

                            {/* Plantillas de Cotización */}
                            <div className="flex items-center gap-2">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase">Plantillas:</label>
                                <select 
                                    className="bg-card border border-border rounded-xl px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm w-48"
                                    onChange={(e) => {
                                        const tName = e.target.value;
                                        if (tName) {
                                            const template = templates.find(t => t.name === tName);
                                            if (template) {
                                                toast.info(`Cargando plantilla: ${tName}`);
                                                // Create new items with new IDs but same data
                                                const newItems = template.items.map((item: any) => ({
                                                    ...item,
                                                    id: Date.now().toString() + Math.random().toString(36).substring(7)
                                                }));
                                                setItems(newItems);
                                                toast.success("Plantilla cargada con éxito");
                                            }
                                            e.target.value = "";
                                        }
                                    }}
                                >
                                    <option value="">Seleccionar plantilla...</option>
                                    {templates.length === 0 && <option disabled>No hay plantillas guardadas</option>}
                                    {templates.map((t, idx) => (
                                        <option key={idx} value={t.name}>{t.name} ({t.items.length} ítems)</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Fila de Selección Unificada */}
                        <div className={`p-6 rounded-2xl border transition-all ${addingType === 'SERVICE' ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'}`}>
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                                <div className="lg:col-span-6 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                            Busca un {addingType === 'SERVICE' ? 'Servicio' : 'Producto'}
                                        </label>
                                        
                                        {/* Switch de Tipo (Producto vs Servicio) Movido Aquí */}
                                        <div className="flex bg-muted p-0.5 rounded-lg border border-border">
                                            <button
                                                className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold rounded-md transition-all ${addingType === 'STORABLE' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                                onClick={() => {
                                                    setAddingType('STORABLE')
                                                    setSelectedItemId("")
                                                }}
                                            >
                                                <ShoppingCart size={12} />
                                                Producto
                                            </button>
                                            <button
                                                className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold rounded-md transition-all ${addingType === 'SERVICE' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                                onClick={() => {
                                                    setAddingType('SERVICE')
                                                    setSelectedItemId("")
                                                }}
                                            >
                                                <Wrench size={12} />
                                                Servicio
                                            </button>
                                        </div>
                                    </div>
                                    <select
                                        className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                                        value={selectedItemId}
                                        onChange={e => {
                                            setSelectedItemId(e.target.value)
                                            const p = apiProducts.find(x => String(x.id) === e.target.value)
                                            if (p) {
                                                setItemPrice(String(p.price))
                                                if (addingType === "SERVICE") setItemQuantity("1")
                                            }
                                        }}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {filteredAvailableProducts.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} - ${Number(p.price).toLocaleString()}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="lg:col-span-2 space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cant.</label>
                                    <input
                                        type="number"
                                        className="w-full bg-card border border-border rounded-xl px-3 py-3 text-sm font-bold text-center focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                                        value={itemQuantity}
                                        onChange={e => setItemQuantity(e.target.value)}
                                        disabled={addingType === 'SERVICE'}
                                    />
                                </div>

                                <div className="lg:col-span-2 space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Precio Unit.</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                                        <input
                                            type="number"
                                            className="w-full bg-card border border-border rounded-xl pl-7 pr-3 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                                            value={itemPrice}
                                            onChange={e => setItemPrice(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="lg:col-span-2">
                                    <button
                                        onClick={handleAddItem}
                                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <CheckCircle size={16} />
                                        Añadir
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabla de Items */}
                    <div className="flex-1 overflow-auto bg-muted/5 px-8 py-4">
                        {items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 py-12">
                                <FileText size={56} strokeWidth={1} className="mb-3" />
                                <p className="text-sm font-semibold text-muted-foreground">No hay productos o servicios en esta orden.</p>
                                <p className="text-[11px] mt-1">Usa el panel de selección superior para añadir elementos.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left bg-card rounded-2xl overflow-hidden border border-border shadow-sm">
                                <thead>
                                    <tr className="bg-muted/50 border-b border-border">
                                        <th className="px-5 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-widest">Tipo</th>
                                        <th className="px-5 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-widest">Descripción</th>
                                        <th className="px-5 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-widest text-center">Cant.</th>
                                        <th className="px-5 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-widest text-right">Unitario</th>
                                        <th className="px-5 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-widest text-right">Subtotal</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(item => {
                                        const totalItem = item.price * item.quantity
                                        return (
                                            <tr key={item.id} className="border-b border-border/50 last:border-b-0 group hover:bg-muted/20 transition-colors">
                                                <td className="px-5 py-4">
                                                    {item.isService ?
                                                        <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded flex items-center gap-1.5 w-fit whitespace-nowrap">
                                                            <Wrench size={10} /> SERV.
                                                        </span> :
                                                        <span className="bg-muted text-muted-foreground text-[10px] font-black px-2 py-1 rounded flex items-center gap-1.5 w-fit whitespace-nowrap">
                                                            <ShoppingCart size={10} /> PROD.
                                                        </span>
                                                    }
                                                </td>
                                                <td className="px-5 py-4 font-bold text-base text-foreground max-w-[300px] truncate">{item.name}</td>
                                                <td className="px-5 py-4 text-center">
                                                    <input
                                                        type="number"
                                                        className="w-16 bg-muted/40 rounded-lg py-1.5 text-center text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                        value={item.quantity}
                                                        onChange={e => handleUpdateQuantity(item.id, e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <input
                                                        type="number"
                                                        className="w-28 bg-muted/40 rounded-lg py-1.5 px-2 text-right text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                        value={item.price}
                                                        onChange={e => handleUpdatePrice(item.id, e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-5 py-4 text-right font-black text-base text-foreground whitespace-nowrap">
                                                    ${totalItem.toLocaleString("es-CL")}
                                                </td>
                                                <td className="px-2 py-2.5 text-center">
                                                    <button onClick={() => handleRemoveItem(item.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
                                                        <X size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Footer / Totales */}
                    <div className="bg-card border-t border-border p-8 flex flex-col md:flex-row justify-between items-center gap-8 shrink-0">
                        {/* Summary Block */}
                        <div className="w-full md:w-72 space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                                <span>Neto</span>
                                <span>${totals.net.toLocaleString("es-CL", { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                                <span>IVA (19%)</span>
                                <span>${totals.tax.toLocaleString("es-CL", { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="h-px bg-border my-2" />
                            <div className="flex justify-between items-center text-primary">
                                <span className="text-sm font-black uppercase tracking-widest">Total</span>
                                <span className="text-3xl font-black">${totals.total.toLocaleString("es-CL")}</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-4 w-full md:w-auto">
                            <button
                                onClick={() => router.push("/quotes-ot")}
                                className="px-6 py-4 text-sm font-bold rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-all active:scale-95 shadow-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    if (items.length === 0) return toast.error("Agrega ítems para guardar como plantilla");
                                    const templateName = window.prompt("Ingresa un nombre para esta plantilla (ej: Afinamiento Básico):");
                                    if (!templateName || templateName.trim() === "") return;
                                    
                                    const newTemplate = {
                                        name: templateName.trim(),
                                        items: items
                                    };
                                    
                                    const updatedTemplates = [...templates, newTemplate];
                                    setTemplates(updatedTemplates);
                                    localStorage.setItem('saas_quote_templates', JSON.stringify(updatedTemplates));
                                    
                                    toast.success(`Plantilla "${templateName}" guardada correctamente`);
                                }}
                                className="px-6 py-4 text-sm font-bold rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-all active:scale-95 shadow-sm"
                            >
                                Guardar como Plantilla
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center justify-center gap-2 px-10 py-4 text-sm font-black rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 active:scale-95"
                            >
                                {mode === 'quote' ? (
                                    <><Clock size={16} /> Guardar Cotización</>
                                ) : (
                                    <><CheckCircle size={16} /> Generar Orden</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Finalización */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="max-w-md bg-card border border-border p-0 overflow-hidden sm:rounded-3xl shadow-2xl">
                    <DialogTitle className="sr-only">Confirmación de Guardado</DialogTitle>
                    <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-10 flex flex-col items-center justify-center text-primary-foreground space-y-4">
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center shadow-inner backdrop-blur-sm">
                            <CheckCircle size={40} className="text-white drop-shadow-md" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-black tracking-tight text-white drop-shadow-sm">¡Documento Guardado!</h2>
                            <p className="text-primary-foreground/90 font-medium text-sm mt-1">
                                Folio: <strong className="font-black text-white">{savedId}</strong>
                            </p>
                        </div>
                    </div>

                    <div className="p-8 bg-card space-y-4">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-center mb-6 opacity-60">
                            Documentación e Impresión
                        </p>

                        <div className="grid grid-cols-1 gap-4">
                            <Button onClick={handlePrint} variant="outline" className="h-16 flex items-center justify-center gap-3 font-bold border-2 border-border hover:border-primary/50 hover:bg-primary/5 group transition-all rounded-2xl shadow-sm">
                                <Printer className="text-muted-foreground group-hover:text-primary transition-colors" size={20} />
                                <div className="flex flex-col text-left">
                                    <span className="text-[13px] uppercase tracking-tight">Impresión de Oficina</span>
                                    <span className="text-[9px] text-muted-foreground font-medium uppercase">Formato PDF A4/Carta</span>
                                </div>
                            </Button>
                        </div>

                        <div className="space-y-3 pt-2">
                            <button
                                onClick={() => setSharingExpanded(!sharingExpanded)}
                                className={`w-full h-14 flex items-center justify-between px-6 rounded-2xl border-2 font-bold transition-all ${sharingExpanded ? 'bg-primary border-primary text-primary-foreground shadow-lg' : 'bg-card border-border text-foreground hover:bg-muted'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <Share2 size={20} className={sharingExpanded ? 'text-primary-foreground' : 'text-primary'} />
                                    <span>Compartir Orden</span>
                                </div>
                                {sharingExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>

                            {sharingExpanded && (
                                <div className="grid grid-cols-1 gap-2 animate-in slide-in-from-top-2 duration-200">
                                    <Button onClick={handleSend} variant="outline" className="w-full h-12 justify-start text-sm font-bold border-2 hover:bg-[#25D366]/5 hover:border-[#25D366]/30 group px-5 rounded-xl border-border transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="mr-3 text-[#25D366] group-hover:scale-110 transition-transform">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                                        </svg>
                                        <span>Enviar por WhatsApp</span>
                                    </Button>

                                    <Button onClick={() => toast.info("Abriendo cliente de correo...")} variant="outline" className="w-full h-12 justify-start text-sm font-bold border-2 hover:bg-blue-50 hover:border-blue-500/30 group px-5 rounded-xl border-blue-500/10 transition-all">
                                        <Mail className="mr-3 text-blue-500 group-hover:scale-110 transition-transform" size={18} />
                                        <span>Enviar por Correo Email</span>
                                    </Button>

                                    <Button onClick={handleExport} variant="outline" className="w-full h-12 justify-start text-sm font-bold border-2 hover:bg-red-50 hover:border-red-500/30 group px-5 rounded-xl border-red-500/10 transition-all">
                                        <Download className="mr-3 text-red-500 group-hover:rotate-6 transition-transform" size={18} />
                                        <span>Descargar PDF</span>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 bg-muted/20 border-t border-border flex justify-center">
                        <Button onClick={() => { setShowSuccessModal(false); router.push("/quotes-ot") }} variant="ghost" className="text-muted-foreground font-black text-xs tracking-widest uppercase hover:text-foreground">
                            Cerrar y Volver
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Sticker de Lubricentro (Drawer/Sheet) */}
            <Sheet open={showSticker} onOpenChange={setShowSticker}>
                <SheetContent side="right" className="p-0 sm:max-w-md border-l-0 bg-transparent shadow-none">
                    <SheetTitle className="sr-only">Sticker de Lubricentro</SheetTitle>
                    <div className="h-full p-4">
                        <DigitalServiceCard
                            vehicle={selectedVehicle}
                            data={stickerData}
                            readOnly={false}
                            onSave={async (data) => {
                                setStickerData(data)
                                setShowSticker(false)
                                toast.success("Información de lubricación vinculada a la orden")
                            }}
                            onClose={() => setShowSticker(false)}
                        />
                    </div>
                </SheetContent>
            </Sheet>

        </div>
    )
}
