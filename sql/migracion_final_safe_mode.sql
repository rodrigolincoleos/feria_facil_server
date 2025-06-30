-- =============================================================================
-- PASO FINAL: LLAVES FORÁNEAS E ÍNDICES - COMPATIBLE CON SAFE MODE
-- =============================================================================
-- Ejecutar SOLO después de verificar que todo funciona correctamente

-- Desactivar safe mode temporalmente
SET SQL_SAFE_UPDATES = 0;

-- =============================================================================
-- VERIFICACIÓN PREVIA
-- =============================================================================

SELECT 'VERIFICACIÓN PREVIA - TABLAS EXISTENTES' as paso;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name IN ('productos', 'categorias', 'marcas', 'atributos', 'producto_atributos', 'producto_resenas');

-- Verificar datos antes de agregar constraints
SELECT 
    'Productos con categoria_id válido' as verificacion,
    COUNT(*) as cantidad
FROM productos p
INNER JOIN categorias c ON p.categoria_id = c.id;

-- =============================================================================
-- AGREGAR LLAVES FORÁNEAS PRINCIPALES (CON VERIFICACIÓN)
-- =============================================================================

-- Llave foránea productos -> categorias
SET @sql = '';
SELECT @sql := CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE productos ADD CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL;'
    ELSE 'SELECT "Constraint fk_productos_categoria ya existe" as info;'
END
FROM information_schema.key_column_usage 
WHERE table_schema = DATABASE() 
AND table_name = 'productos' 
AND constraint_name = 'fk_productos_categoria';

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Llave foránea productos -> marcas
SET @sql = '';
SELECT @sql := CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE productos ADD CONSTRAINT fk_productos_marca FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE SET NULL;'
    ELSE 'SELECT "Constraint fk_productos_marca ya existe" as info;'
END
FROM information_schema.key_column_usage 
WHERE table_schema = DATABASE() 
AND table_name = 'productos' 
AND constraint_name = 'fk_productos_marca';

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Llave foránea productos -> impresoras
SET @sql = '';
SELECT @sql := CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE productos ADD CONSTRAINT fk_productos_impresora FOREIGN KEY (impresora_id) REFERENCES impresoras(id) ON DELETE SET NULL;'
    ELSE 'SELECT "Constraint fk_productos_impresora ya existe" as info;'
END
FROM information_schema.key_column_usage 
WHERE table_schema = DATABASE() 
AND table_name = 'productos' 
AND constraint_name = 'fk_productos_impresora';

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================================================
-- LLAVES FORÁNEAS PARA TABLAS RELACIONADAS
-- =============================================================================

-- Tabla producto_atributos
SET @sql = '';
SELECT @sql := CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE producto_atributos ADD CONSTRAINT fk_producto_atributos_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;'
    ELSE 'SELECT "Constraint fk_producto_atributos_producto ya existe" as info;'
END
FROM information_schema.key_column_usage 
WHERE table_schema = DATABASE() 
AND table_name = 'producto_atributos' 
AND constraint_name = 'fk_producto_atributos_producto';

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = '';
SELECT @sql := CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE producto_atributos ADD CONSTRAINT fk_producto_atributos_atributo FOREIGN KEY (atributo_id) REFERENCES atributos(id) ON DELETE CASCADE;'
    ELSE 'SELECT "Constraint fk_producto_atributos_atributo ya existe" as info;'
END
FROM information_schema.key_column_usage 
WHERE table_schema = DATABASE() 
AND table_name = 'producto_atributos' 
AND constraint_name = 'fk_producto_atributos_atributo';

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tabla producto_resenas
SET @sql = '';
SELECT @sql := CASE 
    WHEN COUNT(*) = 0 THEN 'ALTER TABLE producto_resenas ADD CONSTRAINT fk_producto_resenas_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;'
    ELSE 'SELECT "Constraint fk_producto_resenas_producto ya existe" as info;'
END
FROM information_schema.key_column_usage 
WHERE table_schema = DATABASE() 
AND table_name = 'producto_resenas' 
AND constraint_name = 'fk_producto_resenas_producto';

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================================================
-- AGREGAR ÍNDICES PARA OPTIMIZACIÓN
-- =============================================================================

-- Índices para productos
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_marca ON productos(marca_id);
CREATE INDEX IF NOT EXISTS idx_productos_sku ON productos(sku);
CREATE INDEX IF NOT EXISTS idx_productos_slug ON productos(slug);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_productos_destacado ON productos(destacado);
CREATE INDEX IF NOT EXISTS idx_productos_precio ON productos(precio_publico);
CREATE INDEX IF NOT EXISTS idx_productos_stock ON productos(stock_actual);
CREATE INDEX IF NOT EXISTS idx_productos_nuevo ON productos(nuevo);

-- Índices para categorías
CREATE INDEX IF NOT EXISTS idx_categorias_slug ON categorias(slug);
CREATE INDEX IF NOT EXISTS idx_categorias_activo ON categorias(activo);
CREATE INDEX IF NOT EXISTS idx_categorias_padre ON categorias(padre_id);

-- Índices para marcas
CREATE INDEX IF NOT EXISTS idx_marcas_activo ON marcas(activo);

-- Índices para atributos
CREATE INDEX IF NOT EXISTS idx_atributos_activo ON atributos(activo);
CREATE INDEX IF NOT EXISTS idx_atributos_tipo ON atributos(tipo);

