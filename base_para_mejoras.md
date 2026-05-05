# Plan Base Arquitectónico: Multi-Sucursal y Mejoras

Este documento define la reestructuración a nivel de base de datos y backend necesaria para soportar múltiples sucursales reales (con precios y stock independientes) sin romper la lógica actual que ya funciona bien (como el árbol recursivo de bodegas/pasillos). 

Esta es la **base obligatoria** para luego poder construir los features listados en `mejoras.md`.

## Fase 1: Modelado de Datos (Fundación Optimizado)
- [x] Crear entidad `Branch` (Sucursal).
- [x] Agregar `branch_id` a la tabla `Product`. Dado que el sistema ya duplica `Product` por ubicación usando `barcode` para sincronizar, un `Product` representa el inventario físico en una sucursal/ubicación.
- [x] Crear entidad `UserBranchAccess` para relación N:M entre Usuarios y Sucursales.
- [x] Agregar `branch_id` a `StorageLocation` (manteniendo su lógica recursiva intacta).
- [x] Agregar `branch_id` a las tablas transaccionales: `CashRegister`, `Ticket`, `Purchase`, `WorkOrder`, `Quote`.

## Fase 2: Lógica de Inventario y Productos
- [x] Refactorizar `api/products.py` para que la sincronización por `barcode` solo afecte a los productos dentro del mismo `branch_id`.
- [x] Refactorizar endpoints de Inventario para filtrar por el `branch_id` activo.
- [x] Actualizar lógica de creación de productos para inyectar `branch_id`.

## Fase 3: Transacciones (Ventas, Compras, OT)
- [x] Inyectar `branch_id` automáticamente en `Ticket` (heredado de la sesión de caja `CashRegister`).
- [x] Inyectar `branch_id` en `Purchase` proveniente del header.
- [x] Inyectar `branch_id` en `Quote` y heredarlo a `WorkOrder` tras su aprobación.arlas a la sucursal.
- [ ] Refactorizar Compras (Ingreso de stock) para que sumen al `BranchProduct` correspondiente.

## Fase 4: Frontend y UX
- [ ] Implementar selector de Sucursal al hacer Login o dentro del sistema (Header `X-Branch-ID`).
- [ ] Actualizar vistas de Inventario y PDV para reflejar el contexto de la sucursal activa.
- [ ] Permitir crear nuevas sucursales desde el módulo de configuración.
