"use client";

import { useState, useEffect } from "react";

import api from "@/lib/api";
import { toast } from "sonner";

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
    businessName: '',
    businessType: 'vulcanizacion',
    description: '',
    phone: '',
    email: '',
    address: '',
    taxId: '',
    currency: 'CLP',
    logoBase64: null,
    website: ''
};

export function useSettings() {
    const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const fetchCompany = async () => {
            try {
                const res = await api.get('/companies/me');
                const data = res.data;
                
                let extraSettings = {};
                try {
                    const localData = localStorage.getItem('businessSettings_extra');
                    if (localData) {
                        extraSettings = JSON.parse(localData);
                    }
                } catch (e) { }

                // Map the DB fields to the hook's interface
                setSettings({
                    ...defaultSettings,
                    ...extraSettings,
                    businessName: data.name || '',
                    description: data.business_name || '',
                    taxId: data.tax_id || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    logoBase64: data.logo_url 
                        ? (data.logo_url.startsWith('http') ? data.logo_url : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}${data.logo_url}`)
                        : null,
                });
            } catch (e) {
                console.error("Failed to load company settings from backend", e);
            } finally {
                setIsLoaded(true);
            }
        };

        fetchCompany();
    }, []);

    const saveSettings = async (newSettings: BusinessSettings) => {
        try {
            // Update local state first for fast UI
            setSettings(newSettings);
            
            // Send mapping to backend
            const updateData = {
                name: newSettings.businessName,
                business_name: newSettings.description, // using description as business_name here based on previous mapping
                tax_id: newSettings.taxId,
                email: newSettings.email,
                phone: newSettings.phone,
            };
            
            await api.patch('/companies/me', updateData);
            
            // Save additional fields in local storage temporarily if there are fields that don't map well yet
            // like businessType, currency, address, etc.
            const localFallback = {
                businessType: newSettings.businessType,
                address: newSettings.address,
                currency: newSettings.currency,
                website: newSettings.website
            };
            localStorage.setItem('businessSettings_extra', JSON.stringify(localFallback));
            
        } catch (e) {
            console.error("Failed to save settings", e);
            toast.error("Error al guardar la configuración");
        }
    };

    return { settings, saveSettings, isLoaded };
}
