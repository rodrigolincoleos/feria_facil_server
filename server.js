import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import dotenv from 'dotenv';
import { checkJwt,  } from './middlewares/checkJwt.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import fs from 'fs';
import ProductosController from './controllers/productosController.js';

// Importar nuevos controllers
import * as productosV2 from './controllers/productosControllerV2.js';
import * as categoriasController from './controllers/categoriasController.js';
import { validarUsuario } from './controllers/usuarioController.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

const app = express();
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs/private.key')),
  cert: fs.readFileSync(path.join(__dirname, 'certs/certificate.crt')),
  ca: fs.readFileSync(path.join(__dirname, 'certs/ca_bundle.crt')) // si tienes este archivo
};

https.createServer(sslOptions, app).listen(443, () => {
  console.log('🔐 Servidor HTTPS corriendo en puerto 443');
});

const redirectApp = express();
redirectApp.use((req, res) => {
  res.redirect(`https://${req.headers.host}${req.url}`);
});
redirectApp.listen(80, () => {
  console.log('🌐 Redireccionando HTTP → HTTPS en puerto 80');
});


app.use('/uploads', express.static('uploads'));
app.use(cors({
  origin: '*',
  credentials: true // solo si usas cookies o tokens en headers
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/.well-known/pki-validation', express.static(path.join(__dirname, 'certs/validation')));


console.log('🛠️ Conectando a base de datos:', process.env.DB_HOST);

export const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

// Inicializar controlador de productos
const productosController = new ProductosController(db);
productosController.configurarRutas(app);

// =============================================================================
// RUTAS HEREDADAS (MANTENER COMPATIBILIDAD)
// =============================================================================

// Crear Producto (Ruta heredada - mantenida para compatibilidad)
app.post('/api/post/productos/', upload.single('imagen'), (req, res) => {
  const {
    nombre, impresora_id, filamento, gramos, horas,
    margen, iva, energia, material, desgaste,
    utilidad, impuesto, total, usuario_id,
    alto, ancho, largo, scale
  } = req.body;

  // Si se subió imagen, guarda el nombre del archivo
  const imagen = req.file ? req.file.filename : null;

  const sql = `
    INSERT INTO productos (
      nombre, imagen, impresora_id, filamento, gramos, horas,
      margen, iva, energia, material, desgaste,
      utilidad, impuesto, total, usuario_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    nombre, imagen, impresora_id, filamento, gramos, horas,
    margen, iva, energia, material, desgaste,
    utilidad, impuesto, total, usuario_id
  ];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: err });

    const productoId = result.insertId;

    const dimSQL = `
      INSERT INTO dimensiones (producto_id, alto, ancho, largo, scale)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(dimSQL, [productoId, alto, ancho, largo, scale], (err2) => {
      if (err2) return res.status(500).json({ error: err2 });

      res.status(200).json({ success: true, id: productoId });
    });
  });
});


// Crear feria
app.post('/api/post/feria', (req, res) => {
  const {
    nombre, fechaDesde, fechaHasta, direccion,
    organizadores, contacto, valor
  } = req.body;

  const sql = `
    INSERT INTO ferias (nombre, fecha_desde, fecha_hasta, direccion, organizadores, contacto, valor)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [nombre, fechaDesde, fechaHasta, direccion, organizadores, contacto, valor];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al crear la feria' });
    res.status(201).json({ message: 'Feria creada correctamente', id: result.insertId });
  });
});

// Obtener datos
app.get('/api/get/impresoras', (_, res) => {
  db.query('SELECT * FROM impresoras', (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.status(200).json(result);
  });
});

app.get('/api/get/ferias', (_, res) => {
  db.query('SELECT * FROM ferias', (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.status(200).json(result);
  });
});

app.get('/api/get/ferias/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM ferias WHERE id = ?';

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al obtener la feria' });
    if (result.length === 0) return res.status(404).json({ error: 'Feria no encontrada' });
    res.status(200).json(result[0]);
  });
});

app.get('/api/get/filamentos', (_, res) => {
  db.query('SELECT * FROM filamentos', (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.status(200).json(result);
  });
});

app.get('/api/get/productos', (_, res) => {
  const query = `
    SELECT 
      productos.id,
      productos.nombre,
      productos.imagen,         -- <--- Agregado aquí
      productos.filamento,
      productos.gramos,
      productos.horas,
      productos.total,
      productos.impresora_id,
      impresoras.nombre AS impresora
    FROM productos
    LEFT JOIN impresoras ON productos.impresora_id = impresoras.id
  `;

  db.query(query, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.status(200).json(result);
  });
});

app.get('/api/get/producto/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
      p.*, i.nombre AS impresora, 
      d.alto, d.ancho, d.largo, d.scale
    FROM productos p
    LEFT JOIN impresoras i ON p.impresora_id = i.id
    LEFT JOIN dimensiones d ON p.id = d.producto_id
    WHERE p.id = ?
  `;

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.status(200).json(result[0]);
  });
});

