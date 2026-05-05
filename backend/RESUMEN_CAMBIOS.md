# 🎉 Sistema de Compras Arreglado - Similar a Odoo

## ✅ Cambios Realizados

### 1. **Modelo de Datos Mejorado**

#### Nuevo Enum: `PurchaseState`
```python
class PurchaseState(enum.Enum):
    DRAFT = "borrador"
    CONFIRMED = "confirmado"
    CANCELLED = "cancelado"
```

#### Modelo `Purchase` Actualizado
- ✅ Campo `state` (estado de la compra)
- ✅ Campo `notes` (observaciones)
- ✅ Relación con `Supplier` mejorada

### 2. **Schemas Mejorados** (`app/schemas/purchases.py`)

- ✅ `PurchaseItemResponse` - Incluye subtotal calculado
- ✅ `PurchaseCreate` - Incluye campo notes
- ✅ `PurchaseUpdate` - Para actualizar compras en borrador
- ✅ `PurchaseResponse` - Respuesta completa con items y estado

### 3. **Servicio de Compras Reescrito** (`app/services/purchase_service.py`)

#### Métodos Implementados:

1. **`create_purchase()`** - Crea compra en estado BORRADOR
   - ✅ No afecta el stock
   - ✅ Validaciones robustas
   - ✅ Calcula totales automáticamente

2. **`confirm_purchase()`** - Confirma la compra
   - ✅ Cambia estado a CONFIRMADO
   - ✅ Actualiza costos de productos
   - ✅ Crea movimiento de inventario
   - ✅ Incrementa stock

3. **`cancel_purchase()`** - Cancela compra en borrador
   - ✅ Solo funciona en estado BORRADOR
   - ✅ No afecta stock

4. **`update_purchase()`** - Actualiza datos de compra
   - ✅ Solo en estado BORRADOR
   - ✅ Valida proveedor

5. **`get_purchase()`** - Obtiene detalle completo

6. **`list_purchases()`** - Lista con filtro por estado

### 4. **API Expandida** (`app/api/purchases.py`)

#### Endpoints Disponibles:

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/purchases/` | Crear compra (borrador) |
| GET | `/api/v1/purchases/` | Listar compras (con filtro) |
| GET | `/api/v1/purchases/{id}` | Ver detalle |
| POST | `/api/v1/purchases/{id}/confirm` | ✨ **CONFIRMAR** (afecta stock) |
| POST | `/api/v1/purchases/{id}/cancel` | Cancelar (solo borrador) |
| PATCH | `/api/v1/purchases/{id}` | Actualizar (solo borrador) |

### 5. **Servicio de Inventario Mejorado** (`app/services/inventory_service.py`)

- ✅ Validación de stock insuficiente
- ✅ Mensajes de error claros
- ✅ Permite stock negativo solo en ajustes

### 6. **Scripts de Utilidad**

- ✅ `scripts/update_db.py` - Actualiza base de datos SQLite
- ✅ `scripts/test_purchases.py` - Prueba completa del flujo
- ✅ `scripts/db_setup.py` - Gestión de migraciones

### 7. **Migración de Base de Datos**

- ✅ `alembic/versions/a1b2c3d4e5f6_add_purchase_state_and_notes.py`

## 🚀 Cómo Usar

### Paso 1: Actualizar Base de Datos

```bash
cd backend
python3 scripts/update_db.py
```

### Paso 2: Probar el Sistema (Opcional)

```bash
python3 scripts/test_purchases.py
```

**Nota:** Si falta instalar dependencias, ejecuta:
```bash
pip install sqlalchemy fastapi pydantic
```

### Paso 3: Iniciar el Servidor

```bash
uvicorn app.main:app --reload
```

## 📖 Ejemplo de Uso

### 1. Crear Compra en Borrador

```bash
curl -X POST http://localhost:8000/api/v1/purchases/ \
  -H "Content-Type: application/json" \
  -d '{
    "supplier_id": 1,
    "invoice_number": "FAC-001",
    "notes": "Primera compra",
    "items": [
      {"product_id": 1, "quantity": 50, "unit_cost": 750.0},
      {"product_id": 2, "quantity": 100, "unit_cost": 550.0}
    ]
  }'
