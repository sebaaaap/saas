# Mejoras en el Módulo de Clientes (Historial)

## 1. Modificación en la API (Backend)
- **Archivo:** `/backend/app/api/customers.py`
- **Cambios realizados:**
  - Se modificó la función `get_customer_history` para que la consulta de ventas (Tickets) ahora también extraiga la propiedad `document_type` (Factura o Boleta).
  - Se agregó una nueva consulta a la base de datos para recuperar todas las **Cotizaciones** asociadas al cliente, usando el modelo `Quote`.
  - Se estructuró la respuesta JSON para que el endpoint de historial devuelva ahora una nueva propiedad `"quotes"`, que contiene un array con el detalle de las cotizaciones (fecha, total, estado, vehículo y lista de productos/servicios).

## 2. Mejoras en la Interfaz de Usuario (Frontend)
- **Archivo:** `/front/components/backend/customers-module.tsx`
- **Cambios realizados:**
  - **Historial de Ventas (Columna Documento):** En la tabla de ventas, bajo el número de ticket (ej. `VT-123456`), ahora se muestra en pequeño y con formato uppercase si el documento emitido fue una **"BOLETA"** o una **"FACTURA"**, utilizando el campo `document_type`.
  - **Nueva Pestaña "Historial Cotizaciones":** Se agregó un nuevo tab (`<TabsTrigger>`) llamado **Historial Cotizaciones** en el perfil del cliente.
  - **Lista de Cotizaciones:** Se creó el contenido del tab (`<TabsContent value="quotes">`) renderizando las cotizaciones en un formato de grillas en tarjetas. Se muestran datos como el monto total, el vehículo vinculado, la fecha y un *badge* con un color condicional según el estado de la cotización (`aprobado` en verde, `rechazado` en rojo, `borrador` en amarillo).
  - **Modal de Detalle de Cotización:** Se agregó un estado `selectedQuote` y su respectivo modal flotante (`<Dialog>`). Al hacer clic en una cotización del historial, se abre un popup detallado de color morado que muestra:
    - ID y Estado de la cotización.
    - Vehículo y Fecha.
    - Tabla con el desglose exacto de los productos y servicios cotizados, incluyendo cantidad, precio unitario y subtotal.
    - Total de la cotización.

Estas mejoras permiten a los cajeros y mecánicos tener una vista en 360 grados de todo el viaje del cliente, desde que cotiza, hasta que se le aprueba una OT y finalmente se le factura.