-- =============================================================================
-- CREAR VISTAS ÚTILES
-- =============================================================================

-- Vista completa de productos con toda la información
CREATE OR REPLACE VIEW v_productos_completos AS
SELECT 
    p.id,
    p.nombre,
    p.sku,
    p.descripcion_corta,
    p.precio_publico,
    p.precio_oferta,
    p.stock_actual,
    p.stock_minimo,
    p.imagen,
    p.activo,
    p.destacado,
    p.nuevo,
    p.slug,
    c.nombre AS categoria,
    c.slug AS categoria_slug,
    m.nombre AS marca,
    i.nombre AS impresora,
    p.filamento,
    p.gramos,
    p.horas,
    p.total AS costo_produccion,
    p.created_at,
    p.updated_at
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
LEFT JOIN marcas m ON p.marca_id = m.id
LEFT JOIN impresoras i ON p.impresora_id = i.id;

-- Vista de productos con stock bajo
CREATE OR REPLACE VIEW v_productos_stock_bajo AS
SELECT 
    p.id,
    p.nombre,
    p.sku,
    p.stock_actual,
    p.stock_minimo,
    c.nombre AS categoria,
    CASE 
        WHEN p.stock_actual = 0 THEN 'SIN STOCK'
        WHEN p.stock_actual <= p.stock_minimo THEN 'STOCK CRÍTICO'
        ELSE 'STOCK BAJO'
    END as estado_stock
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
WHERE p.activo = TRUE 
AND (p.stock_actual <= p.stock_minimo OR p.stock_actual = 0)
ORDER BY p.stock_actual ASC;

-- Vista de productos destacados
CREATE OR REPLACE VIEW v_productos_destacados AS
SELECT 
    p.id,
    p.nombre,
    p.sku,
    p.precio_publico,
    p.precio_oferta,
    p.imagen,
    p.slug,
    c.nombre AS categoria,
    m.nombre AS marca
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
LEFT JOIN marcas m ON p.marca_id = m.id
WHERE p.activo = TRUE AND p.destacado = TRUE
ORDER BY p.precio_publico DESC;

-- Vista de atributos por producto
CREATE OR REPLACE VIEW v_productos_atributos AS
SELECT 
    p.id as producto_id,
    p.nombre as producto_nombre,
    a.nombre as atributo_nombre,
    pa.valor as atributo_valor,
    a.unidad as atributo_unidad
FROM productos p
INNER JOIN producto_atributos pa ON p.id = pa.producto_id
INNER JOIN atributos a ON pa.atributo_id = a.id
WHERE p.activo = TRUE
ORDER BY p.id, a.orden;

-- Reactivar safe mode
SET SQL_SAFE_UPDATES = 1;

-- =============================================================================
-- VERIFICACIÓN FINAL COMPLETA
-- =============================================================================

SELECT '✅ MIGRACIÓN COMPLETADA EXITOSAMENTE' as resultado;

-- Resumen de tablas
SELECT 'RESUMEN DE TABLAS' as seccion;
SELECT 
    table_name as tabla,
    table_rows as filas_aprox
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name IN ('productos', 'categorias', 'marcas', 'atributos', 'producto_atributos', 'producto_resenas')
ORDER BY table_name;

-- Verificar constraints creados
SELECT 'CONSTRAINTS CREADOS' as seccion;
SELECT 
    constraint_name as constraint_nombre,
    table_name as tabla,
    column_name as columna,
    referenced_table_name as tabla_referenciada
FROM information_schema.key_column_usage 
WHERE table_schema = DATABASE() 
AND referenced_table_name IS NOT NULL
ORDER BY table_name, constraint_name;

-- Verificar índices creados
SELECT 'ÍNDICES CREADOS' as seccion;
SELECT 
    table_name as tabla,
    index_name as indice,
    column_name as columna
FROM information_schema.statistics 
WHERE table_schema = DATABASE() 
AND table_name IN ('productos', 'categorias', 'marcas', 'atributos')
AND index_name LIKE 'idx_%'
ORDER BY table_name, index_name;

-- Verificar vistas creadas
SELECT 'VISTAS CREADAS' as seccion;
SELECT table_name as vista
FROM information_schema.views 
WHERE table_schema = DATABASE()
ORDER BY table_name;

-- Estadísticas finales de productos
SELECT 'ESTADÍSTICAS FINALES' as seccion;
SELECT 
    COUNT(*) as total_productos,
    COUNT(CASE WHEN activo = TRUE THEN 1 END) as productos_activos,
    COUNT(CASE WHEN destacado = TRUE THEN 1 END) as productos_destacados,
    COUNT(CASE WHEN nuevo = TRUE THEN 1 END) as productos_nuevos,
    COUNT(categoria_id) as con_categoria,
    COUNT(marca_id) as con_marca,
    COUNT(sku) as con_sku,
    COUNT(precio_publico) as con_precio_publico,
    AVG(precio_publico) as precio_promedio,
    AVG(stock_actual) as stock_promedio
FROM productos;

SELECT '🎉 BASE DE DATOS ACTUALIZADA COMPLETAMENTE' as mensaje;
SELECT '🚀 SISTEMA DE TIENDA ONLINE LISTO PARA USAR' as estado;
SELECT '📊 NUEVAS FUNCIONALIDADES: Categorías, Marcas, Atributos, Stock, SEO' as funcionalidades;
