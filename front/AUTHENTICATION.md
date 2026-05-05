# Sistema de Autenticación y Roles - Frontend

## ✅ Implementación Completada

### 1. AuthContext (`/contexts/AuthContext.tsx`)
**Funcionalidades**:
- Gestión global del estado de autenticación
- Persistencia en `localStorage` y cookies
- Login con credenciales
- Logout con limpieza completa
- Redirección automática según rol:
  - **Admin** → `/dashboard`
  - **Vendedor** → `/dashboard/ventas`

**Hooks disponibles**:
```typescript
const { user, token, login, logout, isLoading, isAdmin, isSeller } = useAuth();
```

### 2. Página de Login (`/app/login/page.tsx`)
**Características**:
- Diseño moderno y profesional
- Validación de credenciales
- Mensajes de error claros
- Estados de carga
- Credenciales de prueba visibles
- Animaciones suaves

**Credenciales por defecto**:
- Admin: `admin` / `admin123`
- Vendedor: `vendedor` / `vendedor123`

### 3. Middleware de Next.js (`/middleware.ts`)
**Funcionalidades**:
- Protección automática de rutas
- Redirección a `/login` si no hay token
- Previene acceso a `/login` si ya está autenticado
- Excluye rutas públicas y assets

### 4. Sidebar Dinámico (`/components/backend/sidebar.tsx`)
**Mejoras implementadas**:
- ✅ Filtrado de menú según rol del usuario
- ✅ Información del usuario en la parte superior
- ✅ Botón "Cerrar Sesión" con confirmación
- ✅ Configuración solo visible para admin
- ✅ Menú adaptativo según permisos

**Permisos por módulo**:
```typescript
const menuItems = [
  { href: "/dashboard", label: "Panel de Reportes", roles: ['admin'] },
  { href: "/dashboard/clientes", label: "Clientes", roles: ['admin', 'vendedor'] },
  { href: "/dashboard/reportes/ventas", label: "Reportes de Ventas", roles: ['admin'] },
  { href: "/dashboard/reportes/compras", label: "Reportes de Compras", roles: ['admin'] },
  { href: "/dashboard/reportes/inventario", label: "Reportes de Inventario", roles: ['admin'] },
];
```

### 5. Componente de Protección (`/components/auth/ProtectedRoute.tsx`)
**Uso**:
```typescript
<ProtectedRoute allowedRoles={['admin']}>
  <AdminOnlyContent />
</ProtectedRoute>
```

**Funcionalidades**:
- Verificación de autenticación
- Control de acceso por rol
- Redirección automática
- Loader mientras verifica

### 6. Layout Principal (`/app/layout.tsx`)
**Cambios**:
- Envuelve toda la app con `<AuthProvider>`
- Disponibiliza el contexto de autenticación globalmente

## 🔐 Flujo de Autenticación

### Login:
1. Usuario ingresa credenciales en `/login`
2. `AuthContext.login()` envía request a `/api/v1/auth/login`
3. Backend valida y retorna JWT + datos del usuario
4. Token se guarda en `localStorage` y cookie
5. Usuario se guarda en `localStorage`
6. Redirección según rol:
   - Admin → `/dashboard`
   - Vendedor → `/dashboard/ventas`

### Navegación Protegida:
1. Middleware verifica cookie `auth_token`
2. Si no existe, redirige a `/login`
3. Si existe, permite acceso
4. Componentes verifican rol con `useAuth()`

### Logout:
1. Usuario hace clic en "Cerrar Sesión"
2. Confirmación con `confirm()`
3. Limpieza de `localStorage` y cookies
4. Reset del estado global
5. Redirección a `/login`

## 🎨 Experiencia de Usuario

### Vendedor:
- **Ve solo**:
  - Módulo de Ventas (POS)
  - Módulo de Clientes
  - Botón de Cerrar Sesión
- **No ve**:
  - Reportes
  - Inventario
  - Compras
  - Configuración

### Admin:
- **Ve todo**:
  - Todos los módulos
  - Configuración
  - Reportes completos
  - Gestión de inventario

## 📝 Próximos Pasos Opcionales

1. **Refresh Token**: Implementar renovación automática del token
2. **Recordar Sesión**: Checkbox "Mantener sesión iniciada"
3. **Gestión de Usuarios**: CRUD de usuarios desde el panel admin
4. **Logs de Actividad**: Registro de acciones por usuario
5. **Cambio de Contraseña**: Permitir al usuario cambiar su password
6. **Roles Personalizados**: Sistema de permisos granular

## 🚀 Cómo Usar

### Proteger una página completa:
```typescript
// app/admin-only/page.tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div>Contenido solo para admin</div>
    </ProtectedRoute>
  );
}
```

### Proteger un componente:
```typescript
import { useAuth } from '@/contexts/AuthContext';

export function MyComponent() {
  const { isAdmin, user } = useAuth();

  return (
    <div>
      <p>Hola, {user?.full_name}</p>
      {isAdmin && <button>Solo admin ve esto</button>}
    </div>
  );
}
```

### Hacer logout:
```typescript
import { useAuth } from '@/contexts/AuthContext';

export function LogoutButton() {
  const { logout } = useAuth();

  return (
    <button onClick={() => {
      if (confirm('¿Cerrar sesión?')) {
        logout();
      }
    }}>
      Cerrar Sesión
    </button>
  );
}
```

## ✅ Testing Checklist

- [ ] Login con credenciales correctas (admin y vendedor)
- [ ] Login con credenciales incorrectas (muestra error)
- [ ] Redirección automática según rol
- [ ] Sidebar muestra solo módulos permitidos
- [ ] Botón de cerrar sesión funciona
- [ ] Middleware protege rutas correctamente
- [ ] Token persiste en refresh de página
- [ ] Logout limpia todo correctamente
- [ ] Vendedor no puede acceder a rutas de admin
- [ ] Admin puede acceder a todo
