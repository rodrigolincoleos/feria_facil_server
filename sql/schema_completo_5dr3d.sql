-- =============================================================================
-- SCHEMA COMPLETO DE BASE DE DATOS 5DR3D
-- =============================================================================
-- Generado después de la migración exitosa
-- Incluye todas las tablas, índices, constraints y vistas
-- Base de datos para sistema de tienda online de productos 3D

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';

-- =============================================================================
-- CREAR BASE DE DATOS
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS `5dr3d` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `5dr3d`;

-- =============================================================================
-- TABLA: usuarios
-- =============================================================================

CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `rol` ENUM('admin', 'usuario', 'vendedor') DEFAULT 'usuario',
  `activo` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_usuarios_email` (`email`),
  INDEX `idx_usuarios_rol` (`rol`),
  INDEX `idx_usuarios_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- TABLA: categorias
-- =============================================================================

CREATE TABLE IF NOT EXISTS `categorias` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL UNIQUE,
  `descripcion` TEXT,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `padre_id` INT DEFAULT NULL,
  `activo` BOOLEAN DEFAULT TRUE,
  `orden` INT DEFAULT 0,
  `imagen` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_categorias_slug` (`slug`),
  INDEX `idx_categorias_activo` (`activo`),
  INDEX `idx_categorias_padre` (`padre_id`),
  FOREIGN KEY (`padre_id`) REFERENCES `categorias` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- TABLA: marcas
-- =============================================================================

CREATE TABLE IF NOT EXISTS `marcas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL UNIQUE,
  `descripcion` TEXT,
  `logo` VARCHAR(255),
  `activo` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_marcas_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- TABLA: impresoras
-- =============================================================================

CREATE TABLE IF NOT EXISTS `impresoras` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `marca` VARCHAR(100),
  `modelo` VARCHAR(100),
  `especificaciones` TEXT,
  `activo` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_impresoras_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- TABLA: dimensiones
-- =============================================================================

CREATE TABLE IF NOT EXISTS `dimensiones` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `largo` DECIMAL(8,2),
  `ancho` DECIMAL(8,2),
  `alto` DECIMAL(8,2),
  `unidad` VARCHAR(10) DEFAULT 'cm',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- TABLA: filamentos
-- =============================================================================

CREATE TABLE IF NOT EXISTS `filamentos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `tipo` VARCHAR(50) NOT NULL,
  `color` VARCHAR(50),
  `precio_kg` DECIMAL(8,2),
  `stock_kg` DECIMAL(8,2) DEFAULT 0,
  `proveedor` VARCHAR(100),
  `activo` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_filamentos_tipo` (`tipo`),
  INDEX `idx_filamentos_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- TABLA: atributos
-- =============================================================================

CREATE TABLE IF NOT EXISTS `atributos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `tipo` ENUM('texto', 'numero', 'booleano', 'seleccion', 'multiple') NOT NULL,
  `opciones` JSON DEFAULT NULL,
  `unidad` VARCHAR(20) DEFAULT NULL,
  `obligatorio` BOOLEAN DEFAULT FALSE,
  `activo` BOOLEAN DEFAULT TRUE,
  `orden` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_atributos_activo` (`activo`),
  INDEX `idx_atributos_tipo` (`tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- TABLA: productos (TABLA PRINCIPAL MIGRADA)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `productos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  
  -- Información básica (original)
  `nombre` VARCHAR(200) NOT NULL,
  `imagen` VARCHAR(255),
  `filamento` VARCHAR(100),
  `gramos` DECIMAL(8,2),
  `horas` DECIMAL(8,2),
  `total` DECIMAL(10,2),
  `impresora_id` INT,
  
  -- Nuevas columnas de categorización
  `categoria_id` INT DEFAULT NULL,
  `marca_id` INT DEFAULT NULL,
  `sku` VARCHAR(50) UNIQUE,
  
  -- Información comercial
  `descripcion_corta` TEXT,
  `descripcion_larga` TEXT,
  `precio_publico` DECIMAL(10,2) DEFAULT NULL,
  `precio_oferta` DECIMAL(10,2) DEFAULT NULL,
  
  -- Inventario
  `stock_actual` INT DEFAULT 0,
  `stock_minimo` INT DEFAULT 0,
  `peso` DECIMAL(8,3) DEFAULT NULL,
  
  -- Estados y características
  `activo` BOOLEAN DEFAULT TRUE,
  `destacado` BOOLEAN DEFAULT FALSE,
  `nuevo` BOOLEAN DEFAULT FALSE,
  
  -- SEO y metadatos
  `slug` VARCHAR(255) UNIQUE,
  `tags` JSON DEFAULT NULL,
  `galeria_imagenes` JSON DEFAULT NULL,
  
  -- Fechas
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  
  -- Índices para optimización
  INDEX `idx_productos_categoria` (`categoria_id`),
  INDEX `idx_productos_marca` (`marca_id`),
  INDEX `idx_productos_impresora` (`impresora_id`),
  INDEX `idx_productos_sku` (`sku`),
  INDEX `idx_productos_slug` (`slug`),
  INDEX `idx_productos_activo` (`activo`),
  INDEX `idx_productos_destacado` (`destacado`),
  INDEX `idx_productos_precio` (`precio_publico`),
  INDEX `idx_productos_stock` (`stock_actual`),
  INDEX `idx_productos_nuevo` (`nuevo`),
  
  -- Llaves foráneas
  FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`marca_id`) REFERENCES `marcas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`impresora_id`) REFERENCES `impresoras` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- TABLA: producto_atributos
