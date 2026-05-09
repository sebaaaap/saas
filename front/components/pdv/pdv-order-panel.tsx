"use client"

import { useState, useMemo } from "react"
import type { OrderLine, NumpadMode, Customer, Order } from "./pdv-types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toNum } from "@/lib/utils-numbers"
import {
  Trash2, ShoppingBag, Minus, Plus, Car, User,
  ChevronDown, Search, UserPlus, X, UserCheck,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem
} from "@/components/ui/dropdown-menu"
import { PdvQuickCustomer } from "./pdv-quick-customer"

interface PdvOrderPanelProps {
  order: Order
  lines: OrderLine[]
  subtotal: number
  tax: number
  total: number
  selectedLineId: string | null
  onSelectLine: (lineId: string | null) => void
  onUpdateQuantity: (lineId: string, delta: number) => void
  onRemoveLine: (lineId: string) => void
  onPay: () => void
  numpadMode: NumpadMode
  onNumpadModeChange: (mode: NumpadMode) => void
  onNumpadInput: (value: string) => void
  onCargarOt?: () => void // OT_HIDDEN: will be required again when OTs go live
  customersList?: any[]
  onSetCustomer: (customer: Customer | null) => void
  onCustomerCreated?: () => void
}

export function PdvOrderPanel({
  order,
  lines,
  subtotal,
  tax,
  total,
  selectedLineId,
  onSelectLine,
  onUpdateQuantity,
  onRemoveLine,
  onPay,
  numpadMode,
  onNumpadModeChange,
  onNumpadInput,
  onCargarOt,
  customersList = [],
  onSetCustomer,
  onCustomerCreated,
}: PdvOrderPanelProps) {
  const [customerSearch, setCustomerSearch] = useState("")
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false)
  const [customerDropOpen, setCustomerDropOpen] = useState(false)

  const selectedCustomer = order.customer

  const filteredCustomers = useMemo(() => {
    let list = customersList
    if (customerSearch) {
      const t = customerSearch.toLowerCase()
      list = customersList.filter(c =>
        c.name?.toLowerCase().includes(t) ||
        c.rut?.toLowerCase().includes(t) ||
        c.vehicles?.some((v: any) => v.license_plate?.toLowerCase().includes(t))
      )
    }

    // Expandir clientes con múltiples vehículos para que se puedan seleccionar de forma individual
    const expanded: any[] = []
    list.forEach(c => {
      if (!c.vehicles || c.vehicles.length === 0) {
        expanded.push({ ...c, selectedVehicle: null })
      } else {
        c.vehicles.forEach((v: any) => {
          expanded.push({ ...c, selectedVehicle: v })
        })
      }
    })

    // Si hay búsqueda, priorizar los que coinciden con la patente
    if (customerSearch) {
      const t = customerSearch.toLowerCase()
      expanded.sort((a, b) => {
        const aMatchesPlate = a.selectedVehicle?.license_plate?.toLowerCase().includes(t) ? 1 : 0
        const bMatchesPlate = b.selectedVehicle?.license_plate?.toLowerCase().includes(t) ? 1 : 0
        return bMatchesPlate - aMatchesPlate
      })
    }

    return expanded
  }, [customersList, customerSearch])

  return (
    <div className="flex h-full w-[440px] flex-col border-l border-border bg-card">

      {/* ── Customer Strip ─────────────────────────────────────────────── */}
      <div className="border-b border-border px-3 py-2 bg-muted/20">
        {/* flex row: dropdown trigger + optional X button as siblings — never nested buttons */}
        <div className="flex items-center gap-1 w-full">
          <DropdownMenu open={customerDropOpen} onOpenChange={setCustomerDropOpen}>
            <DropdownMenuTrigger asChild>
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setCustomerDropOpen(true)}
                className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all cursor-pointer hover:bg-muted/60 min-w-0 ${
                  selectedCustomer
                    ? "border-primary/40 bg-primary/5 text-primary"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {selectedCustomer
                  ? <UserCheck className="h-3.5 w-3.5 shrink-0" />
                  : <User className="h-3.5 w-3.5 shrink-0" />
                }
                <div className="flex-1 text-left truncate flex flex-col items-start leading-none gap-0.5">
                  <span className="font-semibold">{selectedCustomer?.name ?? "Público en General"}</span>
                  {selectedCustomer?.selectedVehicle && (
                    <span className="text-[10px] font-medium opacity-80 flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      {selectedCustomer.selectedVehicle.license_plate}
                    </span>
                  )}
                </div>
                {selectedCustomer
                  ? <span className="text-[10px] font-mono opacity-60 truncate max-w-[80px]">{selectedCustomer.rut}</span>
                  : <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
                }
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" sideOffset={4} className="w-[400px] p-0 overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b border-border bg-muted/30 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por RUT, nombre o patente..."
                    className="h-8 pl-8 text-xs bg-background"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button
                  size="icon" variant="ghost"
                  className="h-8 w-8 text-primary hover:bg-primary/10 shrink-0"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setCustomerDropOpen(false)
                    setIsQuickCreateOpen(true)
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>

              {/* General option */}
              <DropdownMenuItem
                onClick={() => { onSetCustomer(null); setCustomerSearch("") }}
                className="flex items-center gap-2 px-3 py-2.5 mx-1 my-0.5 rounded-md text-muted-foreground italic text-xs"
              >
                <User className="h-3.5 w-3.5" />
                Público en General
              </DropdownMenuItem>

              {/* Customer list */}
              <div className="max-h-[260px] overflow-auto py-1">
                {filteredCustomers.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground italic">
                    No se encontraron clientes
                  </div>
                ) : (
                  filteredCustomers.map((c: any, index: number) => (
                    <DropdownMenuItem
                      key={`${c.id}-${c.selectedVehicle?.id || index}`}
                      onClick={() => { onSetCustomer(c); setCustomerSearch("") }}
                      className="flex flex-col items-start gap-0.5 px-3 py-2 mx-1 rounded-md"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-sm">{c.name}</span>
                        {c.rut && (
                          <Badge variant="outline" className="text-[10px] font-mono border-muted-foreground/30">
                            {c.rut}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        {c.selectedVehicle && (
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            <Car className="h-3 w-3 text-primary" />
                            {c.selectedVehicle.license_plate}
                            {c.selectedVehicle.brand && <span className="opacity-70 ml-1">({c.selectedVehicle.brand})</span>}
                          </span>
                        )}
                        {c.phone && <span>{c.phone}</span>}
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* X button — sibling of DropdownMenu, NOT nested inside */}
          {selectedCustomer && (
            <button
              type="button"
              onClick={() => onSetCustomer(null)}
              className="shrink-0 flex h-[38px] w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
              title="Quitar cliente"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Order Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Orden</h2>
          <span className="text-xs text-muted-foreground font-mono">#{order.id.slice(-4)}</span>
        </div>
        <Badge variant="secondary" className="rounded-full text-[10px]">
          {lines.length} {lines.length === 1 ? "artículo" : "artículos"}
        </Badge>

      </div>

      {/* ── Lines List ─────────────────────────────────────────────────── */}
      <ScrollArea className="flex-1 custom-scrollbar">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ShoppingBag className="mb-3 h-10 w-10 opacity-20" />
            <p className="text-xs font-medium">Orden vacía</p>
            <p className="text-[11px]">Agrega productos para empezar</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {lines.map((line) => (
              <div
                key={line.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectLine(selectedLineId === line.id ? null : line.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onSelectLine(selectedLineId === line.id ? null : line.id)
                  }
                }}
                className={`group relative flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors ${
                  line.error
                    ? "bg-destructive/10 border-l-2 border-l-destructive"
                    : selectedLineId === line.id
                      ? "bg-primary/5 border-l-2 border-l-primary"
                      : "hover:bg-muted/50"
                }`}
              >
                {/* Quantity Controls */}
                <div className="flex flex-col items-center gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onUpdateQuantity(line.id, 1) }}
                    className={`flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors ${
                      line.error
                        ? "bg-destructive/20 hover:bg-destructive hover:text-white"
                        : "bg-muted hover:bg-primary hover:text-primary-foreground"
                    }`}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <span className={`text-sm font-bold min-w-[24px] text-center ${line.error ? "text-destructive" : "text-foreground"}`}>
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onUpdateQuantity(line.id, -1) }}
                    className={`flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors ${
                      line.error
                        ? "bg-destructive/20 hover:bg-destructive hover:text-white"
                        : "bg-muted hover:bg-destructive hover:text-destructive-foreground"
                    }`}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold leading-tight truncate ${line.error ? "text-destructive" : "text-foreground"}`}>
                    {line.product.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span>${toNum(line.unitPrice).toFixed(2)} c/u</span>
                    {line.discount > 0 && (
                      <Badge variant="destructive" className="h-4 rounded px-1 text-[9px]">
                        -{line.discount}%
                      </Badge>
                    )}
                    {line.product.isVariableConsumption && (
                      <Badge variant="outline" className="h-4 rounded px-1 text-[9px] border-primary/30 text-primary">
                        Consumo: {line.consumptionRate} {line.product.unit || "u."}
                      </Badge>
                    )}
                  </div>
                  {line.error && (
                    <p className="mt-1 text-[10px] font-bold text-destructive animate-pulse">{line.error}</p>
                  )}
                </div>

                {/* Price + Delete */}
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold text-foreground">
                    ${toNum(line.subtotal).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemoveLine(line.id) }}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* ── Numpad ─────────────────────────────────────────────────────── */}
      <div className="border-t border-border px-3 py-3">
        <div className="mb-2 flex gap-1">
          {(["quantity", "discount", "price", "consumption"] as NumpadMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onNumpadModeChange(mode)}
              className={`flex-1 rounded-lg py-1.5 text-[10px] sm:text-[11px] font-semibold transition-all ${
                numpadMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode === "quantity" ? "Cant" : mode === "discount" ? "Desc %" : mode === "price" ? "Precio" : "Consumo"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "CE"].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onNumpadInput(key)}
              className={`flex h-12 items-center justify-center rounded-xl text-base font-bold transition-all active:scale-95 ${
                key === "CE"
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  : "bg-muted text-foreground hover:bg-muted-foreground/10 border border-border/50"
              }`}
            >
              {key === "CE" ? "←" : key}
            </button>
          ))}
        </div>
      </div>

      {/* ── Totals & Pay ───────────────────────────────────────────────── */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>IVA (19%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-dashed border-border pt-2">
            <span className="text-base font-bold text-foreground">Total</span>
            <span className="text-xl font-black text-primary">${total.toFixed(2)}</span>
          </div>
        </div>

        <Button
          onClick={onPay}
          disabled={lines.length === 0}
          className="w-full rounded-xl py-6 text-sm font-bold shadow-lg shadow-primary/25"
          size="lg"
        >
          Cobrar ${total.toFixed(2)}
          {selectedCustomer && (
            <span className="ml-2 text-primary-foreground/70 text-[11px] font-normal truncate max-w-[120px]">
              · {selectedCustomer.name}
            </span>
          )}
        </Button>
      </div>

      <PdvQuickCustomer
        open={isQuickCreateOpen}
        onOpenChange={setIsQuickCreateOpen}
        onSuccess={(customer) => {
          onSetCustomer(customer)
          if (onCustomerCreated) onCustomerCreated()
        }}
      />
    </div>
  )
}
