import api from "@/lib/api";
import {
    Product,
    SaleCreate,
    SaleResponse,
    CashSessionResponse,
    CategoryResponse
} from "@/types/api";

export const apiService = {
    // Products
    async getProducts(q?: string): Promise<Product[]> {
        const response = await api.get("/products/", { params: { q } });
        return response.data;
    },

    async getProductByBarcode(barcode: string): Promise<Product> {
        const response = await api.get(`/pos/products/barcode/${barcode}`);
        return response.data;
    },

    // Categories
    async getCategories(): Promise<CategoryResponse[]> {
        const response = await api.get("/categories/");
        return response.data;
    },

    // Sales
    async createSale(saleData: SaleCreate): Promise<SaleResponse> {
        const response = await api.post("/pos/sales", saleData);
        return response.data;
    },

    async validateSale(ticketId: string): Promise<SaleResponse> {
        const response = await api.post(`/pos/sales/${ticketId}/validate`);
        return response.data;
    },

    async markAsPaid(ticketId: string): Promise<SaleResponse> {
        const response = await api.post(`/pos/sales/${ticketId}/pay`);
        return response.data;
    },

    async getSalesBySession(sessionId: string): Promise<SaleResponse[]> {
        const response = await api.get(`/pos/sales/session/${sessionId}`);
        return response.data;
    },

    async getSalesHistory(): Promise<SaleResponse[]> {
        const response = await api.get("/pos/sales");
        return response.data;
    },

    // Sessions
    async getActiveSession(): Promise<CashSessionResponse | null> {
        try {
            const response = await api.get("/sessions/active");
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) return null;
            throw error;
        }
    },

    async getRegisters(availableOnly: boolean = false): Promise<any[]> {
        const response = await api.get("/sessions/registers", { params: { available_only: availableOnly } });
        return response.data;
    },

    async createRegister(data: any): Promise<any> {
        const response = await api.post("/sessions/registers", data);
        return response.data;
    },

    async updateRegister(id: string, data: any): Promise<any> {
        const response = await api.put(`/sessions/registers/${id}`, data);
        return response.data;
    },

    async deleteRegister(id: string): Promise<any> {
        const response = await api.delete(`/sessions/registers/${id}`);
        return response.data;
    },

    async openSession(opening_balance: number, cash_register_id: string, user_id: string, notes?: string): Promise<CashSessionResponse> {
        const response = await api.post("/sessions/open", { opening_balance, cash_register_id, user_id, notes });
        return response.data;
    },

    async closeSession(sessionId: string, closing_balance: number, notes?: string): Promise<CashSessionResponse> {
        const response = await api.post(`/sessions/${sessionId}/close`, {
            closing_balance,
            notes
        });
        return response.data;
    },

    async createRefund(refundData: any): Promise<{ credit_note: SaleResponse, original_ticket: SaleResponse }> {
        const response = await api.post("/pos/refunds", refundData);
        return response.data;
    },

    // Reports
    async getReportSales(startDate?: string, endDate?: string, branchId?: string): Promise<any> {
        const params: any = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        if (branchId && branchId !== 'all') params.branch_id = branchId;
        const response = await api.get("/reports/sales/summary", { params });
        return response.data;
    },

    async getReportProfitability(startDate?: string, endDate?: string, branchId?: string): Promise<any> {
        const params: any = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        if (branchId && branchId !== 'all') params.branch_id = branchId;
        const response = await api.get("/reports/sales/profitability", { params });
        return response.data;
    },

    async getReportCash(): Promise<any> {
        const response = await api.get("/reports/sales/cash_reports");
        return response.data;
    },

    async getReportInventory(category?: string, aisle?: string, branchId?: string): Promise<any> {
        const params: any = {};
        if (category && category !== "all") params.category = category;
        if (aisle && aisle !== "all") params.aisle = aisle;
        if (branchId && branchId !== 'all') params.branch_id = branchId;
        const response = await api.get("/reports/inventory/summary", { params });
        return response.data;
    },

    async getReportPurchases(startDate?: string, endDate?: string, branchId?: string): Promise<any> {
        const params: any = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        if (branchId && branchId !== 'all') params.branch_id = branchId;
        const response = await api.get("/reports/purchases/summary", { params });
        return response.data;
    },

    async exportSalesExcel(startDate?: string, endDate?: string, branchId?: string): Promise<void> {
        const params: any = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        if (branchId && branchId !== 'all') params.branch_id = branchId;
        const response = await api.get("/reports/sales/export", {
            params,
            responseType: "blob",
        });
        // Disparar descarga en el navegador
        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.style.display = "none";
        link.href = url;
        const from = startDate ? startDate.replace(/-/g, "") : "inicio";
        const to = endDate ? endDate.replace(/-/g, "") : "hoy";
        link.setAttribute("download", `ventas_${from}_${to}.xlsx`);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            if (document.body.contains(link)) document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 1000);
    },

    async exportInventoryExcel(category?: string, aisle?: string): Promise<void> {
        const params: any = {};
        if (category && category !== "all") params.category = category;
        if (aisle) params.aisle = aisle;
        const response = await api.get("/reports/inventory/export", {
            params,
            responseType: "blob",
        });
        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.style.display = "none";
        link.href = url;
        link.setAttribute("download", `inventario_${new Date().toISOString().split('T')[0]}.xlsx`);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            if (document.body.contains(link)) document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 1000);
    },

    async exportPurchasesExcel(startDate?: string, endDate?: string): Promise<void> {
        const params: any = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        const response = await api.get("/reports/purchases/export", {
            params,
            responseType: "blob",
        });
        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.style.display = "none";
        link.href = url;
        const from = startDate ? startDate.replace(/-/g, "") : "inicio";
        const to = endDate ? endDate.replace(/-/g, "") : "hoy";
        link.setAttribute("download", `compras_${from}_${to}.xlsx`);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            if (document.body.contains(link)) document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 1000);
    },

    // Customers
    async getCustomers(q?: string): Promise<any[]> {
        const params: any = {};
        if (q) params.q = q;
        const response = await api.get("/customers/", { params });
        return response.data;
    },

    async createCustomer(data: any): Promise<any> {
        const response = await api.post("/customers/", data);
        return response.data;
    },

    async updateCustomer(id: string, data: any): Promise<any> {
        const response = await api.put(`/customers/${id}`, data);
        return response.data;
    },

    async getCustomerHistory(id: string): Promise<any> {
        const response = await api.get(`/customers/${id}/history`);
        return response.data;
    },

    // Vehicles
    async addVehicle(customerId: string, data: any): Promise<any> {
        const response = await api.post(`/customers/${customerId}/vehicles`, data);
        return response.data;
    },

    async updateVehicle(id: string, data: any): Promise<any> {
        const response = await api.put(`/customers/vehicles/${id}`, data);
        return response.data;
    },

    // Quotes & OTs
    async getQuotes(): Promise<any[]> {
        const response = await api.get("/quotes");
        return response.data;
    },

    async createQuote(data: any): Promise<any> {
        const response = await api.post("/quotes", data);
        return response.data;
    },

    async approveQuote(quoteId: string): Promise<any> {
        const response = await api.post(`/quotes/${quoteId}/approve`);
        return response.data;
    },

    async rejectQuote(quoteId: string): Promise<any> {
        const response = await api.post(`/quotes/${quoteId}/reject`);
        return response.data;
    },

    async getActiveWorkOrders(posOnly?: boolean): Promise<any[]> {
        const response = await api.get("/pos/active-orders", { params: { pos_only: posOnly } });
        return response.data;
    },

    async updateOtItemsDone(woId: string, items: { id: string; done: boolean }[]): Promise<any> {
        const response = await api.patch(`/ot/${woId}/items`, { items });
        return response.data;
    },

    async updateOtState(woId: string, state: string): Promise<any> {
        const response = await api.patch(`/ot/${woId}/state`, { state });
        return response.data;
    },

    async addWorkOrderPayment(woId: string, paymentData: { amount: number, payment_method: string, item_ids?: string[] | null }, sessionId: string): Promise<any> {
        const response = await api.post(`/ot/${woId}/payments?session_id=${sessionId}`, paymentData);
        return response.data;
    },

    async deleteQuote(quoteId: string): Promise<void> {
        await api.delete(`/quotes/${quoteId}`);
    },

    async deleteWorkOrder(woId: string): Promise<void> {
        await api.delete(`/ot/${woId}`);
    },

    // ── Reception Card ────────────────────────────────────────────────────────
    async getReception(woId: string): Promise<any> {
        const response = await api.get(`/ot/${woId}/reception`);
        return response.data;
    },

    async saveReception(woId: string, formData: any): Promise<any> {
        const response = await api.put(`/ot/${woId}/reception`, formData);
        return response.data;
    },

    async exportReceptionPdf(woId: string, formData: any): Promise<Blob> {
        const response = await api.post(`/ot/${woId}/reception/pdf`, formData, {
            responseType: "blob",
        });
        return response.data;
    },

    async uploadDamagePhoto(otId: string, file: File, section = "recepcion"): Promise<{ url: string }> {
        const form = new FormData();
        form.append("file", file);
        form.append("ot_id", otId);
        form.append("section", section);
        const response = await api.post(`/ot/upload-photo`, form, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    // ── Branches ────────────────────────────────────────────────────────
    async getBranches(): Promise<any[]> {
        const response = await api.get("/branches/");
        return response.data;
    },

    async createBranch(data: any): Promise<any> {
        const response = await api.post("/branches/", data);
        return response.data;
    },

    async updateBranch(id: string, data: any): Promise<any> {
        const response = await api.put(`/branches/${id}`, data);
        return response.data;
    },

    // ── Payment Methods ───────────────────────────────────────────────────
    async getPaymentMethods(activeOnly: boolean = true): Promise<any[]> {
        const response = await api.get("/payment-methods/", { params: { active_only: activeOnly } });
        return response.data;
    },

    async createPaymentMethod(data: any): Promise<any> {
        const response = await api.post("/payment-methods/", data);
        return response.data;
    },

    async updatePaymentMethod(id: string, data: any): Promise<any> {
        const response = await api.put(`/payment-methods/${id}`, data);
        return response.data;
    },

    async deletePaymentMethod(id: string): Promise<any> {
        const response = await api.delete(`/payment-methods/${id}`);
        return response.data;
    },

    // Inventory Transfers
    async transferStockBetweenBranches(data: any): Promise<any> {
        const response = await api.post("/inventory/transfer", data);
        return response.data;
    },
};
