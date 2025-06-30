-- =============================================================================
-- PASO 4: AGREGAR COLUMNAS A TABLA PRODUCTOS - COMPATIBLE CON SAFE MODE
-- =============================================================================
-- ⚠️ IMPORTANTE: Ejecutar SOLO después de verificar que el paso 1-3 funcionó

-- Desactivar safe mode temporalmente para esta migración
SET SQL_SAFE_UPDATES = 0;

-- Verificar estructura actual de productos
SELECT 'ESTRUCTURA ACTUAL DE PRODUCTOS' as info;
DESCRIBE productos;

-- =============================================================================
-- AGREGAR NUEVAS COLUMNAS UNA POR UNA
-- =============================================================================

-- Categorización
ALTER TABLE productos ADD COLUMN IF NOT EXISTS categoria_id INT DEFAULT NULL;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS marca_id INT DEFAULT NULL;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS sku VARCHAR(50) DEFAULT NULL;

-- Información comercial
ALTER TABLE productos ADD COLUMN IF NOT EXISTS descripcion_corta TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS descripcion_larga TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_publico DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_oferta DECIMAL(10,2) DEFAULT NULL;

-- Inventario
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_actual INT DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_minimo INT DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS peso DECIMAL(8,3) DEFAULT NULL;

-- Estados y características
ALTER TABLE productos ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS destacado BOOLEAN DEFAULT FALSE;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS nuevo BOOLEAN DEFAULT FALSE;

-- SEO y metadatos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS slug VARCHAR(255) DEFAULT NULL;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS tags JSON DEFAULT NULL;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS galeria_imagenes JSON DEFAULT NULL;

-- Fechas (solo si no existen)
ALTER TABLE productos ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- =============================================================================
-- VERIFICAR QUE SE AGREGARON LAS COLUMNAS
-- =============================================================================

SELECT 'NUEVA ESTRUCTURA DE PRODUCTOS' as info;
DESCRIBE productos;

-- Contar columnas nuevas vs originales
SELECT COUNT(*) as total_columnas_ahora FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'productos';

-- =============================================================================
-- POBLAR NUEVAS COLUMNAS CON DATOS INTELIGENTES
-- =============================================================================

-- 1. Asignar categoría por defecto (usando id como clave)
UPDATE productos 
SET categoria_id = (SELECT id FROM categorias WHERE slug = 'productos-3d' LIMIT 1)
WHERE id > 0 AND categoria_id IS NULL;

-- 2. Generar SKU únicos (usando id como clave)
UPDATE productos 
SET sku = CONCAT('3D-', LPAD(id, 4, '0'))
WHERE id > 0 AND sku IS NULL;

-- 3. Generar slug único para cada producto (usando id como clave)
UPDATE productos 
SET slug = CONCAT(
    LOWER(
        REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(nombre, ' ', '-'), 
                    'ñ', 'n'
                ), 
                'á', 'a'
            ),
            'ó', 'o'
        )
    ), 
    '-', id
)
WHERE id > 0 AND slug IS NULL;

-- 4. Calcular precio público basado en costo + margen (usando id como clave)
UPDATE productos 
SET precio_publico = ROUND(total * 1.4, 2)  -- 40% margen por defecto
WHERE id > 0 AND precio_publico IS NULL AND total IS NOT NULL AND total > 0;

-- 5. Asignar stock inicial conservador (usando id como clave)
UPDATE productos 
SET stock_actual = 3,    -- Stock inicial conservador
    stock_minimo = 1     -- Mínimo para reorden
WHERE id > 0 AND (stock_actual = 0 OR stock_actual IS NULL);

-- 6. Activar todos los productos existentes (usando id como clave)
UPDATE productos 
SET activo = TRUE
WHERE id > 0 AND activo IS NULL;

-- 7. Marcar algunos productos como destacados (los más caros)
UPDATE productos 
SET destacado = TRUE
WHERE id > 0 AND total >= (
    SELECT avg_precio FROM (
        SELECT COALESCE(AVG(total), 0) * 1.5 as avg_precio 
        FROM productos 
        WHERE total IS NOT NULL AND total > 0
    ) as subquery
) AND total > 0;

-- =============================================================================
-- CREAR TABLAS RELACIONADAS (si no existen)
-- =============================================================================

