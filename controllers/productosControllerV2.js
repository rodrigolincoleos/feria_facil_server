import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de conexión a la base de datos
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
};

// =============================================================================
// PRODUCTOS - CRUD COMPLETO CON NUEVA ESTRUCTURA
// =============================================================================

// Obtener todos los productos con información completa
export const obtenerProductos = async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const query = `
      SELECT * FROM v_productos_completos 
      WHERE activo = TRUE 
      ORDER BY created_at DESC
    `;
    
    const [productos] = await connection.execute(query);
    await connection.end();

    res.json({
      success: true,
      data: productos,
      total: productos.length
    });
  } catch (error) {
    console.error('❌ Error al obtener productos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

// Obtener un producto por ID con atributos
export const obtenerProductoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);

    // Obtener información básica del producto
    const [productos] = await connection.execute(
      'SELECT * FROM v_productos_completos WHERE id = ?',
      [id]
    );

    if (productos.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Obtener atributos del producto
    const [atributos] = await connection.execute(
      'SELECT * FROM v_productos_atributos WHERE producto_id = ?',
      [id]
    );

    // Obtener reseñas del producto
    const [resenas] = await connection.execute(
      'SELECT * FROM producto_resenas WHERE producto_id = ? AND aprobado = TRUE ORDER BY created_at DESC',
      [id]
    );

    await connection.end();

    const producto = {
      ...productos[0],
      atributos,
      resenas,
      promedio_calificacion: resenas.length > 0 
        ? (resenas.reduce((sum, r) => sum + r.calificacion, 0) / resenas.length).toFixed(1)
        : null
    };

    res.json({
      success: true,
      data: producto
    });
  } catch (error) {
    console.error('❌ Error al obtener producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

// Crear nuevo producto
export const crearProducto = async (req, res) => {
  try {
    const {
      nombre,
      categoria_id,
      marca_id,
      descripcion_corta,
      descripcion_larga,
      precio_publico,
      precio_oferta,
      stock_actual,
      stock_minimo,
      peso,
      destacado = false,
      nuevo = false,
      filamento,
      gramos,
      horas,
      total,
      impresora_id,
      atributos = []
    } = req.body;

    const connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    try {
      // Generar SKU automático
      const [maxId] = await connection.execute('SELECT MAX(id) as max_id FROM productos');
      const nextId = (maxId[0].max_id || 0) + 1;
      const sku = `3D-${String(nextId).padStart(4, '0')}`;

      // Generar slug automático
      const slug = `${nombre.toLowerCase()
        .replace(/[^a-z0-9\s]/gi, '')
        .replace(/\s+/g, '-')}-${nextId}`;

      // Insertar producto
      const insertQuery = `
        INSERT INTO productos (
          nombre, categoria_id, marca_id, sku, descripcion_corta, descripcion_larga,
          precio_publico, precio_oferta, stock_actual, stock_minimo, peso,
          activo, destacado, nuevo, slug, filamento, gramos, horas, total, impresora_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await connection.execute(insertQuery, [
        nombre, categoria_id, marca_id, sku, descripcion_corta, descripcion_larga,
        precio_publico, precio_oferta, stock_actual, stock_minimo, peso,
        destacado, nuevo, slug, filamento, gramos, horas, total, impresora_id
      ]);

      const producto_id = result.insertId;

      // Insertar atributos si los hay
      if (atributos && atributos.length > 0) {
        for (const atributo of atributos) {
          await connection.execute(
            'INSERT INTO producto_atributos (producto_id, atributo_id, valor) VALUES (?, ?, ?)',
            [producto_id, atributo.atributo_id, atributo.valor]
          );
        }
      }

      await connection.commit();
      await connection.end();

      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: { id: producto_id, sku, slug }
      });

    } catch (error) {
      await connection.rollback();
      await connection.end();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error al crear producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

// Actualizar producto
export const actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    try {
      // Construir query de actualización dinámicamente
      const campos = [];
      const valores = [];

      for (const [campo, valor] of Object.entries(updates)) {
        if (campo !== 'atributos' && valor !== undefined) {
          campos.push(`${campo} = ?`);
          valores.push(valor);
        }
      }

      if (campos.length > 0) {
        valores.push(id);
        const updateQuery = `UPDATE productos SET ${campos.join(', ')} WHERE id = ?`;
        await connection.execute(updateQuery, valores);
      }

      // Actualizar atributos si se proporcionan
      if (updates.atributos) {
        // Eliminar atributos existentes
        await connection.execute('DELETE FROM producto_atributos WHERE producto_id = ?', [id]);
        
        // Insertar nuevos atributos
        for (const atributo of updates.atributos) {
          await connection.execute(
            'INSERT INTO producto_atributos (producto_id, atributo_id, valor) VALUES (?, ?, ?)',
            [id, atributo.atributo_id, atributo.valor]
          );
        }
      }

      await connection.commit();
      await connection.end();

      res.json({
        success: true,
        message: 'Producto actualizado exitosamente'
      });

    } catch (error) {
      await connection.rollback();
      await connection.end();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error al actualizar producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

// Eliminar producto (soft delete)
export const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);

    await connection.execute('UPDATE productos SET activo = FALSE WHERE id = ?', [id]);
    await connection.end();

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error al eliminar producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

// =============================================================================
// FUNCIONES DE APOYO
// =============================================================================

// Obtener productos destacados
export const obtenerProductosDestacados = async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [productos] = await connection.execute('SELECT * FROM v_productos_destacados LIMIT 10');
    await connection.end();

    res.json({
      success: true,
      data: productos
    });
  } catch (error) {
    console.error('❌ Error al obtener productos destacados:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener productos con stock bajo
export const obtenerProductosStockBajo = async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [productos] = await connection.execute('SELECT * FROM v_productos_stock_bajo');
    await connection.end();

    res.json({
      success: true,
      data: productos
    });
  } catch (error) {
    console.error('❌ Error al obtener productos con stock bajo:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener categorías
export const obtenerCategorias = async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [categorias] = await connection.execute(
      'SELECT * FROM categorias WHERE activo = TRUE ORDER BY orden, nombre'
    );
    await connection.end();

    res.json({
      success: true,
      data: categorias
    });
  } catch (error) {
    console.error('❌ Error al obtener categorías:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener marcas
export const obtenerMarcas = async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [marcas] = await connection.execute(
      'SELECT * FROM marcas WHERE activo = TRUE ORDER BY nombre'
    );
    await connection.end();

    res.json({
      success: true,
      data: marcas
    });
  } catch (error) {
    console.error('❌ Error al obtener marcas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener atributos
export const obtenerAtributos = async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [atributos] = await connection.execute(
      'SELECT * FROM atributos WHERE activo = TRUE ORDER BY orden, nombre'
    );
    await connection.end();

    res.json({
      success: true,
      data: atributos
    });
  } catch (error) {
    console.error('❌ Error al obtener atributos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};
