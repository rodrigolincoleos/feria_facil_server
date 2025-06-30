-- =============================================================================
-- DIAGNÓSTICO COMPLETO DE ESTRUCTURA ANTES DE CREAR CONSTRAINTS
-- =============================================================================

SELECT 'DIAGNÓSTICO DE ESTRUCTURA DE TABLAS' as titulo;

-- Verificar estructura completa de productos
SELECT 'ESTRUCTURA TABLA PRODUCTOS' as info;
DESCRIBE productos;

-- Verificar estructura de categorias
SELECT 'ESTRUCTURA TABLA CATEGORIAS' as info;
DESCRIBE categorias;

-- Verificar estructura de marcas
SELECT 'ESTRUCTURA TABLA MARCAS' as info;
DESCRIBE marcas;

-- Verificar estructura de impresoras
SELECT 'ESTRUCTURA TABLA IMPRESORAS' as info;
DESCRIBE impresoras;

-- Verificar tipos de datos específicos para constraints
SELECT 'VERIFICACIÓN DETALLADA DE TIPOS DE DATOS' as info;
SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    is_nullable,
    column_key,
    column_default,
    extra
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND (
    (table_name = 'productos' AND column_name IN ('id', 'categoria_id', 'marca_id', 'impresora_id')) OR
    (table_name = 'categorias' AND column_name = 'id') OR
    (table_name = 'marcas' AND column_name = 'id') OR
    (table_name = 'impresoras' AND column_name = 'id')
)
ORDER BY table_name, column_name;

-- Verificar si las tablas tienen PRIMARY KEY
SELECT 'VERIFICACIÓN DE PRIMARY KEYS' as info;
SELECT 
    table_name,
    column_name,
    constraint_name
FROM information_schema.key_column_usage 
WHERE table_schema = DATABASE() 
AND constraint_name = 'PRIMARY'
AND table_name IN ('productos', 'categorias', 'marcas', 'impresoras')
ORDER BY table_name;

-- Verificar constraints existentes
SELECT 'CONSTRAINTS EXISTENTES' as info;
SELECT 
    constraint_name,
    table_name,
    column_name,
    referenced_table_name,
    referenced_column_name
FROM information_schema.key_column_usage 
WHERE table_schema = DATABASE() 
AND referenced_table_name IS NOT NULL
ORDER BY table_name, constraint_name;

-- Verificar datos en las tablas para entender el problema
SELECT 'MUESTRA DE DATOS - PRODUCTOS' as info;
SELECT 
    id,
    categoria_id,
    marca_id,
    impresora_id,
    nombre
FROM productos 
LIMIT 5;

SELECT 'MUESTRA DE DATOS - CATEGORIAS' as info;
SELECT id, nombre FROM categorias LIMIT 5;

SELECT 'MUESTRA DE DATOS - MARCAS' as info;
SELECT id, nombre FROM marcas LIMIT 5;

SELECT 'MUESTRA DE DATOS - IMPRESORAS' as info;
SELECT id, nombre FROM impresoras LIMIT 5;

-- Verificar motor de almacenamiento
SELECT 'MOTOR DE ALMACENAMIENTO' as info;
SELECT 
    table_name,
    engine
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name IN ('productos', 'categorias', 'marcas', 'impresoras')
ORDER BY table_name;
