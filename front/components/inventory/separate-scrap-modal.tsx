import React, { useState } from "react";
import { X, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface SeparateScrapModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: any;
    onSuccess: () => void;
}

export function SeparateScrapModal({ isOpen, onClose, product, onSuccess }: SeparateScrapModalProps) {
    const [quantity, setQuantity] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !product) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        const numQty = parseFloat(quantity);
        if (isNaN(numQty) || numQty <= 0) {
            setError("Ingrese una cantidad válida mayor a 0");
            return;
        }

        if (numQty > product.total_stock) {
            setError(`No puede separar más del stock actual (${product.total_stock})`);
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post(`/products/${product.id}/separate-scrap`, {
                quantity: numQty
            });
            onSuccess();
            onClose();
            setQuantity("");
        } catch (err: any) {
            setError(err.response?.data?.detail || "Error al separar sobrante");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-border">
                <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                            <Scissors size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">Separar Sobrante</h3>
                            <p className="text-xs text-muted-foreground line-clamp-1">{product.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:bg-muted rounded-xl transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5">
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                            {error}
                        </div>
                    )}
                    
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Cantidad sobrante a separar
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.0001"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                                placeholder="Ej: 0.02"
                                autoFocus
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                                {product.uom === "unidades" ? "u" : product.uom}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Stock actual disponible: <strong className="text-foreground">{product.total_stock} {product.uom === "unidades" ? "u" : product.uom}</strong>
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full rounded-xl"
                            onClick={onClose}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
                            disabled={isSubmitting || !quantity}
                        >
                            {isSubmitting ? "Separando..." : "Separar Sobrante"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
