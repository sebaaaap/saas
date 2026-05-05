# Proyecto Vankai Kryptonita - "POST FULL V1"
## Contexto Histórico y Arquitectura del Sistema

Este documento describe el panorama general del ecosistema del proyecto y documenta exhaustivamente las directrices lógicas y funcionales, con un énfasis crítico en el módulo de Punto de Venta (PDV), para asegurar la integridad de las reglas de negocio base durante futuras modificaciones.

### 1. Resumen de Tecnologías
El sistema es una plataforma completa de Punto de Venta (POS) y ERP simplificado bajo una arquitectura cliente-servidor:
- **Backend**: FastAPI (Python) que gestiona sesiones, inventario y endpoints de ventas mediante SQLAlchemy, aplicando un control transaccional estricto y concurrente (`with_for_update`).
- **Frontend**: Next.js con React, estilizado con Tailwind CSS y componentes de Shadcn UI, proporcionando una interfaz moderna, interactiva y robusta. 
- **Módulos Principales**: Compras, Inventario, Cotizaciones/Órdenes de Trabajo (OT) y el Punto de Venta (PDV).

---

## ⚠️ Módulo de Punto de Venta (PDV) - Core Lógico 
El módulo de ventas (ubicado en `front/components/pdv/` y `backend/app/services/pos_service.py`) es la capa más sensible e importante de la aplicación. **NO alterar su lógica central sin realizar pruebas transaccionales rigurosas.**

A continuación, se detalla el comportamiento granular de sus procesos más críticos:

### 1. Sistema de Rebajas y Descuentos (Discounts)
Las rebajas no se hacen directamente sobre el ticket total de forma abierta, se manejan a **nivel de ítem (Product Line)** para asegurar que los impuestos (IVA) cuadren correctamente:
- **Frontend (`pdv-order-panel.tsx`)**: Los cajeros aplican rebajas utilizando un "Numpad" (teclado numérico en pantalla) alternando el modo a porcentual (`discount`).
- **Backend (`pos_service.py`)**: 
  - Ejecuta la función `calculate_totals` donde iterativamente ajusta el precio de cada línea: `item_total *= (1 - (discount_percent / 100))`.
  - El precio base **ya incluye IVA**, de modo que, tras aplicar la rebaja, el IVA se recalcula extrayéndolo (Neto = Total descontado / 1.19). Esto garantiza que no haya cobros engañosos y permite reflejar con precisión matemática el descuento en el ticket final y en la caja.

### 2. Devoluciones y Notas de Crédito (Refunds)
Las devoluciones implican una lógica estricta para evitar la corrupción del historial contable. **Nunca se elimina o altera el ticket validado/pagado original.**
- Cuando se requiere una devolución (parcial o total) mediante el componente `pdv-refund-modal.tsx`, el sistema genera una nota de crédito que es procesada por `create_refund`.
- **Nuevo Ticket Negativo**: Crea un nuevo Ticket con estado `REFUNDED` clonando los factores, pero con subtotales, totales e impuestos en número negativo.
- **Relación Relacional**: El ticket original marca `is_refunded = True` y enlaza el ID del ticket de devolución correspondiente (`original_ticket_id = original_ticket.id`).
- **Excepción de Servicios**: Si un ítem en el ticket original pertenece a la categoría de `SERVICE` (Servicio), el sistema levanta automáticamente alertas visuales y bloqueos en el backend: **Los servicios no pueden ser retornados al inventario físico**.

### 3. Envío a Mermas (Shrinkage / Waste) vs. Retorno a Stock
En una devolución, el cajero decide la naturaleza y estado físico del objeto devuelto. La base de datos registrará un evento de `InventoryMovement` para rastreabilidad con dos posibles flujos:
- **Reingreso al Stock (`return_to_stock = True`)**: 
  - Transacción de movimiento tipo `IN_RETURN`. La cantidad especificada se vuelve a sumar íntegramente al `stock_quantity` del producto en su ubicación base.
- **Envío a Mermas (`return_to_stock = False`)**:
  - Aplica si el producto fue dañado o pereció. El movimiento es `OUT_WASTE`.
  - **Ubicación Pasillo Mermas**: Para evitar que el producto quede en el limbo sin dar de baja su trazabilidad, el backend busca o crea una ubicación especial llamada `"Pasillo Mermas"`.
  - **Clonación / "Gemelo de Merma"**: En lugar de afectar inventarios sanos, el sistema crea o busca un producto gemelo basándose en el código de barras y lo asigna exclusivamente al `location_id` del Pasillo Mermas. Esto permite auditar un listado con exactitud de todos los artículos perdidos de la empresa.

