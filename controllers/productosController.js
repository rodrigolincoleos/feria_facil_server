import express from 'express';
import multer from 'multer';
import path from 'path';

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

class ProductosController {
  constructor(db) {
    this.db = db;
  }

  // =============================================================================
  // PRODUCTOS CRUD
  // =============================================================================

  // Obtener todos los productos con filtros avanzados
  obtenerProductos(req, res) {
    const {
      categoria_id,
      marca_id,
      activo = true,
      destacado,
      nuevo,
      precio_min,
      precio_max,
      buscar,
      orden = 'created_at',
      direccion = 'DESC',
      pagina = 1,
      limite = 20
    } = req.query;

    let sql = `
      SELECT 
        p.*,
        c.nombre AS categoria,
        c.slug AS categoria_slug,
        m.nombre AS marca,
        i.nombre AS impresora,
        COALESCE(AVG(pr.calificacion), 0) AS calificacion_promedio,
        COUNT(pr.id) AS total_resenas
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN marcas m ON p.marca_id = m.id
      LEFT JOIN impresoras i ON p.impresora_id = i.id
      LEFT JOIN producto_resenas pr ON p.id = pr.producto_id AND pr.aprobado = TRUE
      WHERE 1=1
    `;

    const params = [];

    // Filtros
    if (activo !== undefined) {
      sql += ' AND p.activo = ?';
      params.push(activo === 'true' || activo === true);
    }

    if (categoria_id) {
      sql += ' AND p.categoria_id = ?';
      params.push(categoria_id);
    }

    if (marca_id) {
      sql += ' AND p.marca_id = ?';
      params.push(marca_id);
    }

    if (destacado !== undefined) {
      sql += ' AND p.destacado = ?';
      params.push(destacado === 'true' || destacado === true);
    }

    if (nuevo !== undefined) {
      sql += ' AND p.nuevo = ?';
      params.push(nuevo === 'true' || nuevo === true);
    }

    if (precio_min) {
      sql += ' AND p.precio_publico >= ?';
      params.push(precio_min);
    }

    if (precio_max) {
      sql += ' AND p.precio_publico <= ?';
      params.push(precio_max);
    }

    if (buscar) {
      sql += ' AND (p.nombre LIKE ? OR p.descripcion_corta LIKE ? OR p.descripcion_larga LIKE ? OR p.sku LIKE ?)';
      const searchTerm = `%${buscar}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ' GROUP BY p.id';

    // Ordenamiento
    const ordenesPermitidos = ['nombre', 'precio_publico', 'created_at', 'stock_actual', 'calificacion_promedio'];
    const direccionesPermitidas = ['ASC', 'DESC'];
    
    if (ordenesPermitidos.includes(orden) && direccionesPermitidas.includes(direccion.toUpperCase())) {
      if (orden === 'calificacion_promedio') {
        sql += ` ORDER BY calificacion_promedio ${direccion.toUpperCase()}`;
      } else {
        sql += ` ORDER BY p.${orden} ${direccion.toUpperCase()}`;
      }
    } else {
      sql += ' ORDER BY p.created_at DESC';
    }

    // Paginación
    const offset = (parseInt(pagina) - 1) * parseInt(limite);
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limite), offset);

    this.db.query(sql, params, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      // Obtener total de productos para paginación
      let countSql = `
        SELECT COUNT(DISTINCT p.id) as total
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN marcas m ON p.marca_id = m.id
        WHERE 1=1
      `;

      const countParams = params.slice(0, -2); // Remover LIMIT y OFFSET

      this.db.query(countSql, countParams, (countErr, countResult) => {
        if (countErr) return res.status(500).json({ error: countErr.message });

        const total = countResult[0].total;
        const totalPaginas = Math.ceil(total / parseInt(limite));

        res.json({
          productos: result,
          paginacion: {
            pagina_actual: parseInt(pagina),
            total_paginas: totalPaginas,
            total_productos: total,
            productos_por_pagina: parseInt(limite)
          }
        });
      });
    });
  }

  // Obtener producto por ID o slug
  obtenerProducto(req, res) {
    const { id } = req.params;
    const esSlug = isNaN(id);

    const sql = `
      SELECT 
        p.*,
        c.nombre AS categoria,
        c.slug AS categoria_slug,
        m.nombre AS marca,
        i.nombre AS impresora,
        d.alto, d.ancho, d.largo, d.scale,
        COALESCE(AVG(pr.calificacion), 0) AS calificacion_promedio,
        COUNT(pr.id) AS total_resenas
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN marcas m ON p.marca_id = m.id
      LEFT JOIN impresoras i ON p.impresora_id = i.id
      LEFT JOIN dimensiones d ON p.id = d.producto_id
      LEFT JOIN producto_resenas pr ON p.id = pr.producto_id AND pr.aprobado = TRUE
      WHERE ${esSlug ? 'p.slug' : 'p.id'} = ?
      GROUP BY p.id
    `;

    this.db.query(sql, [id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

      const producto = result[0];

      // Obtener atributos del producto
      const atributosSql = `
        SELECT a.nombre, a.tipo, a.unidad, pa.valor
        FROM producto_atributos pa
        JOIN atributos a ON pa.atributo_id = a.id
        WHERE pa.producto_id = ?
        ORDER BY a.orden
      `;

      this.db.query(atributosSql, [producto.id], (attrErr, atributos) => {
        if (attrErr) return res.status(500).json({ error: attrErr.message });

        producto.atributos = atributos;
        res.json(producto);
      });
    });
  }

  // Crear producto
  crearProducto(req, res) {
    const {
      nombre, categoria_id, marca_id, sku, descripcion_corta, descripcion_larga,
      precio_publico, precio_oferta, stock_actual, stock_minimo, peso,
      destacado, nuevo, tags, impresora_id, filamento, gramos, horas,
      margen, iva, energia, material, desgaste, utilidad, impuesto, total,
      usuario_id, alto, ancho, largo, scale, atributos
    } = req.body;

    const imagen = req.file ? req.file.filename : null;

    // Generar slug si no se proporciona
    const slug = nombre.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');

    const sql = `
      INSERT INTO productos (
        nombre, categoria_id, marca_id, sku, descripcion_corta, descripcion_larga,
        precio_publico, precio_oferta, stock_actual, stock_minimo, peso,
        imagen, destacado, nuevo, tags, slug, impresora_id, filamento, gramos, horas,
        margen, iva, energia, material, desgaste, utilidad, impuesto, total, usuario_id,
        activo, fecha_publicacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      nombre, categoria_id, marca_id, sku, descripcion_corta, descripcion_larga,
      precio_publico, precio_oferta, stock_actual || 0, stock_minimo || 0, peso,
      imagen, destacado || false, nuevo || false, tags ? JSON.stringify(tags) : null, 
      slug, impresora_id, filamento, gramos, horas, margen, iva, energia, material, 
      desgaste, utilidad, impuesto, total, usuario_id, true, new Date()
    ];

    this.db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error creando producto:', err);
        return res.status(500).json({ error: err.message });
      }

      const productoId = result.insertId;

      // Insertar dimensiones si se proporcionan
      if (alto || ancho || largo || scale) {
        const dimSQL = `
          INSERT INTO dimensiones (producto_id, alto, ancho, largo, scale)
          VALUES (?, ?, ?, ?, ?)
        `;
        this.db.query(dimSQL, [productoId, alto, ancho, largo, scale], (dimErr) => {
          if (dimErr) console.error('Error insertando dimensiones:', dimErr);
        });
      }

      // Insertar atributos si se proporcionan
      if (atributos && Array.isArray(atributos)) {
        atributos.forEach(attr => {
          const attrSQL = `
            INSERT INTO producto_atributos (producto_id, atributo_id, valor)
            VALUES (?, ?, ?)
          `;
          this.db.query(attrSQL, [productoId, attr.atributo_id, attr.valor], (attrErr) => {
            if (attrErr) console.error('Error insertando atributo:', attrErr);
          });
        });
      }

      res.status(201).json({ 
        success: true, 
        id: productoId,
        mensaje: 'Producto creado exitosamente'
      });
    });
  }

  // Actualizar producto
  actualizarProducto(req, res) {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    if (req.file) {
      updateData.imagen = req.file.filename;
    }

    // Construir query dinámicamente
    const campos = Object.keys(updateData).filter(key => key !== 'atributos');
    const valores = campos.map(campo => updateData[campo]);
    
    if (campos.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    const sql = `UPDATE productos SET ${campos.map(campo => `${campo} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    valores.push(id);

    this.db.query(sql, valores, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado' });

      // Actualizar atributos si se proporcionan
      if (updateData.atributos && Array.isArray(updateData.atributos)) {
        // Eliminar atributos existentes
        this.db.query('DELETE FROM producto_atributos WHERE producto_id = ?', [id], (delErr) => {
          if (delErr) console.error('Error eliminando atributos:', delErr);

          // Insertar nuevos atributos
          updateData.atributos.forEach(attr => {
            const attrSQL = `
              INSERT INTO producto_atributos (producto_id, atributo_id, valor)
              VALUES (?, ?, ?)
            `;
            this.db.query(attrSQL, [id, attr.atributo_id, attr.valor], (attrErr) => {
              if (attrErr) console.error('Error insertando atributo:', attrErr);
            });
          });
        });
      }

      res.json({ success: true, mensaje: 'Producto actualizado exitosamente' });
    });
  }

  // Eliminar producto
  eliminarProducto(req, res) {
    const { id } = req.params;

    this.db.query('DELETE FROM productos WHERE id = ?', [id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado' });

      res.json({ success: true, mensaje: 'Producto eliminado exitosamente' });
    });
  }

  // =============================================================================
  // CATEGORÍAS
  // =============================================================================

  obtenerCategorias(req, res) {
    const sql = `
      SELECT 
        c.*,
        cp.nombre AS padre,
        COUNT(p.id) AS total_productos
      FROM categorias c
      LEFT JOIN categorias cp ON c.padre_id = cp.id
      LEFT JOIN productos p ON c.id = p.categoria_id AND p.activo = TRUE
      WHERE c.activo = TRUE
      GROUP BY c.id
      ORDER BY c.orden, c.nombre
    `;

    this.db.query(sql, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(result);
    });
  }

  // =============================================================================
  // MARCAS
  // =============================================================================

  obtenerMarcas(req, res) {
    const sql = `
      SELECT 
        m.*,
        COUNT(p.id) AS total_productos
      FROM marcas m
      LEFT JOIN productos p ON m.id = p.marca_id AND p.activo = TRUE
      WHERE m.activo = TRUE
      GROUP BY m.id
      ORDER BY m.nombre
    `;

    this.db.query(sql, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(result);
    });
  }

  // =============================================================================
  // ATRIBUTOS
  // =============================================================================

  obtenerAtributos(req, res) {
    const sql = `
      SELECT * FROM atributos 
      WHERE activo = TRUE 
      ORDER BY orden, nombre
    `;

    this.db.query(sql, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(result);
    });
  }

  // =============================================================================
  // PRODUCTOS RELACIONADOS
  // =============================================================================

  obtenerProductosRelacionados(req, res) {
    const { id } = req.params;
    const { limite = 6 } = req.query;

    this.db.query('CALL sp_productos_relacionados(?, ?)', [id, limite], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(result[0]);
    });
  }

  // =============================================================================
  // RESEÑAS
  // =============================================================================

  obtenerResenas(req, res) {
    const { id } = req.params;
    const { pagina = 1, limite = 10 } = req.query;

    const sql = `
      SELECT 
        pr.*,
        u.nombre as usuario_nombre
      FROM producto_resenas pr
      LEFT JOIN usuarios u ON pr.usuario_id = u.id
      WHERE pr.producto_id = ? AND pr.aprobado = TRUE
      ORDER BY pr.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const offset = (parseInt(pagina) - 1) * parseInt(limite);

    this.db.query(sql, [id, parseInt(limite), offset], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(result);
    });
  }

  // =============================================================================
  // CONFIGURAR RUTAS
  // =============================================================================

  configurarRutas(app) {
    // Productos
    app.get('/api/productos', this.obtenerProductos.bind(this));
    app.get('/api/productos/:id', this.obtenerProducto.bind(this));
    app.post('/api/productos', upload.single('imagen'), this.crearProducto.bind(this));
    app.put('/api/productos/:id', upload.single('imagen'), this.actualizarProducto.bind(this));
    app.delete('/api/productos/:id', this.eliminarProducto.bind(this));

    // Categorías y marcas
    app.get('/api/categorias', this.obtenerCategorias.bind(this));
    app.get('/api/marcas', this.obtenerMarcas.bind(this));
    app.get('/api/atributos', this.obtenerAtributos.bind(this));

    // Productos relacionados y reseñas
    app.get('/api/productos/:id/relacionados', this.obtenerProductosRelacionados.bind(this));
    app.get('/api/productos/:id/resenas', this.obtenerResenas.bind(this));
  }
}

export default ProductosController;