// Actualizar producto y feria
app.put('/api/put/productos/:id', upload.single('imagen'), (req, res) => {
 
  console.log('req.body:', req.body);

  const id = req.params.id;
  const {
    nombre, impresora_id, filamento, gramos, horas,
    margen, iva, energia, material, desgaste,
    utilidad, impuesto, total, alto, ancho, largo, scale
  } = req.body;

  // Si hay imagen nueva, usa el nombre del archivo subido
  let imagenSql = '';
  let imagenValue = [];
  if (req.file) {
    imagenSql = ', imagen = ?';
    imagenValue = [req.file.filename];
  }

  const sql = `
    UPDATE productos SET
      nombre = ?, impresora_id = ?, filamento = ?, gramos = ?, horas = ?,
      margen = ?, iva = ?, energia = ?, material = ?, desgaste = ?,
      utilidad = ?, impuesto = ?, total = ?
      ${imagenSql}
    WHERE id = ?
  `;

  const values = [
    nombre, impresora_id, filamento, gramos, horas,
    margen, iva, energia, material, desgaste,
    utilidad, impuesto, total,
    ...imagenValue,
    id
  ];

  db.query(sql, values, (err) => {
    if (err) return res.status(500).json({ error: err });

    const sqlDim = `
      INSERT INTO dimensiones (producto_id, alto, ancho, largo, scale)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        alto = VALUES(alto),
        ancho = VALUES(ancho),
        largo = VALUES(largo),
        scale = VALUES(scale)
    `;

    db.query(sqlDim, [id, alto, ancho, largo, scale], (err2) => {
      if (err2) return res.status(500).json({ error: err2 });
      res.status(200).json({ success: true });
    });
  });
});

app.put('/api/put/feria/:id', (req, res) => {
  const id = req.params.id;
  const { nombre, fechaDesde, fechaHasta, direccion, organizadores, contacto, valor } = req.body;

  const sql = `
    UPDATE ferias SET
      nombre = ?, fecha_desde = ?, fecha_hasta = ?, direccion = ?,
      organizadores = ?, contacto = ?, valor = ?
    WHERE id = ?
  `;
  const values = [nombre, fechaDesde, fechaHasta, direccion, organizadores, contacto, valor, id];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al actualizar feria' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Feria no encontrada' });
    res.status(200).json({ message: '✅ Feria actualizada correctamente' });
  });
});

// Eliminar producto
app.delete('/api/del/productos/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM productos WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.status(200).json({ success: true });
  });
});

// Guardar productos en inventario de feria
app.post('/api/post/inventario_feria', (req, res) => {
  const { feria_id, productos } = req.body;

  if (!feria_id || !Array.isArray(productos)) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  // Paso 1: eliminar todos los productos actuales de esa feria
  const deleteQuery = 'DELETE FROM feria_productos WHERE feria_id = ?';

  db.query(deleteQuery, [feria_id], (err) => {
    if (err) {
      console.error('❌ Error al eliminar productos previos:', err);
      return res.status(500).json({ error: 'Error al limpiar inventario previo' });
    }

    // Paso 2: insertar los nuevos productos
    const insertQuery = `
      INSERT INTO feria_productos (feria_id, producto_id, cantidad)
      VALUES (?, ?, ?)
    `;

    productos.forEach(p => {
      db.query(insertQuery, [feria_id, p.producto_id, p.cantidad], (err2) => {
        if (err2) console.error('❌ Error al insertar producto:', err2);
      });
    });

    res.status(200).json({ mensaje: 'Inventario actualizado correctamente' });
  });
});


