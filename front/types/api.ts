export enum SaleState {
    DRAFT = "borrador",
    VALIDATED = "validado",
    PAID = "pagado",
    REFUNDED = "reembolsado",
    CANCELLED = "cancelado",
}

export enum PaymentMethod {
    CASH = "efectivo",
    CARD = "tarjeta",
    TRANSFER = "transferencia",
    MIXED = "mixto",
}

export interface Product {
    id: string;
    name: string;
    barcode: string;
    price: number;
    cost: number;
    category?: string;
    category_id?: string;
    image_path?: string;
    internal_reference?: string;
    uom: string;
    product_type: "STORABLE" | "SERVICE" | "CONSUMABLE";
    stock_quantity: number;
    is_active: boolean;
}

export interface SaleItemCreate {
    product_id: string;
    quantity: number;
    price: number;
    discount_percent: number;
}

export interface PaymentCreate {
    payment_method: PaymentMethod;
    amount: number;
    reference?: string;
}

export interface SaleCreate {
    items: SaleItemCreate[];
    payments: PaymentCreate[];
    session_id?: string;
}

export interface SaleItemResponse {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    discount_percent: number;
    subtotal: number;
    product?: any;
}

export interface SaleResponse {
    id: string;
    ticket_number: string;
    date_created: string;
    date_validated?: string;
    state: SaleState;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    payment_method: string;
    session_id?: string;
    return_to_stock: boolean;
    original_ticket_id?: string;
    items: SaleItemResponse[];
    payments: any[];
    customer_id?: string;
    customer?: any;
    document_type?: string;
    comment?: string;
}

export interface CashRegisterResponse {
    id: string;
    name: string;
    description?: string;
    is_active: boolean;
}

export interface CashSessionResponse {
    id: string;
    user_id: string;
    cash_register_id: string;
    opened_at: string;
    closed_at?: string;
    status: "open" | "closed";
    opening_balance: number;
    closing_balance?: number;
    expected_balance: number;
    difference: number;
    total_sales_cash: number;
    total_sales_card: number;
    total_sales_transfer: number;
    notes?: string;
    cash_register?: CashRegisterResponse;
}

export interface CategoryResponse {
    id: string;
    name: string;
    code?: string;
    color?: string;
    parent_id?: string | null;
    full_path?: string;
}
