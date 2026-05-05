import useSWR from "swr";
import { apiService } from "@/services/apiService";

export function usePaymentMethods() {
  const { data, error, isLoading, mutate } = useSWR("/payment-methods/", () => apiService.getPaymentMethods());

  // Adapt backend data to frontend PaymentMethod interface
  const mappedMethods = data?.map((m: any) => ({
    id: m.id,
    name: m.name,
    key: m.key,
    icon: m.icon,
    type: m.key === "efectivo" ? "cash" : (m.key === "tarjeta" ? "card" : (m.key === "transferencia" ? "transfer" : "custom"))
  }));

  return {
    data: mappedMethods,
    error,
    isLoading,
    mutate
  };
}