-- Tabla para atributos de productos
CREATE TABLE IF NOT EXISTS producto_atributos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    atributo_id INT NOT NULL,
    valor TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_producto_atributo (producto_id, atributo_id),
    INDEX idx_producto_atributos_producto (producto_id),
    INDEX idx_producto_atributos_atributo (atributo_id)
);

-- Tabla para reseñas
CREATE TABLE IF NOT EXISTS producto_resenas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    usuario_id INT DEFAULT NULL,
    nombre_cliente VARCHAR(100) NOT NULL,
    calificacion INT NOT NULL CHECK (calificacion >= 1 AND calificacion <= 5),
    comentario TEXT,
    aprobado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_resenas_producto (producto_id),
    INDEX idx_resenas_aprobado (aprobado)
);

-- =============================================================================
-- MIGRAR DATOS EXISTENTES A ATRIBUTOS
-- =============================================================================

-- Migrar filamento como atributo Material
INSERT IGNORE INTO producto_atributos (producto_id, atributo_id, valor)
SELECT 
    p.id,
    (SELECT id FROM atributos WHERE nombre = 'Material' LIMIT 1),
    p.filamento
FROM productos p
WHERE p.id > 0
AND p.filamento IS NOT NULL 
AND p.filamento != ''
AND NOT EXISTS (
    SELECT 1 FROM producto_atributos pa 
    WHERE pa.producto_id = p.id 
    AND pa.atributo_id = (SELECT id FROM atributos WHERE nombre = 'Material' LIMIT 1)
);

-- Migrar horas como atributo Tiempo de impresión
INSERT IGNORE INTO producto_atributos (producto_id, atributo_id, valor)
SELECT 
    p.id,
    (SELECT id FROM atributos WHERE nombre = 'Tiempo de impresión' LIMIT 1),
    CAST(p.horas AS CHAR)
FROM productos p
WHERE p.id > 0
AND p.horas IS NOT NULL 
AND p.horas > 0
AND NOT EXISTS (
    SELECT 1 FROM producto_atributos pa 
    WHERE pa.producto_id = p.id 
    AND pa.atributo_id = (SELECT id FROM atributos WHERE nombre = 'Tiempo de impresión' LIMIT 1)
);

-- Migrar gramos como atributo Peso material
INSERT IGNORE INTO producto_atributos (producto_id, atributo_id, valor)
SELECT 
    p.id,
    (SELECT id FROM atributos WHERE nombre = 'Peso material' LIMIT 1),
    CAST(p.gramos AS CHAR)
FROM productos p
WHERE p.id > 0
AND p.gramos IS NOT NULL 
AND p.gramos > 0
AND NOT EXISTS (
    SELECT 1 FROM producto_atributos pa 
    WHERE pa.producto_id = p.id 
    AND pa.atributo_id = (SELECT id FROM atributos WHERE nombre = 'Peso material' LIMIT 1)
);

-- Reactivar safe mode
SET SQL_SAFE_UPDATES = 1;

-- =============================================================================
-- VERIFICACIÓN FINAL
-- =============================================================================

SELECT 'MIGRACIÓN COMPLETADA' as resultado;

-- Verificar productos migrados
SELECT 
    COUNT(*) as total_productos,
    COUNT(categoria_id) as con_categoria,
    COUNT(sku) as con_sku,
    COUNT(slug) as con_slug,
    COUNT(precio_publico) as con_precio_publico,
    AVG(stock_actual) as stock_promedio,
    COUNT(CASE WHEN activo = TRUE THEN 1 END) as productos_activos,
    COUNT(CASE WHEN destacado = TRUE THEN 1 END) as productos_destacados
FROM productos;

-- Verificar atributos migrados
SELECT 
    a.nombre as atributo,
    COUNT(pa.id) as productos_con_atributo
FROM atributos a
LEFT JOIN producto_atributos pa ON a.id = pa.atributo_id
GROUP BY a.id, a.nombre
ORDER BY productos_con_atributo DESC;

-- Mostrar algunos productos de ejemplo
SELECT 
    id, nombre, sku, slug, categoria_id, precio_publico, stock_actual, activo, destacado
FROM productos 
LIMIT 5;

SELECT '✅ PASO 4 COMPLETADO EXITOSAMENTE' as estado;
SELECT '🎯 PRODUCTOS LISTOS CON NUEVAS COLUMNAS Y ATRIBUTOS' as mensaje;
SELECT '🚀 AHORA EJECUTAR: migracion_paso_final_completo.sql' as siguiente;
