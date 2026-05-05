"use client";

import { SettingsPage } from "@/components/settings/settings-page";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function AjustesPage() {
    return (
        <ProtectedRoute allowedRoles={['admin']}>
            <SettingsPage />
        </ProtectedRoute>
    );
}
