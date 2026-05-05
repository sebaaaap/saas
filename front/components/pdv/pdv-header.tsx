"use client"

import useSWR from "swr"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
} from "lucide-react"
import { useState, useMemo } from "react"

interface PdvHeaderProps {
  currentOrder: Order
  orders: Order[]
  onNewOrder: () => void
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
  onNewOrder,
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
  const draftOrders = orders.filter((o) => o.status === "draft")
  const selectedCustomer = currentOrder?.customer ?? null

  // Fetch active OTs to show indicators (only those with pending balance)
  const { data: activeOts } = useSWR("/pos/active-orders?pos_only=true", async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/pos/active-orders?pos_only=true`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      return response.json();
    } catch (e) { return [] }
  });

  const customerOts = useMemo(() => {
    if (!selectedCustomer || !activeOts) return [];
    return activeOts.filter((ot: any) =>
      String(ot.customer_id) === selectedCustomer.id ||
      ot.customer?.rut === selectedCustomer.rut
    );
  }, [selectedCustomer, activeOts]);


  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
      {/* Left: Logo + Session */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Wrench className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-black text-foreground leading-none uppercase tracking-tight">Punto de Venta</h1>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
              {userName || 'Usuario'} • {activeSessionName}
            </p>
          </div>
        </div>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* OT Indicator for current order's customer */}
        {selectedCustomer && customerOts.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenOtPayment}
            className="flex items-center gap-1.5 px-2 h-9 rounded-lg border-2 border-orange-500/50 bg-orange-50 text-orange-700 hover:bg-orange-100 animate-pulse transition-all ml-2"
          >
            <Wrench className="h-4 w-4" />
            <div className="flex flex-col items-start leading-none">
              <span className="text-[10px] font-black uppercase tracking-tighter">OT Disponible</span>
              <span className="text-[11px] font-bold">{customerOts.length} {customerOts.length === 1 ? 'pendiente' : 'pendientes'}</span>
            </div>
          </Button>
        )}
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
              <span className={`text-[10px] font-normal truncate max-w-[100px] mt-0.5 ${
                isActive ? "text-primary/70" : "text-muted-foreground/60"
              }`}>
                {tabCustomer ? tabCustomer.name : "Público General"}
              </span>
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
