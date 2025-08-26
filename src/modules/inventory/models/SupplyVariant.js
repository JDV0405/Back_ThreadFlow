class SupplyVariant {
  constructor(data = {}) {
    this.id_supply_variant = data.id_supply_variant;
    this.id_supply = data.id_supply;
    this.id_supply_color = data.id_supply_color;
    this.stock_actual = data.stock_actual || 0;
    this.created_at = data.created_at;
  }

  // Validar datos de la variante
  validate() {
    const errors = [];

    if (!this.id_supply || !Number.isInteger(this.id_supply) || this.id_supply <= 0) {
      errors.push('ID del insumo es requerido y debe ser un número entero positivo');
    }

    if (!this.id_supply_color || !Number.isInteger(this.id_supply_color) || this.id_supply_color <= 0) {
      errors.push('ID del color es requerido y debe ser un número entero positivo');
    }

    if (this.stock_actual !== undefined && (isNaN(this.stock_actual) || this.stock_actual < 0)) {
      errors.push('El stock actual debe ser un número mayor o igual a 0');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convertir a objeto para inserción en BD
  toDatabase() {
    return {
      id_supply: this.id_supply,
      id_supply_color: this.id_supply_color,
      stock_actual: this.stock_actual || 0
    };
  }

  // Crear desde resultado de BD
  static fromDatabase(row) {
    return new SupplyVariant({
      id_supply_variant: row.id_supply_variant,
      id_supply: row.id_supply,
      id_supply_color: row.id_supply_color,
      stock_actual: parseFloat(row.stock_actual) || 0,
      created_at: row.created_at
    });
  }

  // Obtener información extendida con nombres
  static fromDatabaseExtended(row) {
    const variant = new SupplyVariant({
      id_supply_variant: row.id_supply_variant,
      id_supply: row.id_supply,
      id_supply_color: row.id_supply_color,
      stock_actual: parseFloat(row.stock_actual) || 0,
      created_at: row.created_at
    });

    // Agregar información adicional si está disponible
    if (row.supply_description) {
      variant.supply_description = row.supply_description;
    }
    if (row.color_name) {
      variant.color_name = row.color_name;
    }

    return variant;
  }
}

module.exports = SupplyVariant;
