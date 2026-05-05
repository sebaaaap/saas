# Sistema de Autenticación y Roles - Backend

## ✅ Implementación Completada

### 1. Modelo de Usuario
- **Ubicación**: `app/models/base.py`
- **Campos**:
  - `username`: Nombre de usuario único
  - `hashed_password`: Contraseña hasheada con bcrypt
  - `full_name`: Nombre completo
  - `role`: Enum (admin | vendedor)
  - `is_active`: Estado del usuario

### 2. Seguridad JWT
- **Ubicación**: `app/core/security.py`
- **Funciones**:
  - `create_access_token()`: Genera tokens JWT
  - `verify_password()`: Verifica contraseñas
  - `get_password_hash()`: Hashea contraseñas con bcrypt
- **Configuración**: Token expira en 12 horas (configurable en `settings.ACCESS_TOKEN_EXPIRE_MINUTES`)

### 3. Endpoints de Autenticación
- **Ubicación**: `app/api/auth.py`
- **Rutas**:
  - `POST /api/v1/auth/login`: Login y obtención de token
  - `GET /api/v1/auth/me`: Información del usuario actual

### 4. Middleware RBAC (Role-Based Access Control)
- **Ubicación**: `app/api/deps.py`
- **Funciones**:
  - `get_current_user()`: Obtiene usuario desde token JWT
  - `check_roles(allowed_roles)`: Verifica permisos por rol

### 5. Permisos por Rol

#### Admin (Acceso Total):
- ✅ Ventas (POS)
- ✅ Clientes
- ✅ Productos (CRUD completo)
- ✅ Inventario (Ajustes, Movimientos, Reportes)
- ✅ Compras
- ✅ Ubicaciones
- ✅ Categorías
- ✅ Reportes

#### Vendedor (Acceso Limitado):
- ✅ Ventas (POS) - Crear y consultar
- ✅ Clientes - CRUD completo
- ✅ Búsqueda de productos (solo lectura)
- ❌ Gestión de inventario
- ❌ Compras
- ❌ Configuración de productos
- ❌ Reportes administrativos

### 6. Script de Inicialización
- **Ubicación**: `scripts/seed_db.py`
- **Usuarios creados por defecto**:
  - **Admin**: `admin` / `admin123`
  - **Vendedor**: `vendedor` / `vendedor123`
- **Ejecución**: `python scripts/seed_db.py`

### 7. Endpoints Protegidos

#### Solo Admin:
- `POST /api/v1/products/` - Crear producto
- `PUT /api/v1/products/{id}` - Actualizar producto
- `DELETE /api/v1/products/{id}` - Eliminar producto
- `GET /api/v1/products/` - Listar productos
- `POST /api/v1/inventory/adjustments` - Ajustes de inventario
- `GET /api/v1/inventory/movements` - Movimientos
- `GET /api/v1/inventory/reports` - Reportes

#### Admin + Vendedor:
- `POST /api/v1/pos/sales` - Crear venta
- `GET /api/v1/pos/products/barcode/{barcode}` - Buscar producto
- `GET /api/v1/customers/` - Listar clientes
- `POST /api/v1/customers/` - Crear cliente

## 🔐 Seguridad Implementada
1. **Hashing**: Bcrypt con salt automático
2. **JWT**: Tokens firmados con HS256
3. **Expiración**: 12 horas de sesión
4. **RBAC**: Control granular por endpoint
5. **Usuario Admin**: Garantizado en inicialización

## 📝 Próximos Pasos (Frontend)
1. Crear AuthContext para manejo de estado
2. Implementar página de login
3. Middleware de Next.js para rutas protegidas
4. Sidebar dinámico según rol
5. Botón de cerrar sesión
