import axios from "axios";
import { toast } from "sonner"; // Assuming sonner is used, if not I'll check

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request Interceptor: Attach JWT Token + Tenant Header
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("auth_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Multi-tenant: extraer subdominio dinámicamente o usar 'default' en localhost/IPs
        let tenantId = "default";
        if (typeof window !== "undefined") {
            const hostname = window.location.hostname;
            
            // Si no es localhost ni una IP (ej: 127.0.0.1 o 192.168.x.x)
            if (!hostname.includes("localhost") && !/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
                // Asumiendo que tu dominio es vankaisistemas.cl
                // taller1.vankaisistemas.cl -> parts = ['taller1', 'vankaisistemas', 'cl']
                const parts = hostname.split(".");
                if (parts.length >= 3) {
                    tenantId = parts[0]; // Extrae el subdominio ("taller1")
                }
            }
        }
        config.headers["X-Tenant-ID"] = tenantId;
        
        // Multi-branch: send branch header if selected
        if (typeof window !== "undefined") {
            const branchId = localStorage.getItem("branch_id");
            if (branchId) {
                config.headers["X-Branch-ID"] = branchId;
            }
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Handle Errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response ? error.response.status : null;

        if (status === 401) {
            // Unauthorized: Redirect to login
            localStorage.removeItem("auth_token");
            localStorage.removeItem("auth_user");
            if (typeof window !== "undefined") {
                window.location.href = "/login";
            }
        } else if (status === 422) {
            // Validation Error
            const detail = error.response.data?.detail;
            const message = Array.isArray(detail)
                ? detail.map((d: any) => {
                    if (d.msg.includes("valid uuid")) {
                        return "UUID Inválido o corrupto (" + d.loc?.[1] + ")";
                    }
                    return d.msg;
                }).join(", ")
                : detail || "Error de validación";
            toast.error(message);
        } else if (status === 500) {
            toast.error("Error interno del servidor. Contacte a soporte.");
        } else if (error.code === 'ECONNABORTED') {
            toast.error("La petición ha tardado demasiado tiempo. Intente de nuevo.");
        } else {
            // Don't show toast for 404 as it might be an expected state (like checking for active session)
            if (status !== 404) {
                const message = error.response?.data?.detail || "Ha ocurrido un error inesperado";
                toast.error(message);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
