// =============================================================================
// CONFIGURACIÓN PARA USAR EL NUEVO CONTROLADOR DE PRODUCTOS
// =============================================================================
// Agrega esto a tu server.js después de la línea donde inicializas el db

// Importar el nuevo controlador de productos
import ProductosController from './controllers/productosController.js';

// Inicializar controlador de productos (después de la línea donde defines 'db')
const productosController = new ProductosController(db);

// Configurar las nuevas rutas (agrega esto después de las rutas existentes)
productosController.configurarRutas(app);

// =============================================================================
// OPCIONAL: Mantener rutas existentes para compatibilidad
// =============================================================================
// Las rutas antiguas seguirán funcionando, pero las nuevas son más robustas

console.log('✅ Controlador de productos avanzado inicializado');
console.log('🆕 Nuevas rutas disponibles:');
console.log('   GET /api/productos - Lista productos con filtros avanzados');
console.log('   GET /api/productos/:id - Obtiene producto por ID o slug');
console.log('   GET /api/categorias - Lista categorías');
console.log('   GET /api/marcas - Lista marcas');
console.log('   GET /api/atributos - Lista atributos');
console.log('   GET /api/productos/:id/relacionados - Productos relacionados');
console.log('   GET /api/productos/:id/resenas - Reseñas del producto');
