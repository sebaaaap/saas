"use client"

import type { Product } from "./pdv-types"
import { Search, Package, AlertTriangle, Wrench } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface PdvProductGridProps {
  products: Product[]
  selectedCategoryId: string
  onAddProduct: (product: Product) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function PdvProductGrid({
  products,
  selectedCategoryId,
  onAddProduct,
  searchQuery,
  onSearchChange,
}: PdvProductGridProps) {
  const filteredProducts = products

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      {/* Search Bar */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar producto o escanear codigo de barras..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="form-input pl-10"
          />
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-20">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Package className="mb-3 h-12 w-12 opacity-30" />
            <p className="text-sm font-medium">No se encontraron productos</p>
            <p className="text-xs">Intenta con otra busqueda o categoria</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product) => {
              const isService = product.productType === "SERVICE" || product.categoryId === "servicios" || String(product.categoryId).toLowerCase().includes("serv")
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onAddProduct(product)}
                  disabled={product.stock <= 0 && !isService}
                  className={`group relative flex flex-col items-start rounded-xl border p-3.5 text-left transition-all hover:brightness-95 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${!isService && product.stock > 0 && product.stock <= (product.stockMin ?? 5) ? 'animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.15)]' : ''}`}
                  style={{
                    backgroundColor: `${product.color}15`,
                    borderColor: !isService && product.stock > 0 && product.stock <= (product.stockMin ?? 5) ? '#f97316' : `${product.color}30`
                  }}
                >
                  {/* Stock Warning */}
                  {!isService && (product.stock <= (product.stockMin ?? 5)) && product.stock > 0 && (
                    <div className="absolute right-2 top-2 animate-pulse">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </div>
                  )}
                  {!isService && product.stock <= 0 && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[1px]">
                      <Badge variant="destructive" className="rounded-lg font-black uppercase tracking-tighter">Sin Stock</Badge>
                    </div>
                  )}

                  {/* Product Icon Area */}
                  <div
                    className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-white/60 shadow-sm`}
                  >
                    {isService ? (
                      <Wrench className="h-5 w-5" style={{ color: product.color }} />
                    ) : (
                      <Package className="h-5 w-5" style={{ color: product.color }} />
                    )}
                  </div>

                  {/* Product Info */}
                  <span className="mb-1 line-clamp-2 text-xs font-semibold leading-tight text-foreground">
                    {product.name}
                  </span>

                  <div className="mt-auto flex w-full items-end justify-between">
                    <span className="text-base font-bold text-primary">
                      ${product.price ? product.price.toFixed(2) : "0.00"}
                    </span>
                    {product.unit && (
                      <Badge
                        variant="outline"
                        className="h-5 rounded-md px-1.5 text-[9px] font-medium"
                      >
                        {product.unit}
                      </Badge>
                    )}
                  </div>

                  {/* Stock Info */}
                  <span className={`mt-1.5 text-[10px] font-medium flex items-center justify-between w-full ${!isService && product.stock <= (product.stockMin ?? 5) ? 'text-orange-600' : 'text-muted-foreground'}`}>
                    <span>
                    {isService
                      ? "Servicio"
                      : product.stock > 99
                        ? "99+ en stock"
                        : `${product.stock} en stock`}
                    </span>
                    
                    {product.isDerived && (
                      <span className="bg-amber-100 text-amber-700 px-1 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider ml-1">Derivado</span>
                    )}
                    {product.isRawMaterial && (
                      <span className="bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider ml-1">Padre</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div >
  )
}
