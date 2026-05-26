import {
  Monitor,
  ShoppingCart,
  Package,
  Settings,
  Users,
  BarChart3,
  Wrench,
  ChevronRight,
  LogOut,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { BranchSelector } from "@/components/shared/BranchSelector"
import { useSettings } from "@/hooks/useSettings"
import { useRouter } from "next/navigation"

export type ModuleId = "pdv" | "compras" | "inventario" | "ajustes" | "reportes" | "clientes" | "taller"

interface BackendDashboardProps {
  onNavigate: (module: ModuleId) => void
}

const modulesConfig = [
  {
    id: "pdv" as ModuleId,
    name: "Punto de Venta",
    description: "Caja registradora para ventas directas a clientes",
    icon: Monitor,
    color: "bg-primary",
    badge: "Abierto",
    roles: ["admin", "vendedor"],
  },
  {
    id: "compras" as ModuleId,
    name: "Compras",
    description: "Gestion de ordenes de compra y proveedores",
    icon: ShoppingCart,
    color: "bg-secondary",
    badge: "",
    roles: ["admin"],
  },
  {
    id: "inventario" as ModuleId,
    name: "Inventario",
    description: "Control de stock, movimientos y almacenes",
    icon: Package,
    color: "bg-amber-600",
    badge: "",
    roles: ["admin"],
  },
]

const workshopConfig = [
  {
    id: "taller" as ModuleId,
    name: "Taller Automotriz",
    description: "Gestión de cotizaciones para servicios y repuestos",
    icon: Wrench,
    color: "bg-blue-600",
    roles: ["admin"],
  }
]

const quickLinksConfig = [
  { label: "Clientes", icon: Users, description: "Gestionar clientes y vehiculos", roles: ["admin"] },
  { label: "Reportes", icon: BarChart3, description: "Ventas, compras e inventario", roles: ["admin"] },
  { label: "Configuracion", icon: Settings, description: "Ajustes generales del sistema", roles: ["admin"] },
]

export function BackendDashboard({ onNavigate }: BackendDashboardProps) {
  const { user, logout, isAdmin } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();

  const filteredModules = modulesConfig.filter(m => user && m.roles.includes(user.role));
  const filteredQuickLinks = quickLinksConfig.filter(l => user && l.roles.includes(user.role));
  const filteredWorkshop = workshopConfig.filter(w => user && w.roles.includes(user.role));

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-3">
          {settings.logoBase64 ? (
            <img 
              src={settings.logoBase64} 
              alt="Logo" 
              className="h-9 w-9 object-contain rounded-lg"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-sm font-bold text-foreground leading-none">VKI</h1>
            <p className="text-[11px] text-muted-foreground">Sistema de Gestion - Talleres Mecanicos</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-r pr-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-foreground leading-none">{user?.full_name || user?.username}</span>
              <span className="text-[10px] uppercase tracking-wider">{user?.role === 'admin' ? 'Administrador' : 'Vendedor'}</span>
            </div>
          </div>
          
          <div className="border-r pr-4 mr-2">
            <BranchSelector />
          </div>

          <button
            onClick={() => confirm('¿Cerrar sesión?') && logout()}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-md hover:bg-destructive/10"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground text-balance">Panel de Control</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin
                ? "Selecciona un modulo para comenzar a trabajar"
                : "Bienvenido, selecciona una de tus herramientas permitidas"}
            </p>
          </div>

          <div className={`grid grid-cols-1 gap-4 ${filteredModules.length > 2 ? 'md:grid-cols-3' : 'md:grid-cols-2'} mb-8`}>
            {filteredModules.map((mod) => {
              const Icon = mod.icon
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => onNavigate(mod.id)}
                  className="group flex flex-col rounded-2xl border border-border bg-card p-6 text-left transition-all hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${mod.color}`}>
                      <Icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    {mod.badge && (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                        {mod.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1">{mod.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    {mod.description}
                  </p>
                  <div className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Abrir modulo</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Workshop Details Level */}
          {filteredWorkshop.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-foreground mb-3">Taller y Servicios</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredWorkshop.map((mod) => {
                  const Icon = mod.icon
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => onNavigate(mod.id)}
                      className="group flex flex-col rounded-2xl border border-border bg-card p-4 text-left transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-4 mb-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${mod.color}`}>
                          <Icon className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-foreground leading-tight">{mod.name}</h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {mod.description}
                          </p>
                        </div>
                      </div>
                      <div className="mt-auto flex items-center gap-1.5 text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Gestionar Órdenes</span>
                        <ChevronRight className="h-3 w-3" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quick Links */}
          {filteredQuickLinks.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">Accesos Rapidos</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {filteredQuickLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <button
                      key={link.label}
                      onClick={() => {
                        if (link.label === "Configuracion") {
                          onNavigate("ajustes" as any)
                        } else if (link.label === "Reportes") {
                          onNavigate("reportes")
                        } else if (link.label === "Clientes") {
                          onNavigate("clientes" as any)
                        }
                      }}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-all hover:bg-muted/50 cursor-pointer w-full"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{link.label}</p>
                        <p className="text-[11px] text-muted-foreground">{link.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="mt-12 mb-4 text-center text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
          Powered by VankaiLabs
        </div>
      </div>
    </div>
  )
}
