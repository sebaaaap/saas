"use client";

import { useState, useRef, useEffect } from 'react';
import { MapPin, Phone, Mail, Building2, FileText, Globe, Upload, Trash2, ImagePlus } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

export function BusinessInfo() {
    const { settings, saveSettings, isLoaded } = useSettings();
    const [formData, setFormData] = useState(settings);
    const [saved, setSaved] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isLoaded) {
            setFormData(settings);
        }
    }, [settings, isLoaded]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const formDataStr = new FormData();
                formDataStr.append("file", file);
                
                // Show temporary local preview
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFormData(prev => ({ ...prev, logoBase64: reader.result as string }));
                };
                reader.readAsDataURL(file);
                
                // Upload to server
                import('@/lib/api').then(({ default: api }) => {
                    api.post('/companies/me/logo', formDataStr, {
                        headers: { "Content-Type": "multipart/form-data" }
                    }).then(res => {
                        const url = res.data.logo_url;
                        const fullUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}${url}`;
                        setFormData(prev => ({ ...prev, logoBase64: fullUrl }));
                        saveSettings({ ...formData, logoBase64: fullUrl });
                    }).catch(err => {
                        console.error("Error subiendo logo", err);
                    });
                });
                
            } catch (error) {
                console.error("Error handling logo upload", error);
            }
        }
    };

    const removeLogo = () => {
        setFormData(prev => ({ ...prev, logoBase64: null }));
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSave = () => {
        saveSettings(formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const businessTypes = [
        { value: 'lubricentro', label: 'Lubricentro' },
        { value: 'taller', label: 'Taller Mecánico' },
        { value: 'vulcanizacion', label: 'Vulcanización' },
        { value: 'mixto', label: 'Mixto (Lubricentro + Taller)' },
    ];

    const currencies = [
        { value: 'USD', label: 'USD - Dólar' },
        { value: 'MXN', label: 'MXN - Peso Mexicano' },
        { value: 'CLP', label: 'CLP - Peso Chileno' },
        { value: 'COP', label: 'COP - Peso Colombiano' },
        { value: 'PEN', label: 'PEN - Sol Peruano' },
        { value: 'ARS', label: 'ARS - Peso Argentino' },
        { value: 'EUR', label: 'EUR - Euro' },
    ];

    if (!isLoaded) return <div>Cargando ajustes...</div>;

    return (
        <div className="space-y-6">
            {/* Logo Section */}
            <div className="bg-muted/30 border border-border p-4 rounded-xl flex items-center gap-6">
                <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden">
                        {formData.logoBase64 ? (
                            <img src={formData.logoBase64} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                            <ImagePlus className="w-8 h-8 text-muted-foreground/50" />
                        )}
                    </div>
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-foreground">Logotipo del Negocio</h3>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">Recomendado: formato PNG o JPG, tamaño cuadrado o apaisado (max 5MB).</p>
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleLogoUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-xs font-semibold transition-colors"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            Subir Logo
                        </button>
                        {formData.logoBase64 && (
                            <button
                                onClick={removeLogo}
                                className="flex items-center gap-2 px-3 py-1.5 text-destructive hover:bg-destructive/10 rounded-md text-xs font-semibold transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Quitar
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                        Nombre del Negocio
                    </label>
                    <input
                        type="text"
                        name="businessName"
                        value={formData.businessName || ''}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="VANKAI"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        Descripción / Slogan
                    </label>
                    <input
                        type="text"
                        name="description"
                        value={formData.description || ''}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="KRYPTONITA VULCANIZA"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-primary" />
                        Teléfono
                    </label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone || ''}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="+56 9 1234 5678"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-primary" />
                        Correo Electrónico
                    </label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email || ''}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="contacto@vankai.cl"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-primary" />
                        Sitio Web
                    </label>
                    <input
                        type="text"
                        name="website"
                        value={formData.website || ''}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="www.vankai.cl"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        RFC / RUC / NIT / RUT
                    </label>
                    <input
                        type="text"
                        name="taxId"
                        value={formData.taxId || ''}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="12.345.678-9"
                    />
                </div>

            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    Dirección Comercial
                </label>
                <input
                    type="text"
                    name="address"
                    value={formData.address || ''}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Av. Central 1234, Santiago, Chile"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/50">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-primary" />
                        Tipo de Negocio
                    </label>
                    <select
                        name="businessType"
                        value={formData.businessType || ''}
                        onChange={handleChange}
                        className="form-input"
                    >
                        {businessTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-primary" />
                        Moneda Base
                    </label>
                    <select
                        name="currency"
                        value={formData.currency || ''}
                        onChange={handleChange}
                        className="form-input"
                    >
                        {currencies.map((curr) => (
                            <option key={curr.value} value={curr.value}>
                                {curr.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex gap-3 justify-end pt-6 border-t border-border">
                <button
                    onClick={() => {
                        setFormData(settings);
                    }}
                    className="px-6 py-2.5 rounded-xl border border-border text-foreground text-sm font-semibold
            hover:bg-muted transition-all"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    className="px-8 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold
            hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                    {saved ? (
                        <>
                            <span className="w-4 h-4">✓</span>
                            Guardado
                        </>
                    ) : (
                        'Guardar Cambios'
                    )}
                </button>
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Nota:</strong> Estos datos se utilizarán para la generación de cotizaciones, reportes y comprobantes (PDF). Puedes cambiar el logotipo o datos en cualquier momento.
                </p>
            </div>
        </div>
    );
}
