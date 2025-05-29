import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const validarUsuario = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ autorizado: false, mensaje: 'Email no proporcionado' });
    }

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    const [rows] = await connection.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    await connection.end();

    if (rows.length > 0) {
      return res.json({ autorizado: true });
    } else {
      return res.json({ autorizado: false });
    }
  } catch (error) {
    console.error('❌ Error en validarUsuario:', error);
    return res.status(500).json({ autorizado: false, error: 'Error interno del servidor' });
  }
};
