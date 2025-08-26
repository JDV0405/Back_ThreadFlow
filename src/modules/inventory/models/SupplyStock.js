class SupplyVariant {
  constructor(data = {}) {
    this.id_supply_variant = data.id_supply_variant;
    this.id_supply = data.id_supply;
    this.id_supply_color = data.id_supply_color;
    this.stock_actual = data.stock_actual || 0;
  }

  // Validar datos de la variante
  validate() {
    const errors = [];

    if (!this.id_supply) {
      errors.push('ID del insumo es requerido');
    }

    if (!this.id_supply_color) {
      errors.push('ID del color es requerido');
    }

    if (this.stock_actual < 0) {
      errors.push('El stock no puede ser negativo');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Verificar si hay stock suficiente
  hasEnoughStock(requiredQuantity) {
    return this.stock_actual >= requiredQuantity;
  }

  // Verificar si está en stock bajo (menos de X unidades)
  isLowStock(threshold = 10) {
    return this.stock_actual <= threshold;
  }

  // Crear desde resultado de BD
  static fromDatabase(row) {
    return new SupplyVariant({
      id_supply_variant: row.id_supply_variant,
      id_supply: row.id_supply,
      id_supply_color: row.id_supply_color,
      stock_actual: parseFloat(row.stock_actual)
    });
  }
}

module.exports = SupplyVariant;
