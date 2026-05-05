# Progreso de Mejoras y Refactorización

> Bitácora técnica alineada con los objetivos de `mejoras.md`.
> Última actualización: **02/05/2026**

---

## ✅ MÓDULO: SUCURSALES (Multi-Branch)
> **Objetivo (mejoras.md):** Soporte de N sucursales con inventario y operaciones aisladas por local, con vista consolidada para el administrador.

### 30/04/2026
- [x] Arquitectura base definida en `base_para_mejoras.md`.
- [x] Modelos `Branch` y `UserBranchAccess` creados en `models/base.py`.
- [x] `branch_id` agregado como FK en: `Product`, `StorageLocation`, `CashRegister`, `Ticket`, `Purchase`, `WorkOrder`, `Quote`.
- [x] Migración Alembic generada y aplicada (`70b16041ece4_multi_branch_architecture`).
- [x] `api/products.py`: sincronización de precios solo afecta productos hermanos de la misma sucursal.
- [x] `api/pos.py`: el `branch_id` se inyecta automáticamente al Ticket desde el CashRegister de la sesión.
- [x] `api/purchases.py` y `api/quotes.py`: guardan `branch_id` por documento/OT.
- [x] Frontend: Selector de sucursal (`BranchSelector.tsx`) inyecta `X-Branch-ID` globalmente via interceptor Axios.
- [x] Panel Ajustes: CRUD de sucursales (`BranchManagement`), similar al de cajas y usuarios.

### 01/05/2026
- [x] **Aislamiento estricto de inventario:** Eliminado el fallback `branch_id=None` en `products.py` e `inventory.py`. Si cambias a Sucursal B, el catálogo y stock aparecen vacíos.
- [x] **Migración de datos históricos:** Script `assign_branch.py` ejecutado. Todos los registros antiguos (Productos, Pasillos, Cajas, Tickets, Compras, OTs, Cotizaciones) asignados a "Casa Matriz".
- [x] **Aislamiento de Ubicaciones/Pasillos:** `api/locations.py` y `LocationService` filtran pasillos y bodegas por sucursal. Los pasillos virtuales (Mermas, Stock) también son exclusivos por sucursal.
- [x] **Historial de clientes multi-sucursal:** `api/customers.py` retorna `branch_name` en Ventas, OTs y Cotizaciones. UI (`customers-module.tsx`) muestra badge de sucursal en cada transacción del historial.
- [x] **Reportes por sucursal (Admin):** Endpoints `reports/sales/summary`, `reports/sales/profitability`, `reports/inventory/summary`, `reports/purchases/summary` y `reports/sales/export` aceptan query param `?branch_id=`. Sin filtro = consolidado de todas las sucursales.
- [x] **Selector de sucursal en Reportes:** Dropdown `BranchFilter` integrado en `puntodeventareporte.tsx` (Ventas y Rentabilidad) e `inventarioreporte.tsx`. Se oculta automáticamente si hay 1 sola sucursal.
- [x] **Excel de Ventas:** Nueva columna "Sucursal" en hoja Transacciones e Ítems Vendidos.
- [x] **Tabla "Últimas Transacciones":** Columna Sucursal agregada + devoluciones filtradas de la vista.

### 02/05/2026 (Sesión Final)
- [x] **Transferencia entre Sucursales:** Módulo `BranchTransferModal` implementado. Lógica de doble movimiento (Salida Origen / Entrada Destino) en `InventoryService`.
- [x] **Jerarquía en Importación:** Refactorizado `import_products` para soportar categorías y pasillos anidados (ej: `Filtros / Aceite / A1`).
- [x] **Gestión Administrativa:** Exposición de mantenedores de Categorías de Gasto y Métodos de Pago en el panel de Ajustes.
- [x] **Alertas de Stock:** Animación de parpadeo (pulsing) y sombras en productos con stock crítico en el PDV.

---

### 02/05/2026
- [x] **Modelo dinámico:** `PaymentMethodConfig` creado en `base.py`. Transición de Enums estáticos a Strings en `Ticket` y `WorkOrderPayment`.
- [x] **Mantenedor en Ajustes:** Nuevo componente `PaymentMethodManagement.tsx` integrado en el panel de Ajustes. Permite crear, editar (activar/desactivar) y asignar iconos a métodos de pago.
- [x] **Carga dinámica en PDV:** `PdvPaymentModal` y `PdvOtPaymentModal` consumen el hook `usePaymentMethods` para mostrar las opciones reales de la BD, incluyendo iconos y estados.
- [x] **Seeding:** Script `seed_payment_methods.py` creado para inicializar la BD con Efectivo, Tarjeta y Transferencia.
- [x] Asociar crédito interno a cliente específico (Pendiente lógica de saldos).

---

## 🔲 MÓDULO: PDV — Creación Rápida Auto/Cliente
> **Objetivo (mejoras.md):** Acelerar la creación de cliente+vehículo desde el PDV. Flujo: Patente → Nombre Cliente → Contacto (tel/email). El tipo de vehículo (auto/moto/camión) seleccionable con emoji. Datos adicionales se completan luego en módulo Clientes.

- [x] Componente de creación rápida en PDV (modal o panel lateral).
- [x] Campo patente con emoji de vehículo dinámico (auto 🚗 / moto 🏍️ / camión 🚛).
- [x] API: endpoint de creación de cliente+vehículo simplificado con solo 3 campos.
- [x] Vincular el ticket activo al cliente/vehículo recién creado.

---

### 02/05/2026
- [x] **Componente `PdvVehicleHistory`:** Creado e integrado en el PDV. Permite buscar el historial de cualquier patente directamente desde la barra superior.
- [x] **Integración visual:** Los disparadores están expuestos en `PdvHeader` y se gestionan en `AppPage.tsx`.

---

- [x] **Categorías de Gasto:** CRUD completo en Ajustes y conexión con el Modo Gasto del PDV. **(FINALIZADO)**

---

### 02/05/2026
- [x] **Soporte de Jerarquía `/`:** El importador ahora detecta y crea automáticamente la ruta completa de categorías y ubicaciones.
- [x] **Aislamiento por Sucursal:** La importación respeta el `branch_id` de la sesión activa para asignar productos y bodegas. **(FINALIZADO)**

---

### 02/05/2026
- [x] **Alertas Visuales:** `PdvProductGrid` ahora destaca con un icono de advertencia parpadeante los productos con stock bajo (`stock <= stock_min`).
- [x] **Bloqueo por falta de stock:** Se añadió un overlay de "Sin Stock" en las cards del producto cuando el stock llega a cero, deshabilitando el botón.
- [x] **Mapeo de datos:** Integrado `stockMin` en el flujo de datos del frontend.

---

### 02/05/2026
- [x] **Flujo Inter-Sucursal:** Diseñado e implementado como un modal centralizado en Operaciones de Inventario.
- [x] **Trazabilidad:** Generación de movimientos `BRANCH_TRANSFER_OUT` y `BRANCH_TRANSFER_IN` para auditoría clara. **(FINALIZADO)**

---

## Leyenda
- ✅ Completado
- 🔲 Pendiente / Por iniciar
- ⏳ En curso o parcialmente listo
