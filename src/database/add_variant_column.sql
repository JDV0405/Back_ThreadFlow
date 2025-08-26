-- Script para agregar la columna id_supply_variant a la tabla supply_movement
-- Este script debe ejecutarse antes de usar el nuevo sistema de variantes

-- 1. Agregar la columna id_supply_variant a la tabla supply_movement
ALTER TABLE supply_movement 
ADD COLUMN id_supply_variant INTEGER;

-- 2. Agregar la clave foránea para referenciar supply_variant
ALTER TABLE supply_movement 
ADD CONSTRAINT fk_supply_movement_variant 
FOREIGN KEY (id_supply_variant) 
REFERENCES supply_variant(id_supply_variant);

-- 3. Crear índice para mejorar el rendimiento de las consultas
CREATE INDEX idx_supply_movement_variant 
ON supply_movement(id_supply_variant);

-- 4. Comentario en la columna para documentación
COMMENT ON COLUMN supply_movement.id_supply_variant IS 'ID de la variante específica del insumo (por color)';

-- Verificar la estructura actualizada
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'supply_movement' 
ORDER BY ordinal_position;

-- Script de verificación para confirmar que todo está correcto
/*
-- Verificar que la tabla supply_variant existe
SELECT COUNT(*) as variant_count FROM supply_variant;

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'supply_movement' AND column_name = 'id_supply_variant';

-- Verificar la clave foránea
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'supply_movement'
  AND kcu.column_name = 'id_supply_variant';
*/
