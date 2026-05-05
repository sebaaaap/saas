"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Store, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiService } from "@/services/apiService";
import { useAuth } from "@/contexts/AuthContext";

export function BranchSelector() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const data = await apiService.getBranches();
        setBranches(data);

        // Vendedor con sucursal asignada → bloquear y forzar esa sucursal
        if (user?.role === "vendedor" && user?.branch_id) {
          setSelectedBranchId(user.branch_id);
          localStorage.setItem("branch_id", user.branch_id);
          return;
        }

        // Admin: recuperar del localStorage o auto-seleccionar el primero
        const storedBranch = localStorage.getItem("branch_id");
        if (storedBranch && data.find((b: any) => b.id === storedBranch)) {
          setSelectedBranchId(storedBranch);
        } else if (data.length > 0) {
          const defaultBranch = data.find((b: any) => b.is_default) || data[0];
          setSelectedBranchId(defaultBranch.id);
          localStorage.setItem("branch_id", defaultBranch.id);
        }
      } catch (error) {
        console.error("Error fetching branches:", error);
      }
    };

    fetchBranches();
  }, [user]);

  const handleSelect = (branchId: string) => {
    setSelectedBranchId(branchId);
    localStorage.setItem("branch_id", branchId);
    setOpen(false);
    window.location.reload();
  };

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  // Vendedor: mostrar pill de sucursal bloqueada (no puede cambiarla)
  if (user?.role === "vendedor" && user?.branch_id) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-xs">
        <Store className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="font-semibold text-foreground truncate max-w-[140px]">
          {selectedBranch?.name ?? (
            <span className="inline-block w-20 h-3 bg-muted animate-pulse rounded" />
          )}
        </span>
        <Lock className="h-3 w-3 ml-1 text-muted-foreground shrink-0" />
      </div>
    );
  }

  // Admin con 1 sola sucursal: no mostrar selector
  if (branches.length <= 1) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[220px] justify-between border-purple-200 bg-purple-50 text-purple-900 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-300 transition-colors"
        >
          <Store className="mr-2 h-4 w-4" />
          {selectedBranch ? selectedBranch.name : "Seleccionar Sucursal..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0">
        <Command>
          <CommandInput placeholder="Buscar sucursal..." />
          <CommandList>
            <CommandEmpty>No se encontró la sucursal.</CommandEmpty>
            <CommandGroup>
              {branches.map((branch) => (
                <CommandItem
                  key={branch.id}
                  value={branch.name}
                  onSelect={() => handleSelect(branch.id)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-purple-600",
                      selectedBranchId === branch.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {branch.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
