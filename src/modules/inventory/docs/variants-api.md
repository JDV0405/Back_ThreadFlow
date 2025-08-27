# API de Gestión de Variantes de Inventario

## Endpoints para Variantes de Insumos

### 1. Obtener todas las variantes de un insumo
**GET** `/api/inventory/supplies/:id/variants`

Obtiene todas las variantes (colores) de un insumo específico con su stock actual.

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "message": "Variantes obtenidas exitosamente",
  "data": [
    {
      "id_supply_variant": 1,
      "id_supply": 1,
      "id_supply_color": 1,
      "stock_actual": "0.0000",
      "supply_description": "Tela Lafayette",
      "color_name": "AMARILLO CLARO",
      "id_supply_type": 1,
      "measuring_uom_id": 1,
      "type_name": "INVISIBLE",
      "category_name": "SESGO",
      "uom_description": "Metros"
    },
    {
      "id_supply_variant": 2,
      "id_supply": 1,
      "id_supply_color": 2,
      "stock_actual": "100.0000",
      "supply_description": "Tela Lafayette",
      "color_name": "AZUL BEBE",
      "id_supply_type": 1,
      "measuring_uom_id": 1,
      "type_name": "INVISIBLE",
      "category_name": "SESGO",
      "uom_description": "Metros"
    }
  ],
  "count": 2
}
```

### 2. Obtener o crear una variante específica
**POST** `/api/inventory/supplies/:id/variants/get-or-create`

Obtiene una variante existente o la crea si no existe.

**Body:**
```json
{
  "id_supply_color": 4
}
```

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "message": "Variante obtenida/creada exitosamente",
  "data": {
    "id_supply_variant": 3,
    "id_supply": 1,
    "id_supply_color": 4,
    "stock_actual": 0.0000,
    "supply_description": "Tela Lafayette",
    "color_name": "Verde",
    "id_supply_type": 1,
    "measuring_uom_id": 1,
    "type_name": "INVISIBLE",
    "category_name": "SESGO",
    "uom_description": "Metros"
  }
}
```

### 3. Agregar stock a una variante específica
**POST** `/api/inventory/supplies/:id/variants/add-stock`

Agrega stock a una variante específica del insumo (por color).

**Body:**
```json
{
  "id_supply_color": 2,
  "quantity": 50.25,
  "notes": "Compra de tela azul - Proveedor ABC"
}
```

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "message": "Stock agregado a la variante exitosamente",
  "data": {
    "variant": {
      "id_supply_variant": 1,
      "id_supply": 1,
      "id_supply_color": 2,
      "stock_actual": 200.2500,
      "supply_description": "Tela Lafayette",
      "color_name": "Azul"
    },
    "movement": {
      "id_movement": 15,
      "id_supply": 1,
      "id_supply_variant": 1,
      "quantity": 50.2500,
      "movement_type": "purchase",
      "notes": "Compra de tela azul - Proveedor ABC",
      "movement_date": "2025-08-26T10:45:00.000Z"
    }
  }
}
```

### 4. Restar stock de una variante específica
**POST** `/api/inventory/supplies/:id/variants/subtract-stock`

Resta stock de una variante específica del insumo (por color).

**Body:**
```json
{
  "id_supply_color": 2,
  "quantity": 25.75,
  "notes": "Uso en producción - Orden #12345"
}
```

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "message": "Stock reducido de la variante exitosamente",
  "data": {
    "variant": {
      "id_supply_variant": 1,
      "id_supply": 1,
      "id_supply_color": 2,
      "stock_actual": 174.5000,
      "supply_description": "Tela Lafayette",
      "color_name": "Azul"
    },
    "movement": {
      "id_movement": 16,
      "id_supply": 1,
      "id_supply_variant": 1,
      "quantity": -25.7500,
      "movement_type": "issue_to_production",
      "notes": "Uso en producción - Orden #12345",
      "movement_date": "2025-08-26T11:00:00.000Z"
    }
  }
}
```

## Casos de Uso Prácticos

### Ejemplo: Gestión de Tela Lafayette

**1. Consultar variantes disponibles:**
```bash
GET /api/inventory/supplies/1/variants
```

**2. Agregar stock de tela azul:**
```bash
POST /api/inventory/supplies/1/variants/add-stock
{
  "id_supply_color": 2,
  "quantity": 100,
  "notes": "Compra inicial tela azul"
}
```

**3. Agregar stock de tela roja:**
```bash
POST /api/inventory/supplies/1/variants/add-stock
{
  "id_supply_color": 3,
  "quantity": 80,
  "notes": "Compra inicial tela roja"
}
```

**4. Usar tela azul en producción:**
```bash
POST /api/inventory/supplies/1/variants/subtract-stock
{
  "id_supply_color": 2,
  "quantity": 15.5,
  "notes": "Producción camisas azules - Orden #001"
}
```

**5. Consultar estado actual de variantes:**
```bash
GET /api/inventory/supplies/1/variants
```

## Respuestas de Error

### Error de validación:
```json
{
  "success": false,
  "message": "Datos de entrada inválidos",
  "errors": [
    "El id_supply_color es requerido",
    "La cantidad debe ser mayor a 0"
  ]
}
```

### Error de stock insuficiente:
```json
{
  "success": false,
  "message": "Stock insuficiente para la variante Azul. Stock actual: 10.0000, cantidad solicitada: 25.0000"
}
```

### Error de insumo no encontrado:
```json
{
  "success": false,
  "message": "Insumo no encontrado"
}
```

## Notas Importantes

1. **Información completa de insumo**: Cada variante incluye información completa del insumo padre (tipo, categoría, unidad de medida).

2. **Gestión automática de variantes**: Si intentas agregar stock a una variante que no existe, se creará automáticamente.

3. **Control de stock negativo**: El sistema no permite que el stock de una variante quede en negativo.

4. **Historial de movimientos**: Todos los movimientos de stock se registran automáticamente con la variante específica.

5. **IDs de colores**: Debes usar los `id_supply_color` que existen en tu tabla `supply_color`.

6. **Precisión decimal**: El sistema maneja hasta 4 decimales para las cantidades.

## Propiedades Incluidas en Variantes

Cada variante incluye ahora:
- **Información básica**: `id_supply_variant`, `id_supply`, `id_supply_color`, `stock_actual`
- **Información del insumo**: `supply_description`, `id_supply_type`, `measuring_uom_id`
- **Información del color**: `color_name`
- **Información del tipo**: `type_name`
- **Información de categoría**: `category_name`
- **Información de unidad**: `uom_description`

## Endpoints Existentes Actualizados

Los siguientes endpoints han sido actualizados para trabajar con el nuevo sistema de variantes:

- `GET /api/inventory/supplies` - Ahora incluye información de todas las variantes
- `GET /api/inventory/supplies/:id` - Incluye todas las variantes del insumo
- `GET /api/inventory/supplies/:id/movements` - Incluye movimientos por variante
- `GET /api/inventory/reports/low-stock` - Reporta stock bajo por variante