// Obtener productos de una feria
app.get('/api/get/ferias/:id/productos', (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      fp.producto_id AS id,
      p.nombre,
      fp.cantidad AS stock_inicial,
      IFNULL(SUM(vf.cantidad), 0) AS vendidos,
      fp.cantidad - IFNULL(SUM(vf.cantidad), 0) AS stock_actual,
      p.total,
      (fp.cantidad - IFNULL(SUM(vf.cantidad), 0)) * p.total AS totalLinea
    FROM feria_productos fp
    JOIN productos p ON fp.producto_id = p.id
    LEFT JOIN ventas_feria vf ON fp.feria_id = vf.feria_id AND fp.producto_id = vf.producto_id
    WHERE fp.feria_id = ?
    GROUP BY fp.producto_id, fp.cantidad, p.nombre, p.total
  `;

  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('❌ Error al obtener productos de la feria:', err);
      return res.status(500).json({ error: 'Error al obtener productos de la feria' });
    }

    res.status(200).json(result);
  });
});


// Validar email de usuario (ruta pública)
app.get('/api/usuario/validar', (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ autorizado: false, mensaje: 'Email es requerido' });
  }

  console.log('🔍 Validando email:', email);

  const sql = 'SELECT * FROM usuarios_autorizados WHERE email = ?';

  db.query(sql, [email], (err, result) => {
    if (err) {
      console.error('❌ Error en la consulta SQL:', err);
      return res.status(500).json({ autorizado: false, mensaje: 'Error interno del servidor' });
    }

    if (result.length === 0) {
      console.info(`🔒 Email no autorizado: ${email}`);
      return res.status(403).json({ autorizado: false, mensaje: 'Usuario no autorizado' });
    }

    console.log(`✅ Usuario autorizado: ${email}`);
    return res.status(200).json({ autorizado: true });
  });
});


// Eliminar feria
app.delete('/api/del/ferias/:id', (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM ferias WHERE id = ?';

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al eliminar feria' });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Feria no encontrada' });
    }

    res.status(200).json({ message: '✅ Feria eliminada correctamente' });
  });
});


app.get('/api/privado', checkJwt, (req, res) => {
  try {
    res.json({ mensaje: 'Acceso permitido a ruta protegida' });
  } catch (err) {
    console.error('❌ Error interno en /api/privado:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/post/ventas_feria', (req, res) => {
  const { feria_id, ventas } = req.body;

  if (!feria_id || !Array.isArray(ventas)) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  const sql = `
    INSERT INTO ventas_feria (feria_id, producto_id, cantidad, medio_pago)
    VALUES (?, ?, ?, ?)
  `;

  ventas.forEach(venta => {
    const { producto_id, cantidad, medio_pago } = venta;
    db.query(sql, [feria_id, producto_id, cantidad, medio_pago], (err) => {
      if (err) console.error('❌ Error al registrar venta:', err);
    });
  });

  res.status(200).json({ mensaje: '✅ Ventas registradas' });
});

// Obtener perfil de usuario
app.get('/api/usuario/profile', checkJwt, (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email es requerido' });
  }

  const sql = `
    SELECT u.*, ua.email as auth_email 
    FROM usuarios u 
    LEFT JOIN usuarios_autorizados ua ON u.email = ua.email 
    WHERE u.email = ?
  `;

  db.query(sql, [email], (err, result) => {
    if (err) {
      console.error('❌ Error al obtener perfil:', err);
      return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }

    if (result.length === 0) {
      // Usuario no existe, crear con rol por defecto
      const insertSql = `
        INSERT INTO usuarios (email, name, role, created_at) 
        VALUES (?, ?, 'user', NOW())
      `;
      
      db.query(insertSql, [email, email.split('@')[0]], (insertErr, insertResult) => {
        if (insertErr) {
          console.error('❌ Error al crear usuario:', insertErr);
          return res.status(500).json({ success: false, message: 'Error al crear usuario' });
        }

        return res.json({
          success: true,
          user: {
            id: insertResult.insertId,
            email: email,
            name: email.split('@')[0],
            role: 'user',
            created_at: new Date()
          }
        });
      });
    } else {
      return res.json({ success: true, user: result[0] });
    }
  });
});

// Listar todos los usuarios (solo webmaster)
app.get('/api/usuario/list', checkJwt, (req, res) => {
  const sql = `
    SELECT id, email, name, role, picture, created_at, last_login
    FROM usuarios 
    ORDER BY created_at DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error('❌ Error al listar usuarios:', err);
      return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }

    return res.json({ success: true, users: result });
  });
});