```

**Resultado:** Compra creada en estado `DRAFT`, stock NO cambia.

### 2. Confirmar Compra

```bash
curl -X POST http://localhost:8000/api/v1/purchases/1/confirm
```

**Resultado:** 
- Estado cambia a `CONFIRMED`
- Stock se incrementa
- Costos se actualizan
- Se crea movimiento de inventario

### 3. Listar Compras

```bash
# Todas las compras
curl http://localhost:8000/api/v1/purchases/

# Solo borradores
curl http://localhost:8000/api/v1/purchases/?state=DRAFT

# Solo confirmadas
curl http://localhost:8000/api/v1/purchases/?state=CONFIRMED
```

## 🎯 Flujo Similar a Odoo

```
┌─────────────────┐
│  Crear Compra   │
│   (BORRADOR)    │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌──────────────┐
│    Confirmar    │  │   Cancelar   │
│  (CONFIRMADO)   │  │ (CANCELADO)  │
└─────────────────┘  └──────────────┘
         │
         ▼
  ✅ Stock actualizado
  ✅ Costos actualizados
  ✅ Movimiento creado
```

## 🔒 Validaciones Implementadas

- ✅ No se puede crear compra sin items
- ✅ Cantidades deben ser positivas
- ✅ Costos no pueden ser negativos
- ✅ Productos deben existir
- ✅ Proveedores deben existir (si se especifica)
- ✅ Solo se puede confirmar compras en BORRADOR
- ✅ Solo se puede cancelar compras en BORRADOR
- ✅ Solo se puede editar compras en BORRADOR
- ✅ No se puede vender sin stock suficiente

## 📊 Comparación con Sistema Anterior

| Característica | Antes | Ahora |
|----------------|-------|-------|
| Estados | ❌ No | ✅ Sí (DRAFT/CONFIRMED/CANCELLED) |
| Stock inmediato | ✅ Sí | ❌ Solo al confirmar |
| Edición | ✅ Siempre | ✅ Solo en borrador |
| Cancelación | ❌ No | ✅ Sí (solo borrador) |
| Validaciones | ⚠️ Básicas | ✅ Robustas |
| Mensajes de error | ⚠️ Genéricos | ✅ Específicos |

## 🎨 Próximos Pasos (Frontend)

Para crear la interfaz de usuario, necesitarás:

1. **Página de Compras** (`/purchases`)
   - Lista de compras con filtros por estado
   - Botones: Crear, Ver, Confirmar, Cancelar

2. **Formulario de Nueva Compra**
   - Selector de proveedor
   - Tabla para agregar productos
   - Cálculo automático de totales
   - Botón "Guardar Borrador"

3. **Vista de Detalle**
   - Información de la compra
   - Lista de items
   - Botones según estado:
     - DRAFT: Confirmar, Cancelar, Editar
     - CONFIRMED: Solo ver
     - CANCELLED: Solo ver

4. **Indicadores Visuales**
   - Badge de estado con colores:
     - DRAFT: Amarillo
     - CONFIRMED: Verde
     - CANCELLED: Rojo

## 📝 Archivos Modificados/Creados

### Modificados:
- ✅ `app/models/base.py`
- ✅ `app/schemas/purchases.py`
- ✅ `app/services/purchase_service.py`
- ✅ `app/services/inventory_service.py`
- ✅ `app/api/purchases.py`

### Creados:
- ✅ `scripts/update_db.py`
- ✅ `scripts/test_purchases.py`
- ✅ `scripts/db_setup.py`
- ✅ `alembic/versions/a1b2c3d4e5f6_add_purchase_state_and_notes.py`
- ✅ `COMPRAS_README.md`
- ✅ `RESUMEN_CAMBIOS.md` (este archivo)

## ✨ ¡Todo Listo!

El sistema de compras ahora funciona de manera similar a Odoo:
- ✅ Crear en borrador
- ✅ Confirmar para afectar stock
- ✅ Cancelar si es necesario
- ✅ Validaciones robustas
- ✅ API completa

**¡El backend está listo para usar! 🎉**
