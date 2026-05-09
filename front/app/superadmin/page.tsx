"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import useSWR from "swr"
import api from "@/lib/api"
import {
  Building2, Users, TrendingUp, Activity, Plus, Eye, Power,
  KeyRound, ChevronRight, CheckCircle2, XCircle, Loader2,
  BarChart3, ShoppingCart, Clock, Globe, ShieldAlert
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

const fetcher = (url: string) => api.get(url).then(r => r.data)

// ── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, sub, color }: { icon: any, label: string, value: string | number, sub?: string, color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-foreground leading-none mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Mini bar chart ────────────────────────────────────────────────────────────
function MiniChart({ data }: { data: { day: string, sales: number }[] }) {
  const max = Math.max(...data.map(d => d.sales), 1)
  return (
    <div className="flex items-end gap-1 h-10">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
          <div
            className="w-full rounded-sm bg-primary/70 transition-all"
            style={{ height: `${(d.sales / max) * 40}px`, minHeight: d.sales > 0 ? 4 : 0 }}
            title={`${d.day}: ${d.sales} ventas`}
          />
        </div>
      ))}
    </div>
  )
}

// ── Create Tenant Modal ────────────────────────────────────────────────────────
function CreateTenantModal({ open, onClose, onCreated }: { open: boolean, onClose: () => void, onCreated: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    company_name: "", business_name: "", tax_id: "", company_email: "",
    company_phone: "", subscription_plan: "free", branch_name: "Casa Matriz",
    admin_username: "", admin_password: "", admin_full_name: "", admin_email: "",
    logo_url: "",
  })

  const [logoFile, setLogoFile] = useState<File | null>(null)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async () => {
    if (!form.company_name || !form.admin_username || !form.admin_password || !form.admin_full_name) {
      toast.error("Completa los campos obligatorios")
      return
    }
    setLoading(true)
    try {
      let finalLogoUrl = form.logo_url
      
      // Si hay archivo, subirlo primero
      if (logoFile) {
        const formData = new FormData()
        formData.append("file", logoFile)
        const uploadRes = await api.post("/superadmin/upload-logo", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        })
        finalLogoUrl = uploadRes.data.logo_url
      }

      await api.post("/superadmin/tenants", { ...form, logo_url: finalLogoUrl })
      toast.success(`Empresa '${form.company_name}' creada exitosamente`)
      onCreated()
      onClose()
      setForm({ company_name: "", business_name: "", tax_id: "", company_email: "", company_phone: "", subscription_plan: "free", branch_name: "Casa Matriz", admin_username: "", admin_password: "", admin_full_name: "", admin_email: "", logo_url: "" })
      setLogoFile(null)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Error al crear empresa")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <Building2 className="h-5 w-5 text-primary" /> Nuevo Cliente
          </DialogTitle>
          <DialogDescription>Crea una nueva empresa con su usuario administrador y configuración inicial.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Datos de la Empresa</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 grid gap-1">
                <Label>Nombre de la empresa <span className="text-destructive">*</span></Label>
                <Input placeholder="Taller Jiménez" value={form.company_name} onChange={e => set("company_name", e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Razón social</Label>
                <Input placeholder="Jiménez y Cía Ltda." value={form.business_name} onChange={e => set("business_name", e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>RUT</Label>
                <Input placeholder="76.123.456-7" value={form.tax_id} onChange={e => set("tax_id", e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Email empresa</Label>
                <Input type="email" placeholder="contacto@taller.cl" value={form.company_email} onChange={e => set("company_email", e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Teléfono</Label>
                <Input placeholder="+56 9 1234 5678" value={form.company_phone} onChange={e => set("company_phone", e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Plan</Label>
                <Select value={form.subscription_plan} onValueChange={v => set("subscription_plan", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label>Nombre sucursal principal</Label>
                <Input placeholder="Casa Matriz" value={form.branch_name} onChange={e => set("branch_name", e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Logo de la Empresa</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => e.target.files && setLogoFile(e.target.files[0])} 
                    className="cursor-pointer file:text-primary file:font-semibold file:bg-primary/10 file:border-0 file:rounded-md hover:file:bg-primary/20"
                  />
                </div>
                {logoFile && <p className="text-[10px] text-muted-foreground">Archivo seleccionado: {logoFile.name}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-1 border-t border-border pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Usuario Administrador</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label>Nombre completo <span className="text-destructive">*</span></Label>
                <Input placeholder="Pedro Jiménez" value={form.admin_full_name} onChange={e => set("admin_full_name", e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Email admin</Label>
                <Input type="email" placeholder="admin@taller.cl" value={form.admin_email} onChange={e => set("admin_email", e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Usuario <span className="text-destructive">*</span></Label>
                <Input placeholder="admin_jimenez" value={form.admin_username} onChange={e => set("admin_username", e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Contraseña temporal <span className="text-destructive">*</span></Label>
                <Input type="password" placeholder="••••••••" value={form.admin_password} onChange={e => set("admin_password", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={loading} className="bg-primary">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Crear Empresa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Tenant Row ─────────────────────────────────────────────────────────────────
function TenantRow({ tenant, onToggle, onResetPwd, onView }: { tenant: any, onToggle: () => void, onResetPwd: () => void, onView: () => void }) {
  const planColors: Record<string, string> = {
    free: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    basic: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    pro: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    enterprise: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  }

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors border-b border-border last:border-0">
      {/* Status dot */}
      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${tenant.is_active ? "bg-emerald-500" : "bg-red-400"}`} />

      {/* Company info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-foreground truncate">{tenant.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {tenant.admin_username ? `@${tenant.admin_username}` : "Sin admin"} · {tenant.total_users} usuarios · {tenant.total_branches} suc.
        </p>
      </div>

      {/* Plan badge */}
      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${planColors[tenant.subscription_plan] || planColors.free}`}>
        {tenant.subscription_plan}
      </span>

      {/* Monthly stats */}
      <div className="hidden md:flex flex-col items-end shrink-0 min-w-[90px]">
        <p className="text-sm font-bold text-foreground">{tenant.sales_this_month} ventas</p>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          ${(tenant.revenue_this_month || 0).toLocaleString("es-CL", { maximumFractionDigits: 0 })}
        </p>
      </div>

      {/* Last sale */}
      <div className="hidden lg:flex flex-col items-end text-xs text-muted-foreground shrink-0 min-w-[80px]">
        {tenant.last_sale_at ? (
          <>
            <Clock className="h-3 w-3 mb-0.5" />
            {new Date(tenant.last_sale_at).toLocaleDateString("es-CL")}
          </>
        ) : <span className="italic">Sin ventas</span>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onView} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Ver detalle">
          <Eye className="h-4 w-4" />
        </button>
        <button onClick={onResetPwd} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Resetear contraseña">
          <KeyRound className="h-4 w-4" />
        </button>
        <button onClick={onToggle} className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${tenant.is_active ? "hover:bg-red-50 text-red-400 hover:text-red-600" : "hover:bg-emerald-50 text-emerald-500 hover:text-emerald-700"}`} title={tenant.is_active ? "Suspender" : "Activar"}>
          <Power className="h-4 w-4" />
        </button>
        <button onClick={onView} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ── Detail Modal ───────────────────────────────────────────────────────────────
function TenantDetailModal({ companyId, open, onClose }: { companyId: string | null, open: boolean, onClose: () => void }) {
  const { data } = useSWR(open && companyId ? `/superadmin/tenants/${companyId}` : null, fetcher)

  if (!data) return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl"><div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DialogContent>
    </Dialog>
  )

  const maxRevenue = Math.max(...(data.monthly_data || []).map((d: any) => d.revenue), 1)

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> {data.name}
            <Badge variant={data.is_active ? "default" : "destructive"} className="ml-2 text-[10px]">
              {data.is_active ? "Activa" : "Suspendida"}
            </Badge>
          </DialogTitle>
          <DialogDescription>{data.business_name || "Sin razón social"} · {data.tax_id || "Sin RUT"}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-2">
          <div className="bg-muted/40 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Usuarios</p>
            <p className="text-2xl font-black">{data.users?.length || 0}</p>
          </div>
          <div className="bg-muted/40 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Sucursales</p>
            <p className="text-2xl font-black">{data.branches?.length || 0}</p>
          </div>
          <div className="bg-muted/40 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Cajas</p>
            <p className="text-2xl font-black">{data.cash_registers?.length || 0}</p>
          </div>
        </div>

        {/* Revenue chart */}
        <div className="border border-border rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Ingresos últimos 6 meses</p>
          <div className="flex items-end gap-2 h-16">
            {(data.monthly_data || []).map((d: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-primary/80 rounded-sm transition-all" style={{ height: `${(d.revenue / maxRevenue) * 56}px`, minHeight: d.revenue > 0 ? 4 : 0 }} title={`$${d.revenue.toLocaleString()}`} />
                <span className="text-[9px] text-muted-foreground">{d.month.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Users */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="bg-muted/30 px-4 py-2 border-b border-border">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Usuarios</p>
          </div>
          {(data.users || []).map((u: any) => (
            <div key={u.id} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-semibold">{u.full_name || u.username}</p>
                <p className="text-xs text-muted-foreground">@{u.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
                {u.is_active ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-400" />}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SuperAdminPage() {
  const { user, isLoading, isSuperAdmin } = useAuth()
  const router = useRouter()

  // ── ALL hooks must come first, no exceptions ──
  const { data: overview, mutate: mutateOverview } = useSWR(
    isSuperAdmin ? "/superadmin/metrics/overview" : null, fetcher
  )
  const { data: tenants, mutate: mutateTenants } = useSWR(
    isSuperAdmin ? "/superadmin/tenants" : null, fetcher
  )
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  // ── Guards (after all hooks) ──────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    )
  }

  if (!user) return null

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f8fafc] text-center p-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100">
          <ShieldAlert className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-foreground">Acceso Denegado</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          Esta sección es exclusiva para el super administrador de la plataforma.
        </p>
        <Button variant="outline" onClick={() => router.push("/")}>Volver al sistema</Button>
      </div>
    )
  }

  // ── Handlers ─────────────────────────────────
  const handleToggle = async (tenant: any) => {
    try {
      await api.patch(`/superadmin/tenants/${tenant.id}`, { is_active: !tenant.is_active })
      toast.success(`Empresa ${tenant.is_active ? "suspendida" : "reactivada"}`)
      mutateTenants()
    } catch { toast.error("Error al actualizar") }
  }

  const handleResetPwd = async (tenant: any) => {
    const pwd = prompt(`Nueva contraseña para admin de "${tenant.name}":`)
    if (!pwd || pwd.length < 6) { toast.error("Contraseña muy corta (mín. 6 caracteres)"); return }
    try {
      await api.post(`/superadmin/tenants/${tenant.id}/reset-password?new_password=${encodeURIComponent(pwd)}`)
      toast.success("Contraseña actualizada")
    } catch { toast.error("Error al resetear contraseña") }
  }

  const filtered = (tenants || []).filter((t: any) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.admin_username || "").toLowerCase().includes(search.toLowerCase())
  )

  // ── Render ────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-8 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Globe className="h-5 w-5 opacity-80" />
                <span className="text-sm font-medium opacity-80 uppercase tracking-wider">Plataforma SaaS</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight">Super Admin</h1>
              <p className="text-white/70 text-sm mt-1">Panel de control de empresas y métricas de la plataforma</p>
            </div>
            <Button onClick={() => setShowCreate(true)} className="bg-white text-violet-700 hover:bg-white/90 font-bold shadow-lg">
              <Plus className="h-4 w-4 mr-2" /> Nuevo Cliente
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Overview metrics */}
        {overview ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard icon={Building2} label="Empresas" value={overview.total_companies} sub={`${overview.active_companies} activas`} color="bg-violet-500" />
            <MetricCard icon={Users} label="Usuarios totales" value={overview.total_users} color="bg-blue-500" />
            <MetricCard icon={Activity} label="Sesiones abiertas" value={overview.active_sessions_now} sub="ahora mismo" color="bg-emerald-500" />
            <MetricCard icon={ShoppingCart} label="Ventas del mes" value={overview.sales_this_month} color="bg-amber-500" />
            <MetricCard icon={TrendingUp} label="Ingresos del mes" value={`$${(overview.revenue_this_month || 0).toLocaleString("es-CL", { maximumFractionDigits: 0 })}`} color="bg-rose-500" />
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col gap-2 col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Últimos 7 días</p>
              <MiniChart data={overview.sales_last_7_days || []} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse" />)}
          </div>
        )}

        {/* Tenants list */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border gap-4">
            <div>
              <h2 className="font-black text-foreground">Clientes</h2>
              <p className="text-xs text-muted-foreground">{(tenants || []).length} empresas registradas</p>
            </div>
            <Input
              placeholder="Buscar empresa o usuario..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs h-8 text-sm"
            />
          </div>

          {!tenants ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground gap-2">
              <Building2 className="h-10 w-10 opacity-30" />
              <p className="font-medium">No hay empresas todavía</p>
              <Button variant="outline" size="sm" onClick={() => setShowCreate(true)} className="mt-2">
                <Plus className="h-4 w-4 mr-1" /> Crear primer cliente
              </Button>
            </div>
          ) : (
            <div>
              {filtered.map((t: any) => (
                <TenantRow
                  key={t.id}
                  tenant={t}
                  onToggle={() => handleToggle(t)}
                  onResetPwd={() => handleResetPwd(t)}
                  onView={() => setSelectedId(t.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateTenantModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => { mutateTenants(); mutateOverview() }} />
      <TenantDetailModal companyId={selectedId} open={!!selectedId} onClose={() => setSelectedId(null)} />
    </div>
  )
}
