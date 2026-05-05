# Sistema de Compras - Similar a Odoo

## 📋 Descripción

Este sistema implementa un flujo de compras similar a Odoo con los siguientes estados:

- **BORRADOR (DRAFT)**: La compra se crea pero no afecta el inventario
- **CONFIRMADO (CONFIRMED)**: La compra se confirma, actualiza costos y suma stock
- **CANCELADO (CANCELLED)**: La compra se cancela (solo si está en borrador)

## 🔄 Flujo de Trabajo

### 1. Crear Compra (Estado: BORRADOR)

```bash
POST /api/v1/purchases/
```

**Body:**
```json
{
  "supplier_id": 1,
  "invoice_number": "FAC-001-2024",
  "notes": "Primera compra del mes",
  "items": [
    {
      "product_id": 1,
      "quantity": 50,
      "unit_cost": 750.0
    },
    {
      "product_id": 2,
      "quantity": 100,
      "unit_cost": 550.0
    }
  ]
}
```

**Respuesta:**
```json
{
  "id": 1,
  "date_created": "2024-02-06T05:15:00",
  "supplier_id": 1,
  "invoice_number": "FAC-001-2024",
  "total_cost": 92500.0,
  "state": "DRAFT",
  "notes": "Primera compra del mes",
  "items": [
    {
      "id": 1,
      "product_id": 1,
      "quantity": 50,
      "unit_cost": 750.0,
      "subtotal": 37500.0
    },
    {
      "id": 2,
      "product_id": 2,
      "quantity": 100,
      "unit_cost": 550.0,
      "subtotal": 55000.0
    }
  ]
}
```

**⚠️ Importante:** En este estado, el stock NO se modifica.

### 2. Confirmar Compra

```bash
POST /api/v1/purchases/{purchase_id}/confirm
```

**Acciones que realiza:**
- ✅ Cambia el estado a `CONFIRMED`
- ✅ Actualiza el costo de cada producto
- ✅ Crea un movimiento de inventario tipo `IN_PURCHASE`
- ✅ Incrementa el stock de los productos

### 3. Cancelar Compra (solo en borrador)

```bash
POST /api/v1/purchases/{purchase_id}/cancel
```

**⚠️ Solo funciona si la compra está en estado BORRADOR**

### 4. Listar Compras

```bash
GET /api/v1/purchases/
GET /api/v1/purchases/?state=DRAFT
GET /api/v1/purchases/?state=CONFIRMED
```

### 5. Ver Detalle de Compra

```bash
GET /api/v1/purchases/{purchase_id}
```

### 6. Actualizar Compra (solo en borrador)

```bash
PATCH /api/v1/purchases/{purchase_id}
```

**Body:**
```json
{
  "supplier_id": 2,
  "invoice_number": "FAC-002-2024",
  "notes": "Actualización de datos"
}
```

## 🗄️ Migración de Base de Datos

### Aplicar migraciones:

```bash
cd backend
python scripts/db_setup.py --migrate
```

### O crear tablas directamente:

```bash
python scripts/db_setup.py --create
```

## 🧪 Pruebas

Para probar el flujo completo de compras:

```bash
cd backend
python scripts/test_purchases.py
```

Este script:
1. Crea un proveedor
2. Crea productos con stock en 0
3. Crea una compra en borrador (verifica que stock no cambie)
4. Confirma la compra (verifica que stock sí cambie)
5. Intenta cancelar una compra confirmada (debe fallar)
6. Crea y cancela una compra en borrador (debe funcionar)

## 📊 Diferencias con el Sistema Anterior

| Aspecto | Antes | Ahora (Similar a Odoo) |
|---------|-------|------------------------|
| **Estados** | No existían | DRAFT → CONFIRMED → CANCELLED |
| **Stock** | Se modificaba inmediatamente | Solo se modifica al confirmar |
| **Validaciones** | Básicas | Robustas con mensajes claros |
| **Edición** | Siempre permitida | Solo en borrador |
| **Cancelación** | No existía | Solo en borrador |
| **Costos** | Se actualizaban inmediatamente | Solo al confirmar |

## 🔐 Validaciones Implementadas

- ✅ No se puede crear compra sin items
- ✅ No se puede confirmar una compra ya confirmada
- ✅ No se puede cancelar una compra confirmada
- ✅ No se puede editar una compra confirmada
- ✅ Validación de stock insuficiente en ventas
- ✅ Validación de productos existentes
- ✅ Validación de proveedores existentes
- ✅ Validación de cantidades positivas
- ✅ Validación de costos no negativos

## 🎯 Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/purchases/` | Crear compra (borrador) |
| GET | `/api/v1/purchases/` | Listar compras |
| GET | `/api/v1/purchases/{id}` | Ver detalle |
| POST | `/api/v1/purchases/{id}/confirm` | Confirmar compra |
| POST | `/api/v1/purchases/{id}/cancel` | Cancelar compra |
| PATCH | `/api/v1/purchases/{id}` | Actualizar compra |

## 🚀 Próximos Pasos (Opcional)

- [ ] Agregar devoluciones de compra
- [ ] Implementar historial de cambios
- [ ] Agregar reportes de compras
- [ ] Implementar alertas de stock mínimo
- [ ] Agregar múltiples ubicaciones de almacenamiento
