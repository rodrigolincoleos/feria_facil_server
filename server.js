import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import dotenv from 'dotenv';
import { checkJwt,  } from './middlewares/checkJwt.js';
dotenv.config();

const app = express();
app.use(cors({
  origin: '*',
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
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
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


// Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