-- =============================================================================

CREATE TABLE IF NOT EXISTS `producto_atributos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `producto_id` INT NOT NULL,
  `atributo_id` INT NOT NULL,
  `valor` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_producto_atributo` (`producto_id`, `atributo_id`),
  INDEX `idx_producto_atributos_producto` (`producto_id`),
  INDEX `idx_producto_atributos_atributo` (`atributo_id`),
  FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`atributo_id`) REFERENCES `atributos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- TABLA: producto_resenas
-- =============================================================================

CREATE TABLE IF NOT EXISTS `producto_resenas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `producto_id` INT NOT NULL,
  `usuario_id` INT DEFAULT NULL,
  `nombre_cliente` VARCHAR(100) NOT NULL,
  `calificacion` INT NOT NULL CHECK (`calificacion` >= 1 AND `calificacion` <= 5),
  `comentario` TEXT,
  `aprobado` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_resenas_producto` (`producto_id`),
  INDEX `idx_resenas_aprobado` (`aprobado`),
  INDEX `idx_resenas_usuario` (`usuario_id`),
  FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- TABLA: ferias
-- =============================================================================

CREATE TABLE IF NOT EXISTS `ferias` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(200) NOT NULL,
  `fecha_inicio` DATE,
  `fecha_fin` DATE,
  `ubicacion` VARCHAR(255),
  `descripcion` TEXT,
  `activo` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_ferias_activo` (`activo`),
  INDEX `idx_ferias_fechas` (`fecha_inicio`, `fecha_fin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- TABLA: feria_productos
-- =============================================================================

CREATE TABLE IF NOT EXISTS `feria_productos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `feria_id` INT NOT NULL,
  `producto_id` INT NOT NULL,
  `cantidad` INT DEFAULT 1,
  `precio_feria` DECIMAL(10,2),
  `vendido` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_feria_productos_feria` (`feria_id`),
  INDEX `idx_feria_productos_producto` (`producto_id`),
  INDEX `idx_feria_productos_vendido` (`vendido`),
  FOREIGN KEY (`feria_id`) REFERENCES `ferias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- TABLA: ventas_feria
-- =============================================================================

CREATE TABLE IF NOT EXISTS `ventas_feria` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `feria_id` INT NOT NULL,
  `producto_id` INT NOT NULL,
  `cantidad_vendida` INT NOT NULL,
  `precio_unitario` DECIMAL(10,2) NOT NULL,
  `total_venta` DECIMAL(10,2) NOT NULL,
  `fecha_venta` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `metodo_pago` VARCHAR(50),
  `notas` TEXT,
  PRIMARY KEY (`id`),
  INDEX `idx_ventas_feria_feria` (`feria_id`),
  INDEX `idx_ventas_feria_producto` (`producto_id`),
  INDEX `idx_ventas_feria_fecha` (`fecha_venta`),
  FOREIGN KEY (`feria_id`) REFERENCES `ferias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- TABLA: bitacora_actividad
-- =============================================================================

CREATE TABLE IF NOT EXISTS `bitacora_actividad` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `usuario_id` INT,
  `accion` VARCHAR(100) NOT NULL,
  `tabla_afectada` VARCHAR(50),
  `registro_id` INT,
  `datos_anteriores` JSON,
  `datos_nuevos` JSON,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_bitacora_usuario` (`usuario_id`),
  INDEX `idx_bitacora_accion` (`accion`),
  INDEX `idx_bitacora_tabla` (`tabla_afectada`),
  INDEX `idx_bitacora_fecha` (`created_at`),
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- VISTAS ÚTILES
-- =============================================================================

-- Vista completa de productos con toda la información
CREATE OR REPLACE VIEW `v_productos_completos` AS
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
CREATE OR REPLACE VIEW `v_productos_stock_bajo` AS
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
CREATE OR REPLACE VIEW `v_productos_destacados` AS
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
CREATE OR REPLACE VIEW `v_productos_atributos` AS
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

-- Vista de ventas por feria
CREATE OR REPLACE VIEW `v_ventas_por_feria` AS
SELECT 
    f.id as feria_id,
    f.nombre as feria_nombre,
    f.fecha_inicio,
    f.fecha_fin,
    COUNT(vf.id) as total_ventas,
    SUM(vf.cantidad_vendida) as productos_vendidos,
    SUM(vf.total_venta) as ingresos_totales,
    AVG(vf.precio_unitario) as precio_promedio
FROM ferias f
LEFT JOIN ventas_feria vf ON f.id = vf.feria_id
GROUP BY f.id, f.nombre, f.fecha_inicio, f.fecha_fin
ORDER BY f.fecha_inicio DESC;

-- =============================================================================
-- DATOS INICIALES
-- =============================================================================

-- Insertar categorías base
INSERT IGNORE INTO `categorias` (`nombre`, `descripcion`, `slug`, `orden`) VALUES
('Productos 3D', 'Productos creados con impresión 3D', 'productos-3d', 1),
('Decoración', 'Objetos decorativos', 'decoracion', 2),
('Funcional', 'Objetos de uso práctico', 'funcional', 3),
('Juguetes', 'Juguetes y figuras', 'juguetes', 4),
('Repuestos', 'Piezas de repuesto', 'repuestos', 5);

-- Insertar marcas base
INSERT IGNORE INTO `marcas` (`nombre`, `descripcion`) VALUES
('Filamento Estándar', 'Marca genérica para filamentos estándar'),
('Premium 3D', 'Filamentos de alta calidad'),
('Eco Friendly', 'Filamentos ecológicos');

-- Insertar atributos base
INSERT IGNORE INTO `atributos` (`nombre`, `tipo`, `unidad`, `obligatorio`, `orden`, `opciones`) VALUES
('Material', 'seleccion', NULL, TRUE, 1, JSON_ARRAY('PLA', 'ABS', 'PETG', 'TPU', 'PLA+', 'ASA', 'Wood', 'Metal')),
('Color', 'seleccion', NULL, FALSE, 2, JSON_ARRAY('Blanco', 'Negro', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Natural', 'Transparente')),
('Tiempo de impresión', 'numero', 'horas', FALSE, 3, NULL),
('Peso material', 'numero', 'gramos', FALSE, 4, NULL),
('Dificultad', 'seleccion', NULL, FALSE, 5, JSON_ARRAY('Fácil', 'Intermedio', 'Difícil', 'Experto'));

-- =============================================================================
-- RESTAURAR CONFIGURACIÓN
-- =============================================================================

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;

-- =============================================================================
-- INFORMACIÓN DEL SCHEMA
-- =============================================================================

SELECT '🎉 SCHEMA 5DR3D CREADO EXITOSAMENTE' as resultado;
SELECT '📊 INCLUYE: 12 tablas + 5 vistas + índices + constraints' as contenido;
SELECT '🚀 SISTEMA DE TIENDA ONLINE COMPLETO Y OPTIMIZADO' as funcionalidad;
