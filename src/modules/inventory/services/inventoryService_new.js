const { query } = require('../../../database/connection');
const Supply = require('../models/Supply');
const SupplyMovement = require('../models/SupplyMovement');
const SupplyVariant = require('../models/SupplyVariant');

class InventoryService {

  // ========== GESTIÓN DE INSUMOS ==========

  /**
   * Crear un nuevo insumo
   * @param {Object} supplyData - Datos del insumo
   * @returns {Object} Insumo creado
   */
  async createSupply(supplyData) {
    try {
      const supply = new Supply(supplyData);
      const validation = supply.validate();
      
      if (!validation.isValid) {
        throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
      }

      const data = supply.toDatabase();
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');

      const insertQuery = `
        INSERT INTO supply (${keys.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;

      const result = await query(insertQuery, values);
      return Supply.fromDatabase(result.rows[0]);
    } catch (error) {
      console.log('❌ Error creando insumo:', error);
      throw new Error(`Error al crear insumo: ${error.message}`);
    }
  }

  /**
   * Obtener todos los insumos activos
   * @param {Object} filters - Filtros opcionales
   * @returns {Array} Lista de insumos con sus variantes
   */
  async getAllSupplies(filters = {}) {
    try {
      let whereConditions = ['s.active = true'];
      let queryParams = [];
      let paramIndex = 1;

      // Filtro por descripción
      if (filters.description) {
        whereConditions.push(`s.description ILIKE $${paramIndex}`);
        queryParams.push(`%${filters.description}%`);
        paramIndex++;
      }

      // Filtro por tipo
      if (filters.id_supply_type) {
        whereConditions.push(`s.id_supply_type = $${paramIndex}`);
        queryParams.push(filters.id_supply_type);
        paramIndex++;
      }

      // Filtro por color (a través de variantes)
      if (filters.id_supply_color) {
        whereConditions.push(`sv.id_supply_color = $${paramIndex}`);
        queryParams.push(filters.id_supply_color);
        paramIndex++;
      }

      const selectQuery = `
        SELECT 
          s.*,
          st.name as type_name,
          scat.name as category_name,
          uom.description as uom_description,
          COALESCE(SUM(sv.stock_actual), 0) as total_stock,
          json_agg(
            json_build_object(
              'id_supply_variant', sv.id_supply_variant,
              'id_supply_color', sv.id_supply_color,
              'color_name', svc.name,
              'stock_actual', sv.stock_actual
            ) ORDER BY svc.name
          ) FILTER (WHERE sv.id_supply_variant IS NOT NULL) as variants
        FROM supply s
        LEFT JOIN supply_type st ON s.id_supply_type = st.id_supply_type
        LEFT JOIN supply_category scat ON st.id_supply_category = scat.id_supply_category
        LEFT JOIN unit_of_measure uom ON s.measuring_uom_id = uom.id_uom
        LEFT JOIN supply_variant sv ON s.id_supply = sv.id_supply
        LEFT JOIN supply_color svc ON sv.id_supply_color = svc.id_supply_color
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY s.id_supply, s.description, s.active, s.id_supply_type, s.measuring_uom_id, 
                 st.name, scat.name, uom.description
        ORDER BY s.description
      `;

      console.log('📝 Query ejecutado:', { text: selectQuery, duration: 0, rows: 0 });
      const result = await query(selectQuery, queryParams);
      
      return result.rows.map(row => ({
        id_supply: row.id_supply,
        description: row.description,
        active: row.active,
        id_supply_type: row.id_supply_type,
        measuring_uom_id: row.measuring_uom_id,
        type_name: row.type_name,
        category_name: row.category_name,
        uom_description: row.uom_description,
        total_stock: parseFloat(row.total_stock),
        variants: row.variants || []
      }));
    } catch (error) {
      console.log('❌ Error obteniendo insumos:', error);
      throw new Error(`Error al obtener insumos: ${error.message}`);
    }
  }

  /**
   * Obtener un insumo por ID con sus variantes
   * @param {number} id_supply - ID del insumo
   * @returns {Object} Insumo con sus variantes
   */
  async getSupplyById(id_supply) {
    try {
      const selectQuery = `
        SELECT 
          s.*,
          st.name as type_name,
          scat.name as category_name,
          uom.description as uom_description,
          COALESCE(SUM(sv.stock_actual), 0) as total_stock,
          json_agg(
            json_build_object(
              'id_supply_variant', sv.id_supply_variant,
              'id_supply_color', sv.id_supply_color,
              'color_name', svc.name,
              'stock_actual', sv.stock_actual
            ) ORDER BY svc.name
          ) FILTER (WHERE sv.id_supply_variant IS NOT NULL) as variants
        FROM supply s
        LEFT JOIN supply_type st ON s.id_supply_type = st.id_supply_type
        LEFT JOIN supply_category scat ON st.id_supply_category = scat.id_supply_category
        LEFT JOIN unit_of_measure uom ON s.measuring_uom_id = uom.id_uom
        LEFT JOIN supply_variant sv ON s.id_supply = sv.id_supply
        LEFT JOIN supply_color svc ON sv.id_supply_color = svc.id_supply_color
        WHERE s.id_supply = $1 AND s.active = true
        GROUP BY s.id_supply, s.description, s.active, s.id_supply_type, s.measuring_uom_id, 
                 st.name, scat.name, uom.description
      `;

      console.log('📝 Query ejecutado:', { text: selectQuery, duration: 0, rows: 0 });
      const result = await query(selectQuery, [id_supply]);
      
      if (result.rows.length === 0) {
        throw new Error('Insumo no encontrado');
      }

      const row = result.rows[0];
      return {
        id_supply: row.id_supply,
        description: row.description,
        active: row.active,
        id_supply_type: row.id_supply_type,
        measuring_uom_id: row.measuring_uom_id,
        type_name: row.type_name,
        category_name: row.category_name,
        uom_description: row.uom_description,
        total_stock: parseFloat(row.total_stock),
        variants: row.variants || []
      };
    } catch (error) {
      console.log('❌ Error obteniendo insumo:', error);
      throw new Error(`Error al obtener insumo: ${error.message}`);
    }
  }

  /**
   * Actualizar un insumo
   * @param {number} id_supply - ID del insumo
   * @param {Object} updateData - Datos a actualizar
   * @returns {Object} Insumo actualizado
   */
  async updateSupply(id_supply, updateData) {
    try {
      // Verificar que existe
      await this.getSupplyById(id_supply);

      const supply = new Supply(updateData);
      const validation = supply.validate();
      
      if (!validation.isValid) {
        throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
      }

      const data = supply.toDatabase();
      const keys = Object.keys(data);
      const values = Object.values(data);
      
      const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');

      const updateQuery = `
        UPDATE supply 
        SET ${setClause}
        WHERE id_supply = $1 AND active = true
        RETURNING *
      `;

      const result = await query(updateQuery, [id_supply, ...values]);
      
      if (result.rows.length === 0) {
        throw new Error('Insumo no encontrado');
      }

      return await this.getSupplyById(id_supply);
    } catch (error) {
      console.log('❌ Error actualizando insumo:', error);
      throw new Error(`Error al actualizar insumo: ${error.message}`);
    }
  }

  /**
   * Eliminar un insumo (soft delete)
   * @param {number} id_supply - ID del insumo
   * @returns {boolean} True si se eliminó correctamente
   */
  async deleteSupply(id_supply) {
    try {
      const deleteQuery = `
        UPDATE supply 
        SET active = false 
        WHERE id_supply = $1 AND active = true
        RETURNING *
      `;

      const result = await query(deleteQuery, [id_supply]);
      
      if (result.rows.length === 0) {
        throw new Error('Insumo no encontrado');
      }

      return true;
    } catch (error) {
      console.log('❌ Error eliminando insumo:', error);
      throw new Error(`Error al eliminar insumo: ${error.message}`);
    }
  }

  // ========== GESTIÓN DE VARIANTES ==========

  /**
   * Obtener todas las variantes de un insumo
   * @param {number} id_supply - ID del insumo
   * @returns {Array} Lista de variantes
   */
  async getSupplyVariants(id_supply) {
    try {
      // Verificar que el insumo existe
      await this.getSupplyById(id_supply);

      const selectQuery = `
        SELECT 
          sv.*,
          s.description as supply_description,
          sc.name as color_name,
          sc.hex_code as color_hex_code
        FROM supply_variant sv
        JOIN supply s ON sv.id_supply = s.id_supply
        JOIN supply_color sc ON sv.id_supply_color = sc.id_supply_color
        WHERE sv.id_supply = $1
        ORDER BY sc.name
      `;

      const result = await query(selectQuery, [id_supply]);
      return result.rows;
    } catch (error) {
      console.log('❌ Error obteniendo variantes:', error);
      throw new Error(`Error al obtener variantes: ${error.message}`);
    }
  }

  /**
   * Obtener o crear una variante específica
   * @param {number} id_supply - ID del insumo
   * @param {number} id_supply_color - ID del color
   * @returns {Object} Variante encontrada o creada
   */
  async getOrCreateVariant(id_supply, id_supply_color) {
    try {
      // Verificar que el insumo existe
      await this.getSupplyById(id_supply);

      // Buscar variante existente
      const selectQuery = `
        SELECT * FROM supply_variant 
        WHERE id_supply = $1 AND id_supply_color = $2
      `;

      console.log('📝 Query ejecutado:', { text: selectQuery, duration: 0, rows: 0 });
      const result = await query(selectQuery, [id_supply, id_supply_color]);

      if (result.rows.length > 0) {
        // Variante existe, obtener información completa
        const variant = result.rows[0];
        const completeVariantQuery = `
          SELECT 
            sv.*,
            s.description as supply_description,
            sc.name as color_name,
            sc.hex_code as color_hex_code
          FROM supply_variant sv
          JOIN supply s ON sv.id_supply = s.id_supply
          JOIN supply_color sc ON sv.id_supply_color = sc.id_supply_color
          WHERE sv.id_supply_variant = $1
        `;
        
        const completeResult = await query(completeVariantQuery, [variant.id_supply_variant]);
        return completeResult.rows[0];
      }

      // Crear nueva variante
      const insertQuery = `
        INSERT INTO supply_variant (id_supply, id_supply_color, stock_actual)
        VALUES ($1, $2, 0)
        RETURNING *
      `;

      const insertResult = await query(insertQuery, [id_supply, id_supply_color]);
      const newVariant = insertResult.rows[0];

      // Obtener información completa de la nueva variante
      const completeVariantQuery = `
        SELECT 
          sv.*,
          s.description as supply_description,
          sc.name as color_name,
          sc.hex_code as color_hex_code
        FROM supply_variant sv
        JOIN supply s ON sv.id_supply = s.id_supply
        JOIN supply_color sc ON sv.id_supply_color = sc.id_supply_color
        WHERE sv.id_supply_variant = $1
      `;
      
      const completeResult = await query(completeVariantQuery, [newVariant.id_supply_variant]);
      return completeResult.rows[0];
    } catch (error) {
      console.log('❌ Error obteniendo/creando variante:', error);
      throw new Error(`Error al obtener/crear variante: ${error.message}`);
    }
  }

  /**
   * Agregar stock a una variante específica
   * @param {number} id_supply - ID del insumo
   * @param {number} id_supply_color - ID del color
   * @param {number} quantity - Cantidad a agregar
   * @param {string} notes - Notas del movimiento
   * @returns {Object} Resultado de la operación
   */
  async addStockToVariant(id_supply, id_supply_color, quantity, notes = '') {
    try {
      // Obtener o crear la variante
      const variant = await this.getOrCreateVariant(id_supply, id_supply_color);

      // Crear movimiento
      const movement = new SupplyMovement({
        id_supply_variant: variant.id_supply_variant,
        quantity: Math.abs(quantity), // Asegurar cantidad positiva
        movement_type: SupplyMovement.MOVEMENT_TYPES.PURCHASE,
        notes
      });

      const movementResult = await this.createMovement(movement);

      // Obtener variante actualizada
      const updatedVariant = await this.getOrCreateVariant(id_supply, id_supply_color);

      return {
        variant: updatedVariant,
        movement: movementResult.movement
      };
    } catch (error) {
      console.log('❌ Error agregando stock a variante:', error);
      throw new Error(`Error al agregar stock a variante: ${error.message}`);
    }
  }

  /**
   * Restar stock de una variante específica
   * @param {number} id_supply - ID del insumo
   * @param {number} id_supply_color - ID del color
   * @param {number} quantity - Cantidad a restar
   * @param {string} notes - Notas del movimiento
   * @returns {Object} Resultado de la operación
   */
  async subtractStockFromVariant(id_supply, id_supply_color, quantity, notes = '') {
    try {
      // Obtener variante (debe existir)
      const variant = await this.getOrCreateVariant(id_supply, id_supply_color);

      // Verificar stock suficiente
      if (variant.stock_actual < quantity) {
        throw new Error(`Stock insuficiente para la variante ${variant.color_name}. Stock actual: ${variant.stock_actual}, cantidad solicitada: ${quantity}`);
      }

      // Crear movimiento con cantidad negativa
      const movement = new SupplyMovement({
        id_supply_variant: variant.id_supply_variant,
        quantity: -Math.abs(quantity), // Asegurar cantidad negativa
        movement_type: SupplyMovement.MOVEMENT_TYPES.ISSUE_TO_PRODUCTION,
        notes
      });

      const movementResult = await this.createMovement(movement);

      // Obtener variante actualizada
      const updatedVariant = await this.getOrCreateVariant(id_supply, id_supply_color);

      return {
        variant: updatedVariant,
        movement: movementResult.movement
      };
    } catch (error) {
      console.log('❌ Error restando stock de variante:', error);
      throw new Error(`Error al restar stock de variante: ${error.message}`);
    }
  }

  // ========== GESTIÓN DE MOVIMIENTOS ==========

  /**
   * Crear un movimiento de inventario
   * @param {SupplyMovement} movement - Movimiento a crear
   * @returns {Object} Movimiento creado
   */
  async createMovement(movement) {
    try {
      const data = movement.toDatabase();
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');

      const insertQuery = `
        INSERT INTO supply_movement (${keys.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;

      console.log('📝 Query ejecutado:', { text: insertQuery, duration: 0, rows: 0 });
      const result = await query(insertQuery, values);
      
      if (result.rows.length === 0) {
        throw new Error('No se pudo crear el movimiento');
      }

      const createdMovement = SupplyMovement.fromDatabase(result.rows[0]);

      return {
        movement: createdMovement
      };
    } catch (error) {
      console.error('Error creando movimiento:', error);
      throw error;
    }
  }

  /**
   * Obtener historial de movimientos de un insumo
   * @param {number} id_supply - ID del insumo
   * @param {Object} options - Opciones de paginación
   * @returns {Array} Lista de movimientos
   */
  async getMovementHistory(id_supply, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;

      const selectQuery = `
        SELECT 
          sm.*,
          s.description as supply_description,
          sc.name as color_name,
          sv.stock_actual as current_variant_stock
        FROM supply_movement sm
        JOIN supply_variant sv ON sm.id_supply_variant = sv.id_supply_variant
        JOIN supply s ON sv.id_supply = s.id_supply
        JOIN supply_color sc ON sv.id_supply_color = sc.id_supply_color
        WHERE sv.id_supply = $1
        ORDER BY sm.movement_date DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await query(selectQuery, [id_supply, limit, offset]);
      return result.rows;
    } catch (error) {
      console.log('❌ Error obteniendo historial:', error);
      throw new Error(`Error al obtener historial: ${error.message}`);
    }
  }

  /**
   * Obtener insumos con stock bajo
   * @param {number} threshold - Umbral de stock bajo
   * @returns {Array} Lista de insumos con stock bajo
   */
  async getLowStockSupplies(threshold = 10) {
    try {
      const selectQuery = `
        SELECT 
          s.*,
          st.name as type_name,
          scat.name as category_name,
          json_agg(
            json_build_object(
              'id_supply_variant', sv.id_supply_variant,
              'id_supply_color', sv.id_supply_color,
              'color_name', sc.name,
              'stock_actual', sv.stock_actual
            ) ORDER BY sc.name
          ) as low_stock_variants
        FROM supply s
        JOIN supply_variant sv ON s.id_supply = sv.id_supply
        JOIN supply_color sc ON sv.id_supply_color = sc.id_supply_color
        LEFT JOIN supply_type st ON s.id_supply_type = st.id_supply_type
        LEFT JOIN supply_category scat ON st.id_supply_category = scat.id_supply_category
        WHERE s.active = true AND sv.stock_actual <= $1
        GROUP BY s.id_supply, s.description, s.active, s.id_supply_type, s.measuring_uom_id,
                 st.name, scat.name
        ORDER BY s.description
      `;

      const result = await query(selectQuery, [threshold]);
      return result.rows;
    } catch (error) {
      console.log('❌ Error obteniendo stock bajo:', error);
      throw new Error(`Error al obtener insumos con stock bajo: ${error.message}`);
    }
  }

  // ========== MÉTODOS LEGACY (DEPRECATED) ==========

  /**
   * @deprecated Usar getSupplyVariants
   */
  async getStockBySupply(id_supply) {
    console.warn('getStockBySupply is deprecated. Use getSupplyVariants instead.');
    return await this.getSupplyVariants(id_supply);
  }

  /**
   * @deprecated Usar addStockToVariant especificando el color
   */
  async addStock(id_supply, quantity, notes = '') {
    throw new Error('addStock is deprecated. Use addStockToVariant with specific color ID.');
  }

  /**
   * @deprecated Usar subtractStockFromVariant especificando el color
   */
  async subtractStock(id_supply, quantity, notes = '') {
    throw new Error('subtractStock is deprecated. Use subtractStockFromVariant with specific color ID.');
  }
}

module.exports = new InventoryService();
