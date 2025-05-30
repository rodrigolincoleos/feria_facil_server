import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import dotenv from 'dotenv';
import { checkJwt,  } from './middlewares/checkJwt.js';
dotenv.config();

const app = express();
app.use(cors({
  origin: 'https://cincodadosrojos3d.cl',
  credentials: true // solo si usas cookies o tokens en headers
}));
app.use(express.json());

console.log('🛠️ Conectando a base de datos:', process.env.DB_HOST);

export const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Crear Producto
app.post('/api/post/productos/', (req, res) => {
  const {
    nombre, impresora_id, filamento, gramos, horas,
    margen, iva, energia, material, desgaste,
    utilidad, impuesto, total, usuario_id,
    alto, ancho, largo, scale
  } = req.body;

  const sql = `
    INSERT INTO productos (
      nombre, impresora_id, filamento, gramos, horas,
      margen, iva, energia, material, desgaste,
      utilidad, impuesto, total, usuario_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    nombre, impresora_id, filamento, gramos, horas,
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
app.put('/api/put/productos/:id', (req, res) => {
  const id = req.params.id;
  const {
    nombre, impresora_id, filamento, gramos, horas,
    margen, iva, energia, material, desgaste,
    utilidad, impuesto, total, alto, ancho, largo, scale
  } = req.body;

  const sql = `
    UPDATE productos SET
      nombre = ?, impresora_id = ?, filamento = ?, gramos = ?, horas = ?,
      margen = ?, iva = ?, energia = ?, material = ?, desgaste = ?,
      utilidad = ?, impuesto = ?, total = ?
    WHERE id = ?
  `;

  const values = [
    nombre, impresora_id, filamento, gramos, horas,
    margen, iva, energia, material, desgaste,
    utilidad, impuesto, total, id
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

  const insertQuery = `
    INSERT INTO feria_productos (feria_id, producto_id, cantidad)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad)
  `;

  productos.forEach(p => {
    db.query(insertQuery, [feria_id, p.producto_id, p.cantidad], (err) => {
      if (err) console.error('❌ Error al insertar producto:', err);
    });
  });

  res.status(200).json({ mensaje: 'Inventario guardado correctamente' });
});

// Obtener productos de una feria
app.get('/api/get/ferias/:id/productos', (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT producto_id AS id, cantidad
    FROM feria_productos
    WHERE feria_id = ?
  `;

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al consultar la feria' });
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




app.get('/api/privado', checkJwt, (req, res) => {
  try {
    res.json({ mensaje: 'Acceso permitido a ruta protegida' });
  } catch (err) {
    console.error('❌ Error interno en /api/privado:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
// Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