### 4. Historial por Usuario y Sesiones de Caja (Cash Sessions)
Todo movimiento dentro del PDV depende estrictamente del usuario y de un control ciego de caja (`session_service.py`).
- **Apertura Estricta (`CashSession`)**: Ninguna orden puede crearse sin una sesión abierta. Existe una regla inquebrantable de **una sesión abierta por usuario y un usuario por registro físico (Caja Registradora)**.
- **Trazabilidad (`pdv-order-history.tsx`)**: Cada venta transaccional se inyecta directamente al `session_id`. Esto permite que el Historial de Ordenes que el cajero consulte, recupere únicamente los tickets asociados a su turno presente, evitando confusiones con ventas previas o de otros cajeros.
- **Arqueo y Cierres Seguros**: Al cerrar la caja, el sistema ignora cualquier valor en efectivo que dictamine el usuario; calcula sus propios totales (`session.total_sales_cash`, `card`, `transfer`) iterando sobre los tickets asociados y confirmados (`VALIDATED`, `PAID`, `REFUNDED`). Cualquier discrepancia generada por una devolución altera internamente el `expected_balance` de la caja antes de generar la diferencia oficial (`difference`).

---

## 🛠️ Módulo de Cotizaciones y Órdenes de Trabajo (OT)
El módulo de Cotizaciones y Órdenes de Trabajo (ubicado en `front/components/quotes-ot/` y `backend/app/services/quote_service.py`) interactúa estrechamente con el PDV e Inventario. Existen reglas muy precisas respecto al cobro parcial y la afectación de existencias.

### 1. Ciclo de Vida: Cotización -> Orden de Trabajo
- Toda **Cotización** (`Quote`) nace en estado `DRAFT`. Contiene información de cliente, vehículo (si aplica), kilometraje, y líneas de servicio (`QuoteItem`).
- Desde `DRAFT`, una cotización puede ser rechazada o **aprobada**.
- Al aprobarla (`approve_quote()`), se clona íntegramente hacia una **Orden de Trabajo** (`WorkOrder`), copiando sus ítems (`WorkOrderItem`).

### 2. Afectación de Inventario "Justo a Tiempo" (JIT)
A diferencia de una venta de PDV directo (que descuenta stock instantáneamente), aprobar una OT y listar refacciones **NO reduce el inventario físico en ese momento**. 
- La reducción ocurre de manera imperativa sobre cada ítem mediante el método `consume_item_stock()` a medida que el trabajo avanza.
- Esto genera movimientos de tipo `OUT_SALE` en el inventario.
- **Protección de Servicios**: Si el ítem consumido tiene tipo `ProductType.SERVICE`, el backend lo ignora matemáticamente: se marca como consumido pero jamás intenta buscar ubicaciones físicas o mermar stock.

### 3. Pagos Parciales (Abonos) y su Integración a Caja
Las OTs pueden recibir múltiples pagos a lo largo del tiempo.
- **Fusión con PDV**: Para mantener la contabilidad blindada, cualquier pago parcial (`add_payment`) **genera internamente un Ticket de Caja** (con la bandera especial `ticket_type = OT_PAYMENT`).
- **Saldo Recalculado**: El saldo pendiente de una OT no es un campo estático en la base de datos (lo que propiciaría desincronizaciones), sino que se recalcula al vuelo restando siempre el total de todos sus tickets "Pagados/Validados" en su historial.
- **Impacto directo en la Sesión**: Como a nivel de backend un Abono es un Ticket, impacta directamente los saldos en efectivo `total_sales_cash` y `expected_balance` de la `CashSession` actual del cajero.
- **Pagos por Ítem vs Global**: El sistema permite pagar líneas específicas (`item_ids`) o hacer pagos al balance general. En ambos casos, consolida ítems específicos (`SaleItem` con descuento 0%) atados a ese ticket para dejar un registro contable innegable.
- **Auto-cierre**: Si un pago rebaja el saldo a 0 y la totalidad de operaciones mecánicas/logísticas están finalizadas (ítems `done = True`), la orden muta automáticamente a estado `COMPLETED`.

### 4. Seguridad de Eliminación
Cualquier intento de eliminar una OT (`delete_work_order()`) choca deliberadamente contra una barrera si detecta algún abono pagado e ingresado a caja. La única manera de limpiar la deuda es revirtiendo operativamente los pagos primero.

---

***Nota para Desarrollo Futuro:*** Estas piezas interactúan directamente con los modelos de base de datos interconectados. Alterar los movimientos de "Mermas" o el concepto de "Precios con IVA Extracción" va a romper irremediablemente las gráficas del módulo contable y los historiales de caja. Tratar con máxima cautela al igual que las reglas de las Órdenes de Trabajo.
