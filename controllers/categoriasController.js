import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
};

// =============================================================================
// CATEGORÍAS
// =============================================================================

export const obtenerCategorias = async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [categorias] = await connection.execute(`
      SELECT 
        c.*,
        COUNT(p.id) as total_productos,
        padre.nombre as categoria_padre
      FROM categorias c
      LEFT JOIN productos p ON c.id = p.categoria_id AND p.activo = TRUE
      LEFT JOIN categorias padre ON c.padre_id = padre.id
      WHERE c.activo = TRUE
      GROUP BY c.id
      ORDER BY c.orden, c.nombre
    `);
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

export const crearCategoria = async (req, res) => {
  try {
    const { nombre, descripcion, padre_id, imagen } = req.body;
    
    // Generar slug automático
    const slug = nombre.toLowerCase()
      .replace(/[^a-z0-9\s]/gi, '')
      .replace(/\s+/g, '-');

    const connection = await mysql.createConnection(dbConfig);
    
    const [result] = await connection.execute(`
      INSERT INTO categorias (nombre, descripcion, slug, padre_id, imagen)
      VALUES (?, ?, ?, ?, ?)
    `, [nombre, descripcion, slug, padre_id, imagen]);

    await connection.end();

    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: { id: result.insertId, slug }
    });
  } catch (error) {
    console.error('❌ Error al crear categoría:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

export const actualizarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, padre_id, imagen, activo, orden } = req.body;

    const connection = await mysql.createConnection(dbConfig);

    // Si se actualiza el nombre, regenerar slug
    let slug = null;
    if (nombre) {
      slug = nombre.toLowerCase()
        .replace(/[^a-z0-9\s]/gi, '')
        .replace(/\s+/g, '-');
    }

    const campos = [];
    const valores = [];

    if (nombre) { campos.push('nombre = ?'); valores.push(nombre); }
    if (descripcion !== undefined) { campos.push('descripcion = ?'); valores.push(descripcion); }
    if (slug) { campos.push('slug = ?'); valores.push(slug); }
    if (padre_id !== undefined) { campos.push('padre_id = ?'); valores.push(padre_id); }
    if (imagen !== undefined) { campos.push('imagen = ?'); valores.push(imagen); }
    if (activo !== undefined) { campos.push('activo = ?'); valores.push(activo); }
    if (orden !== undefined) { campos.push('orden = ?'); valores.push(orden); }

    if (campos.length > 0) {
      valores.push(id);
      await connection.execute(`
        UPDATE categorias SET ${campos.join(', ')} WHERE id = ?
      `, valores);
    }

    await connection.end();

    res.json({
      success: true,
      message: 'Categoría actualizada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error al actualizar categoría:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

export const eliminarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);

    // Verificar si tiene productos asociados
    const [productos] = await connection.execute(
      'SELECT COUNT(*) as total FROM productos WHERE categoria_id = ? AND activo = TRUE',
      [id]
    );

    if (productos[0].total > 0) {
      await connection.end();
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar la categoría porque tiene ${productos[0].total} productos asociados`
      });
    }

    // Soft delete
    await connection.execute('UPDATE categorias SET activo = FALSE WHERE id = ?', [id]);
    await connection.end();

    res.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error al eliminar categoría:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// =============================================================================
// MARCAS
// =============================================================================

export const obtenerMarcas = async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [marcas] = await connection.execute(`
      SELECT 
        m.*,
        COUNT(p.id) as total_productos
      FROM marcas m
      LEFT JOIN productos p ON m.id = p.marca_id AND p.activo = TRUE
      WHERE m.activo = TRUE
      GROUP BY m.id
      ORDER BY m.nombre
    `);
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

export const crearMarca = async (req, res) => {
  try {
    const { nombre, descripcion, logo } = req.body;
    
    const connection = await mysql.createConnection(dbConfig);
    
    const [result] = await connection.execute(`
      INSERT INTO marcas (nombre, descripcion, logo)
      VALUES (?, ?, ?)
    `, [nombre, descripcion, logo]);

    await connection.end();

    res.status(201).json({
      success: true,
      message: 'Marca creada exitosamente',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('❌ Error al crear marca:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

export const actualizarMarca = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, logo, activo } = req.body;

    const connection = await mysql.createConnection(dbConfig);

    const campos = [];
    const valores = [];

    if (nombre) { campos.push('nombre = ?'); valores.push(nombre); }
    if (descripcion !== undefined) { campos.push('descripcion = ?'); valores.push(descripcion); }
    if (logo !== undefined) { campos.push('logo = ?'); valores.push(logo); }
    if (activo !== undefined) { campos.push('activo = ?'); valores.push(activo); }

    if (campos.length > 0) {
      valores.push(id);
      await connection.execute(`
        UPDATE marcas SET ${campos.join(', ')} WHERE id = ?
      `, valores);
    }

    await connection.end();

    res.json({
      success: true,
      message: 'Marca actualizada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error al actualizar marca:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

export const eliminarMarca = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);

    // Verificar si tiene productos asociados
    const [productos] = await connection.execute(
      'SELECT COUNT(*) as total FROM productos WHERE marca_id = ? AND activo = TRUE',
      [id]
    );

    if (productos[0].total > 0) {
      await connection.end();
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar la marca porque tiene ${productos[0].total} productos asociados`
      });
    }

    // Soft delete
    await connection.execute('UPDATE marcas SET activo = FALSE WHERE id = ?', [id]);
    await connection.end();

    res.json({
      success: true,
      message: 'Marca eliminada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error al eliminar marca:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};
