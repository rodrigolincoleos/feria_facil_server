-- Script SQL para crear tabla de usuarios con roles
-- Ejecutar en tu base de datos MySQL

-- Crear tabla de usuarios si no existe
CREATE TABLE IF NOT EXISTS usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    picture VARCHAR(500),
    role ENUM('guest', 'user', 'admin', 'webmaster') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Insertar usuario webmaster por defecto (cambia el email por el tuyo)
INSERT IGNORE INTO usuarios (email, name, role) 
VALUES ('tu-email@ejemplo.com', 'Webmaster', 'webmaster');

-- Insertar algunos usuarios de ejemplo (opcional)
INSERT IGNORE INTO usuarios (email, name, role) VALUES 
('admin@5dr3d.com', 'Administrador', 'admin'),
('user@5dr3d.com', 'Usuario Regular', 'user');

-- Verificar que la tabla se creó correctamente
SELECT * FROM usuarios;

-- Mostrar estructura de la tabla
DESCRIBE usuarios;
