"use client";

import React from "react";
import { Package, X, Plus, Barcode, Scale } from "lucide-react";

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface Location {
  id: string;
  name: string;
  path: string;
  allows_multiple_products: boolean;
}

interface ProductFormData {
  name: string;
  barcode: string;
  price: string;
  cost: string;
  product_type: string;
  location_id: string;
  category_id: string;
  uom: string;
  internal_reference: string;
  is_variable_consumption: boolean;
  default_consumption_rate: string;
  min_stock: string;
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  editingId: string | null;
  categories: Category[];
  locations: Location[];
  occupiedLocationIds: string[];
}

export function ProductModal({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingId,
  categories,
  locations,
  occupiedLocationIds,
}: ProductModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 md:p-12 shadow-2xl"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-card rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-5 bg-primary shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary-foreground/20 flex items-center justify-center text-primary-foreground">
                <Package size={22} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-primary-foreground">
                  {editingId ? "Editar producto" : "Nuevo producto"}
                </h2>
                <p className="text-sm text-primary-foreground/70 mt-0.5">
                  Catálogo · Master Data
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-7 space-y-8">
            {/* Identificación */}
            <FormSection title="Identificación">
              <div className="col-span-2">
                <FormLabel>Nombre del producto</FormLabel>
                <input
                  autoFocus
                  type="text"
                  placeholder="Nombre del ítem..."
                  className="form-input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <FormLabel>Referencia interna (SKU)</FormLabel>
                <input
                  type="text"
                  placeholder="REF-000-X"
                  className="form-input"
                  value={formData.internal_reference}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      internal_reference: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <FormLabel>Código de barras (GTIN/EAN)</FormLabel>
                <div className="relative">
                  <Barcode
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <input
                    type="text"
                    placeholder="0000000000000"
                    className="form-input pl-11 font-mono"
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                  />
                </div>
              </div>
            </FormSection>

            {/* Precios */}
            <FormSection title="Precios">
              <div>
                <FormLabel>Precio de venta</FormLabel>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none">
                    $
                  </span>
                  <input
                    type="number"
                    step="any"
                    className="form-input pl-9"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <FormLabel>Costo</FormLabel>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none">
                    $
                  </span>
                  <input
                    type="number"
                    step="any"
                    className="form-input pl-9"
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: e.target.value })
                    }
                  />
                </div>
              </div>
            </FormSection>

            {/* Inventario */}
            <FormSection title="Inventario y clasificación">
              <div>
                <FormLabel>Tipo de producto</FormLabel>
                <select
                  className="form-input"
                  value={formData.product_type}
                  onChange={(e) => {
                    const newType = e.target.value
                    setFormData({
                      ...formData,
                      product_type: newType,
                      // Al ser servicio, limpiamos campos que no aplican
                      ...(newType === "SERVICE" ? { location_id: "", uom: "" } : {}),
                    })
                  }}
                >
                  <option value="STORABLE">Producto inventariable</option>
                  <option value="SERVICE">Servicio / Mano de obra</option>
                  <option value="CONSUMABLE">Consumible interno</option>
                </select>
              </div>
              <div>
                <FormLabel>Categoría</FormLabel>
                <select
                  className="form-input"
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: e.target.value })
                  }
                >
                  <option value="">General / Sin clasificar</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} {cat.color ? `(Color: ${cat.color})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {formData.product_type !== "SERVICE" && (
              <div>
                <FormLabel>Unidad de medida (UoM)</FormLabel>
                <select
                  className="form-input"
                  value={formData.uom}
                  onChange={(e) =>
                    setFormData({ ...formData, uom: e.target.value })
                  }
                >
                  <option value="unidades">Unidades (u)</option>
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="litros">Litros (L)</option>
                  <option value="metros">Metros (m)</option>
                </select>
              </div>
              )}
              {formData.product_type !== "SERVICE" && formData.uom !== "unidades" && (
                <div className="col-span-1 sm:col-span-2 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mt-2">
                   <div className="flex items-center gap-2 mb-3">
                     <Scale size={16} className="text-indigo-600" />
                     <label className="text-sm font-bold text-indigo-900 select-none mb-0 leading-none">
                        Consumo Variable (UoM: {formData.uom})
                     </label>
                   </div>
                   <div className="pt-2 border-t border-indigo-200/50">
                     <FormLabel>Cantidad a rebajar por defecto</FormLabel>
                     <input
                       type="number"
                       step="any"
                       min="0"
                       className="form-input w-full mt-1 border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400 bg-white"
                       value={formData.default_consumption_rate}
                       onChange={(e) => setFormData({ ...formData, default_consumption_rate: e.target.value })}
                       placeholder="Ej: 0.2"
                     />
                     <p className="text-[11px] text-indigo-700/80 mt-2 leading-snug font-medium">
                       Dado que este producto se calcula en '{formData.uom}', aquí defines cuánto {formData.uom} se descontará exactamente de inventario por cada 1 unidad de venta en caja.
                     </p>
                   </div>
                </div>
              )}
              {formData.product_type !== "SERVICE" && (
                <div>
                  <FormLabel>Stock Mínimo (Alerta)</FormLabel>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="form-input"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                    placeholder="Ej: 5"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
                    Te avisaremos cuando el inventario caiga por debajo de esta cantidad.
                  </p>
                </div>
              )}
              {formData.product_type !== "SERVICE" && (
              <div>
                <FormLabel>Ubicación</FormLabel>
                <select
                  className="form-input"
                  value={formData.location_id}
                  onChange={(e) =>
                    setFormData({ ...formData, location_id: e.target.value })
                  }
                >
                  <option value="">Bodega central / Espera</option>
                  {locations
                    .filter((loc) => loc.name !== "Pasillo Mermas") // No dejar elegir mermas desde aquí
                    .map((loc) => {
                      const isOccupied = occupiedLocationIds.includes(loc.id);
                      const isCurrent = formData.location_id === loc.id.toString();

                      // Lógica de disponibilidad:
                      // - Si es la actual: DISPONIBLE (obvio)
                      // - Si permite múltiples: DISPONIBLE
                      // - Si es estricta y NO ocupada: DISPONIBLE
                      // - De lo contrario: OCUPADA
                      const canSelect = isCurrent || loc.allows_multiple_products || !isOccupied;

                      return (
                        <option
                          key={loc.id}
                          value={loc.id.toString()}
                          disabled={!canSelect}
                        >
                          {loc.path} {canSelect ? " (Disponible)" : " (OCUPADA - SKU Único)"}
                        </option>
                      );
                    })}
                </select>
              </div>
              )}
            </FormSection>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-8 py-5 border-t border-border bg-muted/30 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              <Plus size={16} />
              {editingId ? "Guardar cambios" : "Crear producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <section>
    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
      {title}
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">{children}</div>
  </section>
);

const FormLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
    {children}
  </label>
);
