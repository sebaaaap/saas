"use client";

import { useState } from 'react';
import { Upload, Image as ImageIcon, RotateCcw } from 'lucide-react';

export function Customization() {
    const [logo, setLogo] = useState('https://images.pexels.com/photos/3965517/pexels-photo-3965517.jpeg?auto=compress&cs=tinysrgb&w=400');
    const [profile, setProfile] = useState('https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400');
    const [saved, setSaved] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'profile') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                if (type === 'logo') {
                    setLogo(result);
                } else {
                    setProfile(result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Logo Section */}
                <div className="space-y-4">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <ImageIcon className="w-3.5 h-3.5 text-primary" />
                        Logo de la Empresa
                    </label>

                    <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center space-y-4 hover:border-primary/50 transition-all bg-card/50">
                        <div className="w-40 h-40 mx-auto bg-white rounded-2xl shadow-inner flex items-center justify-center overflow-hidden border border-border">
                            {logo ? (
                                <img
                                    src={logo}
                                    alt="Logo"
                                    className="w-full h-full object-contain p-4"
                                />
                            ) : (
                                <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                            )}
                        </div>

                        <div className="space-y-3">
                            <label className="inline-block">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e, 'logo')}
                                />
                                <span className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-bold cursor-pointer hover:bg-secondary/80 transition-colors shadow-sm">
                                    <Upload className="w-4 h-4" />
                                    Cambiar Logo
                                </span>
                            </label>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold opacity-60">
                                Formatos: PNG, JPG (Máx. 5MB)
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profile Section */}
                <div className="space-y-4">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <ImageIcon className="w-3.5 h-3.5 text-primary" />
                        Imagen de Perfil / Avatar
                    </label>

                    <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center space-y-4 hover:border-primary/50 transition-all bg-card/50">
                        <div className="w-40 h-40 mx-auto bg-muted rounded-full shadow-inner flex items-center justify-center overflow-hidden border-4 border-card">
                            {profile ? (
                                <img
                                    src={profile}
                                    alt="Perfil"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                            )}
                        </div>

                        <div className="space-y-3">
                            <label className="inline-block">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e, 'profile')}
                                />
                                <span className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-bold cursor-pointer hover:bg-secondary/80 transition-colors shadow-sm">
                                    <Upload className="w-4 h-4" />
                                    Nueva Foto
                                </span>
                            </label>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold opacity-60">
                                Formatos: JPG, WebP (Mín. 400px)
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6">
                <h4 className="text-xs font-bold text-primary uppercase mb-3 px-1">Guía de Estilo</h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <li className="flex gap-3 text-xs text-muted-foreground">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">1</span>
                        Se recomienda usar logos con fondo transparente (PNG) para mejor integración.
                    </li>
                    <li className="flex gap-3 text-xs text-muted-foreground">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">2</span>
                        Utilice imágenes de alta resolución (mínimo 72 DPI) para una apariencia profesional.
                    </li>
                </ul>
            </div>

            <div className="flex gap-3 justify-end pt-6 border-t border-border">
                <button
                    onClick={() => {
                        setLogo('https://images.pexels.com/photos/3965517/pexels-photo-3965517.jpeg?auto=compress&cs=tinysrgb&w=400');
                        setProfile('https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400');
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border text-foreground text-sm font-semibold
            hover:bg-muted transition-all"
                >
                    <RotateCcw className="w-4 h-4" />
                    Restaurar Valores
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
        </div>
    );
}
