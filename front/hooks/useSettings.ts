"use client";

import { useState, useEffect } from "react";

export interface BusinessSettings {
    businessName: string;
    businessType: string;
    description: string;
    phone: string;
    email: string;
    address: string;
    taxId: string;
    currency: string;
    logoBase64: string | null;
    website?: string;
}

export const defaultSettings: BusinessSettings = {
    businessName: 'VANKAI',
    businessType: 'vulcanizacion',
    description: 'KRYPTONITA VULCANIZA',
    phone: '+56 9 1234 5678',
    email: 'contacto@vankai.cl',
    address: 'Av. Central 1234, Santiago, Chile',
    taxId: '12.345.678-9',
    currency: 'CLP',
    logoBase64: null,
    website: 'www.vankai.cl'
};

export function useSettings() {
    const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('businessSettings');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setSettings({ ...defaultSettings, ...parsed });
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }
        setIsLoaded(true);
    }, []);

    const saveSettings = (newSettings: BusinessSettings) => {
        setSettings(newSettings);
        localStorage.setItem('businessSettings', JSON.stringify(newSettings));
    };

    return { settings, saveSettings, isLoaded };
}
