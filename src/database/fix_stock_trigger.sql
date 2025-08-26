-- Trigger actualizado para la nueva estructura de base de datos
-- Trabaja con supply_variant y supply_movement con id_supply_variant

-- Eliminar el trigger existente si existe
DROP TRIGGER IF EXISTS trg_update_supply_stock ON supply_movement;
DROP FUNCTION IF EXISTS update_supply_stock();

-- Crear la función del trigger para supply_variant
CREATE OR REPLACE FUNCTION update_supply_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_new_stock NUMERIC(12,4);
BEGIN
    -- Si es INSERT
    IF TG_OP = 'INSERT' THEN
        -- La cantidad ya viene con el signo correcto desde la aplicación
        UPDATE supply_variant
        SET stock_actual = stock_actual + NEW.quantity
        WHERE id_supply_variant = NEW.id_supply_variant;

        -- Validar que no quede en negativo
        SELECT stock_actual INTO v_new_stock
        FROM supply_variant
        WHERE id_supply_variant = NEW.id_supply_variant;

        IF v_new_stock < 0 THEN
            RAISE EXCEPTION 'Stock negativo no permitido para supply_variant % (stock resultante: %.4f)', NEW.id_supply_variant, v_new_stock;
        END IF;

        RETURN NEW;
    END IF;

    -- Si es DELETE
    IF TG_OP = 'DELETE' THEN
        -- Revertir el movimiento (opuesto al que se hizo)
        UPDATE supply_variant
        SET stock_actual = stock_actual - OLD.quantity
        WHERE id_supply_variant = OLD.id_supply_variant;

        -- Validar que no quede en negativo
        SELECT stock_actual INTO v_new_stock
        FROM supply_variant
        WHERE id_supply_variant = OLD.id_supply_variant;

        IF v_new_stock < 0 THEN
            RAISE EXCEPTION 'Stock negativo no permitido para supply_variant % (stock resultante: %.4f)', OLD.id_supply_variant, v_new_stock;
        END IF;

        RETURN OLD;
    END IF;

    -- Si es UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- Revertir el movimiento anterior y aplicar el nuevo
        UPDATE supply_variant
        SET stock_actual = stock_actual - OLD.quantity + NEW.quantity
        WHERE id_supply_variant = NEW.id_supply_variant;

        -- Validar que no quede en negativo
        SELECT stock_actual INTO v_new_stock
        FROM supply_variant
        WHERE id_supply_variant = NEW.id_supply_variant;

        IF v_new_stock < 0 THEN
            RAISE EXCEPTION 'Stock negativo no permitido para supply_variant % (stock resultante: %.4f)', NEW.id_supply_variant, v_new_stock;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger
CREATE TRIGGER trg_update_supply_stock
AFTER INSERT OR UPDATE OR DELETE ON supply_movement
FOR EACH ROW
EXECUTE FUNCTION update_supply_stock();

-- Script de verificación para comprobar que funciona correctamente
/*
-- Verificar estructura de tablas
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('supply', 'supply_variant', 'supply_movement', 'supply_color')
ORDER BY table_name, ordinal_position;

-- Verificar que hay datos de prueba
SELECT COUNT(*) as supply_count FROM supply;
SELECT COUNT(*) as variant_count FROM supply_variant;
SELECT COUNT(*) as color_count FROM supply_color;

-- Prueba del trigger:
-- 1. Ver estado inicial
SELECT 
    sv.id_supply_variant,
    sv.id_supply,
    sv.id_supply_color,
    sv.stock_actual,
    s.description,
    sc.name as color_name
FROM supply_variant sv
JOIN supply s ON sv.id_supply = s.id_supply
JOIN supply_color sc ON sv.id_supply_color = sc.id_supply_color
WHERE sv.id_supply = 1;

-- 2. Agregar stock (debería aumentar el stock_actual)
INSERT INTO supply_movement (id_supply_variant, quantity, movement_type, notes) 
VALUES (1, 50.0000, 'purchase', 'Prueba de trigger - agregar stock');

-- 3. Verificar stock después de agregar
SELECT 
    sv.id_supply_variant,
    sv.stock_actual,
    s.description,
    sc.name as color_name
FROM supply_variant sv
JOIN supply s ON sv.id_supply = s.id_supply
JOIN supply_color sc ON sv.id_supply_color = sc.id_supply_color
WHERE sv.id_supply_variant = 1;

-- 4. Restar stock (debería disminuir el stock_actual)
INSERT INTO supply_movement (id_supply_variant, quantity, movement_type, notes) 
VALUES (1, -10.0000, 'issue_to_production', 'Prueba de trigger - restar stock');

-- 5. Verificar stock final
SELECT 
    sv.id_supply_variant,
    sv.stock_actual,
    s.description,
    sc.name as color_name
FROM supply_variant sv
JOIN supply s ON sv.id_supply = s.id_supply
JOIN supply_color sc ON sv.id_supply_color = sc.id_supply_color
WHERE sv.id_supply_variant = 1;

-- 6. Ver historial de movimientos
SELECT 
    sm.*,
    s.description,
    sc.name as color_name
FROM supply_movement sm
JOIN supply_variant sv ON sm.id_supply_variant = sv.id_supply_variant
JOIN supply s ON sv.id_supply = s.id_supply
JOIN supply_color sc ON sv.id_supply_color = sc.id_supply_color
WHERE sv.id_supply = 1
ORDER BY sm.movement_date DESC;
*/
