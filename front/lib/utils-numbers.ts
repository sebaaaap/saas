/**
 * Convierte de forma segura un valor que puede ser string, number, null o undefined
 * a un número JS. Necesario porque los campos Numeric(12,2) de PostgreSQL llegan 
 * como strings en JSON (Pydantic los serializa así).
 *
 * Uso: toNum(valor).toFixed(2)  en lugar de  valor.toFixed(2)
 */
export function toNum(value: unknown): number {
    if (value === null || value === undefined || value === "") return 0;
    const n = Number(value);
    return isNaN(n) ? 0 : n;
}
