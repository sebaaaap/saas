"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
    Users, Search, Plus, Car, Bike, Truck,
    Bus, History, ChevronRight, Phone, Mail,
    MapPin, Fingerprint, Calendar, DollarSign,
    MoreVertical, Edit, Trash2, X, Check, ArrowLeft,
    Receipt, ClipboardList, Printer, Clock, Banknote, CreditCard, ArrowLeftRight, Wrench,
    Download, Send, FileText
} from "lucide-react";
import { DocumentTemplate } from "../quotes-ot/DocumentTemplate";
import { usePdfShare } from "@/hooks/usePdfShare";
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from "@/components/ui/sheet";
import { DigitalServiceCard } from "./digital-service-card";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { apiService } from "@/services/apiService";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

const vehicleIcons = {
    automovil: Car,
    motocicleta: Bike,
    camion: Truck,
    furgon: Bus,
    camioneta: Truck,
    otro: MoreVertical
};

interface CustomersModuleProps {
    onBack?: () => void;
}

export default function CustomersModule({ onBack }: CustomersModuleProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const { data: customers, error, isLoading, mutate } = useSWR(
        searchTerm ? `/api/customers?q=${searchTerm}` : "/api/customers",
        () => apiService.getCustomers(searchTerm)
    );

    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
    const [history, setHistory] = useState<any>(null);
    const [selectedSale, setSelectedSale] = useState<any>(null);
    const [selectedOt, setSelectedOt] = useState<any>(null);
    const [selectedQuote, setSelectedQuote] = useState<any>(null);
    const [selectedVehicleForSticker, setSelectedVehicleForSticker] = useState<any>(null);
    const [showPrintPreview, setShowPrintPreview] = useState(false);

    const { generateAndDownloadPDF, handleWhatsAppShare, handleEmailShare } = usePdfShare();

    // Form states
    const [newCustomer, setNewCustomer] = useState({
        name: "",
        rut: "",
        phone: "",
        email: "",
        address: ""
    });

    const [newVehicle, setNewVehicle] = useState({
        license_plate: "",
        brand: "",
        model: "",
        year: new Date().getFullYear(),
        vehicle_type: "automovil",
        color: ""
    });

    // Fetch history when a customer is selected
    useEffect(() => {
        if (selectedCustomer) {
            apiService.getCustomerHistory(selectedCustomer.id).then(setHistory);
        } else {
            setHistory(null);
        }
    }, [selectedCustomer]);

    const handleCreateCustomer = async () => {
        try {
            if (!newCustomer.name || !newCustomer.rut) {
                toast.error("Nombre y RUT son obligatorios");
                return;
            }
            await apiService.createCustomer(newCustomer);
            toast.success("Cliente creado correctamente");
            setIsCreateModalOpen(false);
            setNewCustomer({ name: "", rut: "", phone: "", email: "", address: "" });
            mutate();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error al crear cliente");
        }
    };

    const handleAddVehicle = async () => {
        try {
            if (!newVehicle.license_plate) {
                toast.error("La patente es obligatoria");
                return;
            }
            await apiService.addVehicle(selectedCustomer.id, newVehicle);
            toast.success("Vehículo agregado correctamente");
            setIsAddVehicleModalOpen(false);
            setNewVehicle({
                license_plate: "",
                brand: "",
                model: "",
                year: new Date().getFullYear(),
                vehicle_type: "automovil",
                color: ""
            });
            // Update selected customer to show new vehicle
            const updated = await apiService.getCustomers(selectedCustomer.rut);
            if (updated.length > 0) setSelectedCustomer(updated[0]);
            mutate();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error al agregar vehículo");
        }
    };

    const getFormattedQuoteForPrint = () => {
        if (!selectedQuote || !selectedCustomer) return null;
        return {
            id: selectedQuote.id,
            type: "quote",
            state: selectedQuote.state,
            date: selectedQuote.date,
            date_created: selectedQuote.date,
            customer_name: selectedCustomer.name,
            customer_rut: selectedCustomer.rut,
            customer_email: selectedCustomer.email,
            customer_phone: selectedCustomer.phone,
            vehicle_plate: selectedQuote.vehicle,
            total: selectedQuote.total,
            subtotal: selectedQuote.total / 1.19,
            tax: selectedQuote.total - (selectedQuote.total / 1.19),
            items: selectedQuote.items.map((item: any) => ({
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                subtotal: item.subtotal,
                type: "PRODUCTO"
            }))
        };
    };

    const getShareDataForQuote = () => {
        if (!selectedQuote || !selectedCustomer) return null;
        return {
            id: selectedQuote.id,
            type: "quote" as const,
            customer_name: selectedCustomer.name,
            customer_phone: selectedCustomer.phone,
            customer_email: selectedCustomer.email,
            vehicle_plate: selectedQuote.vehicle,
            total: selectedQuote.total
        };
    };

    return (
        <div className="flex h-screen gap-6 p-6 overflow-hidden bg-background">
            {/* Left: Customer List */}
            <div className="flex flex-col w-1/3 min-w-[350px] gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {onBack ? (
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-muted rounded-full transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        ) : (
                            <Link href="/dashboard" className="p-2 hover:bg-muted rounded-full transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                        )}
                        <h2 className="text-2xl font-bold">Clientes</h2>
                    </div>
                    <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo
                    </Button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre o RUT..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Card className="flex-1 overflow-auto border-border">
                    <div className="divide-y divide-border">
                        {isLoading ? (
                            <div className="p-8 text-center text-muted-foreground italic">Cargando clientes...</div>
                        ) : customers?.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground italic">No se encontraron clientes</div>
                        ) : (
                            customers?.map((customer: any) => (
                                <div
                                    key={customer.id}
                                    onClick={() => setSelectedCustomer(customer)}
                                    className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${selectedCustomer?.id === customer.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                                >
                                    <div className="flex items-center justify-between font-semibold">
                                        <span>{customer.name}</span>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-mono uppercase tracking-wider">
                                        <Fingerprint className="w-3 h-3" />
                                        {customer.rut}
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        {customer.vehicles?.slice(0, 3).map((v: any, i: number) => (
                                            <Badge key={i} variant="secondary" className="text-[10px] py-0 px-1.5 h-5 font-bold">
                                                {v.license_plate}
                                            </Badge>
                                        ))}
                                        {customer.vehicles?.length > 3 && (
                                            <span className="text-[10px] text-muted-foreground">+{customer.vehicles.length - 3}</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* Right: Customer Detail */}
            <div className="flex-1 overflow-auto">
                {selectedCustomer ? (
                    <div className="space-y-6">
                        {/* Header Info */}
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl font-bold">{selectedCustomer.name}</h1>
                                <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Fingerprint className="w-4 h-4" />
                                        <span className="font-mono uppercase">{selectedCustomer.rut}</span>
                                    </div>
                                    {selectedCustomer.phone && (
                                        <div className="flex items-center gap-1">
                                            <Phone className="w-4 h-4" />
                                            <span>{selectedCustomer.phone}</span>
                                        </div>
                                    )}
                                    {selectedCustomer.email && (
                                        <div className="flex items-center gap-1">
                                            <Mail className="w-4 h-4" />
                                            <span>{selectedCustomer.email}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4 mr-2" />
                                Editar Perfil
                            </Button>
                        </div>

                        <Tabs defaultValue="overview" className="space-y-6">
                            <TabsList className="bg-muted border border-border">
                                <TabsTrigger value="overview">Resumen</TabsTrigger>
                                <TabsTrigger value="vehicles">Vehículos ({selectedCustomer.vehicles?.length})</TabsTrigger>
                                <TabsTrigger value="history">Historial de Ventas</TabsTrigger>
                                {/* OT_HIDDEN: <TabsTrigger value="ots">Historial OT</TabsTrigger> */}
                                <TabsTrigger value="quotes">Historial Cotizaciones</TabsTrigger>
                            </TabsList>

                            {/* Overview Tab */}
                            <TabsContent value="overview" className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <Card className="p-4 bg-primary/5 border-primary/20">
                                        <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Total Invertido</div>
                                        <div className="text-2xl font-bold">${history?.summary?.total_amount?.toLocaleString() || '0'}</div>
                                    </Card>
                                    <Card className="p-4 bg-amber-500/5 border-amber-500/20">
                                        <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Visitas Realizadas</div>
                                        <div className="text-2xl font-bold">{history?.summary?.total_count || '0'}</div>
                                    </Card>
                                    <Card className="p-4 bg-emerald-500/5 border-emerald-500/20">
                                        <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Última Visita</div>
                                        <div className="text-2xl font-bold">
                                            {history?.sales?.[0] ? new Date(history.sales[0].date).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </Card>
                                </div>

                                <Card className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Car className="w-5 h-5 text-primary" />
                                            Vehículos Registrados
                                        </h3>
                                        <Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/5" onClick={() => setIsAddVehicleModalOpen(true)}>
                                            <Plus className="w-4 h-4 mr-1" /> Agregar Vehículo
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedCustomer.vehicles?.length === 0 ? (
                                            <div className="col-span-2 text-center py-8 text-muted-foreground italic">No hay vehículos registrados</div>
                                        ) : (
                                            selectedCustomer.vehicles.map((v: any) => (
                                                <div
                                                    key={v.id}
                                                    className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all cursor-pointer group"
                                                    onClick={() => setSelectedVehicleForSticker(v)}
                                                >
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary group-hover:text-white transition-colors">
                                                        {React.createElement(vehicleIcons[v.vehicle_type as keyof typeof vehicleIcons] || Car, { className: "w-6 h-6 text-primary group-hover:text-white" })}
                                                    </div>
                                                    <div>
                                                        <div className="text-lg font-black font-mono tracking-tighter uppercase">{v.license_plate}</div>
                                                        <div className="text-xs text-muted-foreground uppercase">{v.brand} {v.model} {v.year}</div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* Vehicles Tab */}
                            <TabsContent value="vehicles">
                                <Card className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-bold">Administrar Vehículos</h3>
                                        <Button size="sm" onClick={() => setIsAddVehicleModalOpen(true)}>
                                            <Plus className="w-4 h-4 mr-2" /> Agregar Vehículo
                                        </Button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-muted-foreground uppercase border-b">
                                                <tr>
                                                    <th className="px-4 py-3">Tipo</th>
                                                    <th className="px-4 py-3">Patente</th>
                                                    <th className="px-4 py-3">Marca/Modelo</th>
                                                    <th className="px-4 py-3">Color/Año</th>
                                                    <th className="px-4 py-3 text-right">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {selectedCustomer.vehicles?.map((v: any) => (
                                                    <tr key={v.id} className="hover:bg-muted/30">
                                                        <td className="px-4 py-3 capitalize">
                                                            <div className="flex items-center gap-2">
                                                                {React.createElement(vehicleIcons[v.vehicle_type as keyof typeof vehicleIcons] || Car, { className: "w-4 h-4" })}
                                                                {v.vehicle_type}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 font-mono font-bold uppercase">{v.license_plate}</td>
                                                        <td className="px-4 py-3 uppercase">{v.brand} {v.model}</td>
                                                        <td className="px-4 py-3">{v.color || '-'} / {v.year}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* History Tab */}
                            <TabsContent value="history">
                                <Card className="p-6 border-none shadow-sm bg-card/50">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-bold font-display">Historial de Ventas</h3>
                                        <div className="flex gap-2">
                                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                                {history?.sales?.length || 0} Ventas Totales
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="overflow-hidden rounded-xl border border-border">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-[10px] text-muted-foreground uppercase border-b bg-muted/30 font-bold tracking-widest">
                                                <tr>
                                                    <th className="px-6 py-4">Documento</th>
                                                    <th className="px-6 py-4">Fecha / Hora</th>
                                                    <th className="px-6 py-4">Sucursal</th>
                                                    <th className="px-6 py-4">Vehículo</th>
                                                    <th className="px-6 py-4">Pago</th>
                                                    <th className="px-6 py-4">Estado</th>
                                                    <th className="px-6 py-4 text-right">Monto</th>
                                                    <th className="px-6 py-4 text-right">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {history?.sales?.length === 0 ? (
                                                    <tr><td colSpan={7} className="p-12 text-center text-muted-foreground italic">No hay ventas registradas</td></tr>
                                                ) : (
                                                    history?.sales?.map((sale: any) => (
                                                        <tr key={sale.id} className="hover:bg-muted/30 transition-colors group">
                                                            <td className="px-6 py-4">
                                                                <div className="font-bold text-primary">{sale.ticket_number}</div>
                                                                <div className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">{sale.document_type || 'boleta'}</div>
                                                            </td>
                                                            <td className="px-6 py-4 text-xs">
                                                                <div className="font-medium">{new Date(sale.date).toLocaleDateString()}</div>
                                                                <div className="text-muted-foreground">{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <Badge variant="outline" className="font-mono text-primary bg-primary/5 border-primary/20 uppercase text-[10px] tracking-tight">{sale.branch_name || 'Casa Matriz'}</Badge>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <Badge variant="outline" className="font-mono bg-white uppercase text-[10px] tracking-tight">{sale.vehicle}</Badge>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                                                    {sale.payment_method === 'efectivo' ? <Banknote className="w-3.5 h-3.5" /> :
                                                                        sale.payment_method === 'tarjeta' ? <CreditCard className="w-3.5 h-3.5" /> :
                                                                            <ArrowLeftRight className="w-3.5 h-3.5" />}
                                                                    <span className="capitalize">{sale.payment_method}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <Badge
                                                                    variant={sale.state === 'pagado' ? 'default' : sale.state === 'reembolsado' ? 'destructive' : 'secondary'}
                                                                    className={`text-[9px] uppercase font-black px-1.5 h-4.5 ${sale.state === 'pagado' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                                                                >
                                                                    {sale.state}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-black text-slate-900">${sale.total?.toLocaleString()}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-full hover:bg-primary hover:text-white"
                                                                    onClick={() => setSelectedSale(sale)}
                                                                >
                                                                    <ChevronRight className="w-4 h-4" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* OT_HIDDEN: Tab contenido Historial OT oculto. Reactivar cuando OTs estén en producción. */}
                            {/* <TabsContent value="ots"> ... </TabsContent> */}

                            {/* Quotes Tab */}
                            <TabsContent value="quotes">
                                <Card className="p-6 border-none shadow-sm bg-card/50">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-bold font-display">Historial de Cotizaciones</h3>
                                        <Badge variant="outline" className="bg-purple-500/5 text-purple-600 border-purple-500/20">
                                            {history?.quotes?.length || 0} Cotizaciones
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {history?.quotes?.length === 0 ? (
                                            <div className="col-span-2 p-12 text-center text-muted-foreground italic">No hay cotizaciones registradas</div>
                                        ) : (
                                            history?.quotes?.map((quote: any) => (
                                                <div
                                                    key={quote.id}
                                                    className="p-5 rounded-2xl border border-border bg-white hover:border-purple-500/50 hover:shadow-md transition-all cursor-pointer group"
                                                    onClick={() => setSelectedQuote(quote)}
                                                >
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-black text-slate-500">QT-{String(quote.id).slice(0, 6).toUpperCase()}</div>
                                                            <Badge variant="outline" className="text-[9px] bg-primary/5 text-primary border-primary/20 uppercase">{quote.branch_name || 'Casa Matriz'}</Badge>
                                                        </div>
                                                        <Badge
                                                            variant={quote.state === 'aprobado' ? 'default' : quote.state === 'rechazado' ? 'destructive' : 'secondary'}
                                                            className={`text-[9px] uppercase font-black ${quote.state === 'aprobado' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                                                        >
                                                            {quote.state}
                                                        </Badge>
                                                    </div>

                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                                            <Car className="w-5 h-5 text-purple-600" />
                                                        </div>
                                                        <div>
                                                            <div className="text-lg font-black font-mono tracking-tighter uppercase">{quote.vehicle}</div>
                                                            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{new Date(quote.date).toLocaleDateString()}</div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                                        <span className="text-xs font-bold text-slate-500">Monto Cotizado</span>
                                                        <span className="text-base font-black text-slate-900">${quote.total?.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Users className="w-16 h-16 opacity-10 mb-4" />
                        <p className="text-lg font-medium">Selecciona un cliente para ver su detalle</p>
                        <p className="text-sm">Puedes buscar clientes por nombre o RUT en el panel izquierdo</p>
                    </div>
                )}
            </div>

            {/* Modal: Detalle de Venta */}
            <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-white rounded-3xl">
                    {selectedSale && (
                        <>
                            <DialogHeader className="p-8 bg-slate-900 text-white border-b border-slate-800">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Receipt className="w-5 h-5 text-blue-400" />
                                            <DialogTitle className="text-2xl font-black tracking-tight">{selectedSale.ticket_number}</DialogTitle>
                                        </div>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{new Date(selectedSale.date).toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' })}</p>
                                    </div>
                                    <Badge className={`${selectedSale.state === 'pagado' ? 'bg-emerald-500' : 'bg-amber-500'} text-xs font-black uppercase`}>
                                        {selectedSale.state}
                                    </Badge>
                                </div>
                            </DialogHeader>

                            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                                {/* Info Cliente / Vehículo */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cliente / RUT</label>
                                        <p className="font-bold text-slate-900">{selectedCustomer.name}</p>
                                        <p className="font-mono text-sm text-slate-500 font-medium">{selectedCustomer.rut}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Vehículo Relacionado</label>
                                        <p className="font-black text-lg text-slate-900 font-mono italic">{selectedSale.vehicle}</p>
                                    </div>
                                </div>

                                {/* Tabla de Items */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase text-slate-900 border-b pb-2">Detalle de Productos y Servicios</h4>
                                    <div className="rounded-2xl border border-slate-200 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 border-b">
                                                <tr className="text-[10px] font-black uppercase text-slate-500">
                                                    <th className="px-4 py-3 text-left">Producto / Servicio</th>
                                                    <th className="px-4 py-3 text-center">Cant.</th>
                                                    <th className="px-4 py-3 text-right">Unitario</th>
                                                    <th className="px-4 py-3 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {selectedSale.items?.map((item: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3">
                                                            <div className="font-bold text-slate-900">{item.product_name}</div>
                                                            {item.discount > 0 && <span className="text-[10px] font-bold text-emerald-600">Desc. {item.discount}%</span>}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold text-slate-600">{item.quantity}</td>
                                                        <td className="px-4 py-3 text-right font-medium text-slate-600">${item.unit_price?.toLocaleString()}</td>
                                                        <td className="px-6 py-3 text-right font-black text-slate-900">${item.subtotal?.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Totales Finales */}
                                <div className="bg-slate-50 p-6 rounded-2xl space-y-3 border border-slate-200">
                                    <div className="flex justify-between items-center text-sm font-semibold text-slate-600">
                                        <span>Subtotal</span>
                                        <span>${selectedSale.subtotal?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-semibold text-slate-600">
                                        <span>IVA (19%)</span>
                                        <span>${selectedSale.tax?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-xl font-black text-slate-900">
                                        <span>TOTAL PAGADO</span>
                                        <span className="text-2xl text-primary">${selectedSale.total?.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        {selectedSale.payment_method === 'efectivo' ? <Banknote className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-wider opacity-60">Medio de Pago</div>
                                        <div className="text-sm font-bold capitalize">{selectedSale.payment_method}</div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="p-6 bg-slate-50 border-t gap-2">
                                <Button variant="ghost" className="font-bold" onClick={() => setSelectedSale(null)}>Cerrar</Button>
                                <Button className="font-black bg-slate-900 hover:bg-slate-800 text-white gap-2">
                                    <Printer className="w-4 h-4" /> Reimprimir Comprobante
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* OT_HIDDEN: Modal Detalle de OT — reactivar cuando las OTs estén en producción */}
            {/* <Dialog open={!!selectedOt} onOpenChange={() => setSelectedOt(null)}> ... </Dialog> */}
            {false && <Dialog open={!!selectedOt} onOpenChange={() => setSelectedOt(null)}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-white rounded-3xl">
                    {selectedOt && (
                        <>
                            <DialogHeader className="p-8 bg-blue-900 text-white border-b border-blue-800">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Wrench className="w-5 h-5 text-blue-300" />
                                            <DialogTitle className="text-2xl font-black tracking-tight uppercase">Orden de Trabajo #{String(selectedOt.id).slice(0, 6)}</DialogTitle>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest">{new Date(selectedOt.date).toLocaleDateString('es-CL', { dateStyle: 'long' })}</p>
                                            <span className="h-1 w-1 bg-blue-400 rounded-full" />
                                            <p className="text-blue-200 text-[11px] font-bold font-mono">{selectedOt.vehicle}</p>
                                        </div>
                                    </div>
                                    <Badge className={`${selectedOt.state === 'finalizada' ? 'bg-emerald-500' : 'bg-amber-500'} text-xs font-black uppercase`}>
                                        {selectedOt.state}
                                    </Badge>
                                </div>
                            </DialogHeader>

                            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                                {/* Progresos */}
                                <div className="grid grid-cols-2 gap-8 p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                            <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Progreso Técnico</span>
                                            <span>{Math.round(selectedOt.operational_progress)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-600 transition-all duration-700" style={{ width: `${selectedOt.operational_progress}%` }} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Progreso de Pago</span>
                                            <span>{Math.round(selectedOt.financial_progress)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${selectedOt.financial_progress}%` }} />
                                        </div>
                                    </div>
                                </div>

                                {/* Tabla de Items de la OT */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase text-slate-900 border-b pb-2 flex items-center gap-2">
                                        <ClipboardList className="w-4 h-4 text-slate-400" />
                                        Servicios y Repuestos de esta OT
                                    </h4>
                                    <div className="rounded-2xl border border-slate-200 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 border-b">
                                                <tr className="text-[10px] font-black uppercase text-slate-500">
                                                    <th className="px-4 py-3 text-left">Descripción</th>
                                                    <th className="px-4 py-3 text-center">Estado</th>
                                                    <th className="px-4 py-3 text-center">Pago</th>
                                                    <th className="px-4 py-3 text-right">Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {selectedOt.items?.map((item: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-4">
                                                            <div className="font-bold text-slate-900">{item.product_name}</div>
                                                            <div className="text-[10px] text-slate-500 font-medium">Cant: {item.quantity} x ${item.unit_price?.toLocaleString()}</div>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            {item.done ?
                                                                <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-bold px-2 py-0">Listo</Badge> :
                                                                <Badge variant="outline" className="text-[10px] font-bold text-slate-400 px-2 py-0">Pendiente</Badge>
                                                            }
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            {item.is_paid ?
                                                                <span className="text-emerald-600 font-black text-[9px] uppercase tracking-wider">Pagado</span> :
                                                                <span className="text-slate-300 font-bold text-[9px] uppercase tracking-wider">Sin Pago</span>
                                                            }
                                                        </td>
                                                        <td className="px-4 py-4 text-right font-black text-slate-900">${item.subtotal?.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Tickets de Pago (Abonos) */}
                                {selectedOt.tickets && selectedOt.tickets.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black uppercase text-slate-900 border-b pb-2 flex items-center gap-2">
                                            <Banknote className="w-4 h-4 text-emerald-500" />
                                            Abonos y Pagos Recibidos
                                        </h4>
                                        <div className="rounded-2xl border border-emerald-200 overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-emerald-50 border-b border-emerald-100">
                                                    <tr className="text-[10px] font-black uppercase text-emerald-700">
                                                        <th className="px-4 py-3 text-left">Nº Ticket</th>
                                                        <th className="px-4 py-3 text-center">Fecha</th>
                                                        <th className="px-4 py-3 text-center">Método</th>
                                                        <th className="px-4 py-3 text-right">Monto</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-emerald-50">
                                                    {selectedOt.tickets.map((t: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-emerald-50/50 bg-white">
                                                            <td className="px-4 py-3 font-bold text-slate-900">{t.ticket_number}</td>
                                                            <td className="px-4 py-3 text-center text-xs text-slate-500 font-medium">
                                                                {new Date(t.date).toLocaleDateString()}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-600 border-emerald-200">{t.payment_method}</Badge>
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-black text-emerald-600">${t.amount?.toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-emerald-50 border-t border-emerald-100 font-black text-emerald-800">
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-3 text-right uppercase text-[10px] tracking-wider">Total Abonado</td>
                                                        <td className="px-4 py-3 text-right">${selectedOt.tickets.reduce((acc: number, t: any) => acc + t.amount, 0).toLocaleString()}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Gran Total OT */}
                                <div className="flex justify-between items-center p-6 bg-slate-900 text-white rounded-3xl shadow-xl">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-blue-300 tracking-[0.2em] mb-1">Inversión Final de la OT</p>
                                        <h5 className="text-xl font-medium text-slate-400">Total de Orden</h5>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-4xl font-black text-white">${selectedOt.total?.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="p-6 bg-slate-50 border-t">
                                <Button variant="outline" className="font-bold border-2 rounded-xl h-12" onClick={() => setSelectedOt(null)}>Cerrar Detalle</Button>
                                <Button className="font-black bg-blue-600 hover:bg-blue-700 text-white h-12 px-8 rounded-xl shadow-lg shadow-blue-500/20 gap-2">
                                    <Printer className="w-4 h-4" /> Ver Comprobante OT
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>}

            {/* Modal: Detalle de Cotización */}
            <Dialog open={!!selectedQuote} onOpenChange={(open) => !open && setSelectedQuote(null)}>
                {selectedQuote && (
                    <DialogContent className="max-w-3xl bg-card border border-border p-0 overflow-hidden sm:rounded-2xl flex flex-col max-h-[90vh] [&>button]:hidden">
                        <DialogTitle className="sr-only">Detalle de Cotización</DialogTitle>
                        
                        {/* Header */}
                        <div className="px-8 py-5 border-b border-purple-800 flex justify-between items-start bg-purple-900 text-white shrink-0">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Receipt className="w-5 h-5 text-purple-300" />
                                    <h2 className="text-xl font-black tracking-tight uppercase">
                                        Cotización #{String(selectedQuote.id).slice(0, 6)}
                                    </h2>
                                    <Badge className={`ml-2 text-[9px] uppercase font-black ${selectedQuote.state === 'aprobado' ? 'bg-emerald-500' : selectedQuote.state === 'rechazado' ? 'bg-red-500' : 'bg-amber-500'}`}>
                                        {selectedQuote.state}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="text-purple-200 text-[10px] font-black uppercase tracking-widest">{new Date(selectedQuote.date).toLocaleDateString('es-CL', { dateStyle: 'long' })}</p>
                                    <span className="h-1 w-1 bg-purple-400 rounded-full" />
                                    <p className="text-purple-200 text-[11px] font-bold font-mono">{selectedCustomer?.name} • {selectedQuote.vehicle}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 text-purple-300 rounded-lg hover:text-white hover:bg-purple-800 transition-colors" title="Enviar por Correo" onClick={() => getShareDataForQuote() && handleEmailShare("hidden-pdf-container", getShareDataForQuote()!)}>
                                    <Mail size={18} />
                                </button>
                                <button className="p-2 text-purple-300 rounded-lg hover:text-white hover:bg-purple-800 transition-colors" title="Compartir vía WhatsApp" onClick={() => getShareDataForQuote() && handleWhatsAppShare("hidden-pdf-container", getShareDataForQuote()!)}>
                                    <svg viewBox="0 0 24 24" fill="currentColor" height="18" width="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                </button>
                                <button className="p-2 text-purple-300 rounded-lg hover:text-white hover:bg-purple-800 transition-colors" title="Descargar PDF" onClick={() => getShareDataForQuote() && generateAndDownloadPDF("hidden-pdf-container", getShareDataForQuote()!)}>
                                    <Download size={18} />
                                </button>
                                <div className="w-px h-6 bg-purple-800 mx-2" />
                                <button onClick={() => setSelectedQuote(null)} className="p-2 text-purple-300 rounded-lg hover:text-white hover:bg-purple-800 transition-colors" title="Cerrar">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-8 flex-1 overflow-y-auto bg-white">
                            <div className="space-y-4 mb-8">
                                <h4 className="text-xs font-black uppercase text-slate-900 border-b pb-2 flex items-center gap-2">
                                    <ClipboardList className="w-4 h-4 text-slate-400" />
                                    Productos y Servicios Cotizados
                                </h4>
                                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b">
                                            <tr className="text-[10px] font-black uppercase text-slate-500">
                                                <th className="px-4 py-3 text-left">Descripción</th>
                                                <th className="px-4 py-3 text-center">Cant.</th>
                                                <th className="px-4 py-3 text-right">Unitario</th>
                                                <th className="px-4 py-3 text-right">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedQuote.items?.map((item: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-4">
                                                        <div className="font-bold text-slate-900">{item.product_name}</div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center font-bold text-slate-600">{item.quantity}</td>
                                                    <td className="px-4 py-4 text-right font-medium text-slate-600">${item.unit_price?.toLocaleString()}</td>
                                                    <td className="px-4 py-4 text-right font-black text-slate-900">${item.subtotal?.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex justify-between items-center p-6 bg-slate-900 text-white rounded-3xl shadow-xl">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-purple-300 tracking-[0.2em] mb-1">Monto Presupuestado</p>
                                    <h5 className="text-xl font-medium text-slate-400">Total Cotización</h5>
                                </div>
                                <div className="text-right">
                                    <p className="text-4xl font-black text-white">${selectedQuote.total?.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer (Alternative Actions) */}
                        <div className="p-4 bg-card border-t border-border flex justify-between items-center shrink-0">
                            <Button variant="outline" className="font-bold text-muted-foreground" onClick={() => setSelectedQuote(null)}>Cerrar</Button>
                            <Button 
                                className="font-bold bg-purple-800 hover:bg-purple-900 text-white shadow-sm transition-colors"
                                onClick={() => { setShowPrintPreview(true); }}
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Ver Documento PDF
                            </Button>
                        </div>
                    </DialogContent>
                )}
            </Dialog>

            {/* Modal de Vista Previa de Impresión / PDF */}
            <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none bg-slate-100 shadow-2xl">
                    <DialogTitle className="sr-only">Vista Previa de Impresión</DialogTitle>
                    <div className="sticky top-0 z-50 bg-slate-900 text-white px-8 py-4 flex justify-between items-center shadow-xl">
                        <div>
                            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                                <Printer size={24} className="text-primary" /> VISTA PREVIA DEL DOCUMENTO
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">VANKAI KRYPTONITA VULCANIZACIÓN</p>
                        </div>
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                onClick={() => setShowPrintPreview(false)}
                                className="bg-transparent border-slate-700 text-white hover:bg-slate-800 hover:text-white rounded-xl px-6"
                            >
                                <X size={18} className="mr-2" /> Cerrar
                            </Button>
                            <Button
                                onClick={() => getShareDataForQuote() && generateAndDownloadPDF("hidden-pdf-container", getShareDataForQuote()!)}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-8 rounded-xl shadow-lg shadow-primary/40 h-11"
                            >
                                <Download size={18} className="mr-2" /> DESCARGAR PDF
                            </Button>
                        </div>
                    </div>

                    <div className="p-12 pb-24 bg-slate-100 flex justify-center min-h-screen">
                        <div className="bg-white shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-[800px] transform hover:scale-[1.01] transition-transform duration-500">
                            {getFormattedQuoteForPrint() && (
                                <DocumentTemplate data={getFormattedQuoteForPrint()} type="quote" />
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal: Create Customer */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
                        <DialogDescription>
                            Ingresa los datos del cliente para comenzar su historial de servicio.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Nombre</label>
                            <Input
                                className="col-span-3"
                                value={newCustomer.name}
                                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">RUT</label>
                            <Input
                                className="col-span-3 font-mono"
                                value={newCustomer.rut}
                                onChange={(e) => setNewCustomer({ ...newCustomer, rut: e.target.value.toUpperCase() })}
                                placeholder="Ej: 12.345.678-9"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Teléfono</label>
                            <Input
                                className="col-span-3"
                                value={newCustomer.phone}
                                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                placeholder="+56 9 ..."
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Email</label>
                            <Input
                                className="col-span-3"
                                value={newCustomer.email}
                                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                placeholder="ejemplo@email.com"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Dirección</label>
                            <Input
                                className="col-span-3"
                                value={newCustomer.address}
                                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                                placeholder="Av. Los Carrera #123"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateCustomer}>Crear Cliente</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Add Vehicle */}
            <Dialog open={isAddVehicleModalOpen} onOpenChange={setIsAddVehicleModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Agregar Vehículo a {selectedCustomer?.name}</DialogTitle>
                        <DialogDescription>
                            Registra un nuevo vehículo para llevar su trazabilidad de servicio.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Patente</label>
                            <Input
                                className="col-span-3 font-mono font-bold uppercase text-lg"
                                value={newVehicle.license_plate}
                                onChange={(e) => setNewVehicle({ ...newVehicle, license_plate: e.target.value.toUpperCase() })}
                                placeholder="ABCD12 o AB1234"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Tipo</label>
                            <div className="col-span-3">
                                <Select
                                    value={newVehicle.vehicle_type}
                                    onValueChange={(v) => setNewVehicle({ ...newVehicle, vehicle_type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="automovil">Automóvil</SelectItem>
                                        <SelectItem value="motocicleta">Motocicleta</SelectItem>
                                        <SelectItem value="camion">Camión</SelectItem>
                                        <SelectItem value="furgon">Furgón / Bus</SelectItem>
                                        <SelectItem value="camioneta">Camioneta (Pickup)</SelectItem>
                                        <SelectItem value="otro">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Marca</label>
                            <Input
                                className="col-span-3"
                                value={newVehicle.brand}
                                onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                                placeholder="Ej: Toyota"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Modelo</label>
                            <Input
                                className="col-span-3"
                                value={newVehicle.model}
                                onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                                placeholder="Ej: Corolla"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Año</label>
                            <Input
                                type="number"
                                className="col-span-3"
                                value={newVehicle.year}
                                onChange={(e) => setNewVehicle({ ...newVehicle, year: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-semibold">Color</label>
                            <Input
                                className="col-span-3"
                                value={newVehicle.color}
                                onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                                placeholder="Ej: Gris Metálico"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddVehicleModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAddVehicle}>Confirmar Registro</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sticker de Lubricentro (Drawer/Sheet) */}
            <Sheet open={!!selectedVehicleForSticker} onOpenChange={() => setSelectedVehicleForSticker(null)}>
                <SheetContent side="right" className="p-0 sm:max-w-md border-l-0 bg-transparent shadow-none">
                    <SheetTitle className="sr-only">Sticker de Lubricentro</SheetTitle>
                    <div className="h-full p-4">
                        {selectedVehicleForSticker && (
                            <DigitalServiceCard
                                key={selectedVehicleForSticker.id}
                                vehicle={selectedVehicleForSticker}
                                readOnly={true}
                                onSave={async (data) => {
                                    await apiService.updateVehicle(selectedVehicleForSticker.id, { service_info: data });
                                    toast.success("Información de servicio actualizada con éxito");
                                    mutate(); // Actualiza la lista de clientes SWR
                                }}
                                onClose={() => setSelectedVehicleForSticker(null)}
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Hidden Container for PDF Generation */}
            <div style={{ position: "absolute", top: "-9999px", left: "-9999px", pointerEvents: "none", zIndex: -50 }}>
                <div id="hidden-pdf-container" className="bg-white p-12 text-black" style={{ width: "800px", minHeight: "1131px", fontFamily: "Arial, sans-serif" }}>
                    {getFormattedQuoteForPrint() && (
                        <DocumentTemplate data={getFormattedQuoteForPrint()} type="quote" />
                    )}
                </div>
            </div>
        </div>
    );
};