// Actualizar rol de usuario (solo webmaster)
app.put('/api/usuario/update-role', checkJwt, (req, res) => {
  const { userId, email, role } = req.body;

  if (!userId && !email) {
    return res.status(400).json({ success: false, message: 'ID o email de usuario es requerido' });
  }

  if (!role) {
    return res.status(400).json({ success: false, message: 'Rol es requerido' });
  }

  // Validar que el rol sea válido
  const validRoles = ['user', 'admin', 'webmaster'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: 'Rol inválido' });
  }

  const sql = userId 
    ? 'UPDATE usuarios SET role = ?, updated_at = NOW() WHERE id = ?'
    : 'UPDATE usuarios SET role = ?, updated_at = NOW() WHERE email = ?';
  
  const param = userId || email;

  db.query(sql, [role, param], (err, result) => {
    if (err) {
      console.error('❌ Error al actualizar rol:', err);
      return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    console.log(`✅ Rol actualizado: ${email || userId} → ${role}`);
    return res.json({ success: true, message: 'Rol actualizado correctamente' });
  });
});

// Actualizar último login
app.post('/api/usuario/last-login', checkJwt, (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email es requerido' });
  }

  const sql = 'UPDATE usuarios SET last_login = NOW() WHERE email = ?';
  db.query(sql, [email], (err, result) => {
    if (err) {
      console.error('❌ Error al actualizar último login:', err);
      return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }

    return res.json({ success: true });
  });
});

// =============================================================================
// NUEVAS RUTAS V2 - SISTEMA ACTUALIZADO
// =============================================================================

// RUTAS DE PRODUCTOS V2
app.get('/api/v2/productos', productosV2.obtenerProductos);
app.get('/api/v2/productos/:id', productosV2.obtenerProductoPorId);
app.post('/api/v2/productos', upload.single('imagen'), productosV2.crearProducto);
app.put('/api/v2/productos/:id', productosV2.actualizarProducto);
app.delete('/api/v2/productos/:id', productosV2.eliminarProducto);

// RUTAS DE PRODUCTOS ESPECIALES
app.get('/api/v2/productos/destacados', productosV2.obtenerProductosDestacados);
app.get('/api/v2/productos/stock-bajo', productosV2.obtenerProductosStockBajo);

// RUTAS DE CATEGORÍAS
app.get('/api/v2/categorias', categoriasController.obtenerCategorias);
app.post('/api/v2/categorias', categoriasController.crearCategoria);
app.put('/api/v2/categorias/:id', categoriasController.actualizarCategoria);
app.delete('/api/v2/categorias/:id', categoriasController.eliminarCategoria);

// RUTAS DE MARCAS
app.get('/api/v2/marcas', categoriasController.obtenerMarcas);
app.post('/api/v2/marcas', categoriasController.crearMarca);
app.put('/api/v2/marcas/:id', categoriasController.actualizarMarca);
app.delete('/api/v2/marcas/:id', categoriasController.eliminarMarca);

// RUTAS DE APOYO
app.get('/api/v2/atributos', productosV2.obtenerAtributos);

// RUTA DE VALIDACIÓN DE USUARIO (actualizada)
app.get('/api/v2/usuario/validar', validarUsuario);

console.log('🚀 Rutas V2 configuradas:');
console.log('📦 /api/v2/productos - CRUD completo');
console.log('🏷️  /api/v2/categorias - Gestión de categorías');
console.log('🏭 /api/v2/marcas - Gestión de marcas');
console.log('⚡ /api/v2/atributos - Atributos flexibles');
