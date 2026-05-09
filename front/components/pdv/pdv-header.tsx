"use client"

// import useSWR from "swr" // OT_HIDDEN: re-enable with OT indicator
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSettings } from "@/hooks/useSettings"
import type { Order } from "./pdv-types"
import {
  ChevronDown,
  ShoppingCart,
  Plus,
  Clock,
  LogOut,
  Settings,
  Wrench,
  LayoutDashboard,
  Car,
  History,
  ArrowUpRight,
  X,
  TrendingUp,
} from "lucide-react"
import { useState, useEffect } from "react"

interface PdvHeaderProps {
  currentOrder: Order
  orders: Order[]
  paidOrders?: Order[]
  onNewOrder: () => void
  onRemoveOrder?: (orderId: string) => void
  onSelectOrder: (order: Order) => void
  onOpenHistory: () => void
  onGoToBackend: () => void
  onOpenCloseSession: () => void
  activeSessionName?: string
  customersList?: any[]
  onCustomerCreated?: () => void
  onOpenOtPayment?: () => void
  onOpenVehicleHistory?: () => void
  onOpenExpenseMode?: () => void
  userName?: string
  sessionId?: string
}

export function PdvHeader({
  currentOrder,
  orders,
  paidOrders = [],
  onNewOrder,
  onRemoveOrder,
  onSelectOrder,
  onOpenHistory,
  onGoToBackend,
  onOpenCloseSession,
  activeSessionName = "Caja Principal",
  onOpenOtPayment,
  onOpenVehicleHistory,
  onOpenExpenseMode,
  userName,
  sessionId,
}: PdvHeaderProps) {
  const { settings } = useSettings()
  const draftOrders = orders.filter((o) => o.status === "draft")
  const selectedCustomer = currentOrder?.customer ?? null

  const [showTraderStats, setShowTraderStats] = useState(false)

  // Toggle trader stats every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setShowTraderStats(prev => !prev)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Calculate session metrics
  const sessionSales = paidOrders.reduce((sum, order) => sum + order.total, 0)
  const sessionCost = paidOrders.reduce((sum, order) => {
    return sum + order.lines.reduce((lineSum, line) => {
      const cost = line.product.cost || 0
      return lineSum + (cost * line.quantity)
    }, 0)
  }, 0)
  
  const sessionProfit = sessionSales - sessionCost

  // OT_HIDDEN: Indicador de OT oculto temporalmente. Descomentar cuando las OTs estén activas.
  // const { data: activeOts } = useSWR("/pos/active-orders?pos_only=true", async () => {
  //   try {
  //     const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/pos/active-orders?pos_only=true`, {
  //       headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  //     });
  //     return response.json();
  //   } catch (e) { return [] }
  // });
  // const customerOts = useMemo(() => {
  //   if (!selectedCustomer || !activeOts) return [];
  //   return activeOts.filter((ot: any) =>
  //     String(ot.customer_id) === selectedCustomer.id ||
  //     ot.customer?.rut === selectedCustomer.rut
  //   );
  // }, [selectedCustomer, activeOts]);


  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
      {/* Left: Logo + Session */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {settings?.logoBase64 ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white p-0.5 border shadow-sm">
              <img src={settings.logoBase64} alt="Logo Empresa" className="h-full w-full rounded-md object-contain" />
            </div>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <div className="flex flex-col justify-center h-[40px] overflow-hidden relative min-w-[240px]">
            {/* Título normal */}
            <div className={`absolute inset-0 flex flex-col justify-center transition-all duration-500 ease-in-out ${showTraderStats ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
              <h1 className="text-sm font-black text-foreground leading-none uppercase tracking-tight mt-0.5">Punto de Venta</h1>
              <p className="text-[11px] text-muted-foreground font-medium mt-1 truncate">
                {userName || 'Usuario'} • {activeSessionName}
              </p>
            </div>
            
            {/* Ticker Trader */}
            <div className={`absolute inset-0 flex flex-col justify-center transition-all duration-500 ease-in-out ${showTraderStats ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
              <h1 className="text-xs font-black text-emerald-600 dark:text-emerald-500 leading-none uppercase tracking-tight flex items-center gap-1 mt-0.5">
                <TrendingUp className="h-3.5 w-3.5" /> VENTAS DE LA SESIÓN
              </h1>
              <p className="text-[12px] font-bold mt-1 text-foreground flex items-center gap-1.5">
                ${sessionSales.toLocaleString()} 
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold">
                  +${sessionProfit.toLocaleString()}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* OT_HIDDEN: Indicador de OT pendiente oculto. Reactivar con OTs. */}
        {/* {selectedCustomer && customerOts.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenOtPayment}
            className="..."
          >
            ...
          </Button>
        )} */}
      </div>

      {/* Center: Order Tabs */}
      <div className="flex items-center gap-1.5">
        {draftOrders.map((order) => {
          const tabCustomer = order.customer
          const isActive = currentOrder.id === order.id
          return (
            <button
              key={order.id}
              type="button"
              onClick={() => onSelectOrder(order)}
              className={`flex flex-col items-start rounded-lg border px-3 py-1.5 text-xs font-medium transition-all min-w-[90px] ${
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-1.5 w-full">
                <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                <span>Orden {order.id.slice(-3)}</span>
                {order.lines.length > 0 && (
                  <Badge
                    variant={isActive ? "default" : "secondary"}
                    className="ml-auto h-5 min-w-[20px] justify-center rounded-full px-1.5 text-[10px]"
                  >
                    {order.lines.length}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 w-full mt-0.5">
                <span className={`text-[10px] font-normal truncate max-w-[80px] ${
                  isActive ? "text-primary/70" : "text-muted-foreground/60"
                }`}>
                  {tabCustomer ? tabCustomer.name : "Público General"}
                </span>
                
                <div 
                  className={`ml-auto p-0.5 rounded-full hover:bg-black/10 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'} z-10`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onRemoveOrder) onRemoveOrder(order.id)
                  }}
                  title="Cerrar orden"
                >
                  <X className="h-3 w-3" />
                </div>
              </div>
            </button>
          )
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewOrder}
          className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-primary"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Historial del Vehículo */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenVehicleHistory}
          title="Historial del Vehículo"
          className="gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10"
        >
          <Car className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Historial</span>
        </Button>

        <div className="h-6 w-px bg-border" />

        {/* Modo Compra / Gasto */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenExpenseMode}
          title="Modo Compra — registrar gastos"
          className="gap-1.5 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Gasto</span>
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenHistory}
          className="gap-1.5 text-xs text-muted-foreground"
        >
          <Clock className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Órdenes</span>
        </Button>

        <div className="h-6 w-px bg-border" />

        {/* Cerrar Sesion Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenCloseSession}
          className="gap-1.5 text-xs rounded-lg border-destructive/30 text-destructive hover:bg-destructive hover:text-white transition-all font-semibold"
        >
          <LogOut className="h-3.5 w-3.5" />
          Cerrar Caja
        </Button>

        <div className="h-6 w-px bg-border" />

        {/* Backend Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onGoToBackend}
          className="gap-1.5 text-xs rounded-lg bg-transparent font-semibold"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Backend
        </Button>
      </div>
    </header>
  )
}
