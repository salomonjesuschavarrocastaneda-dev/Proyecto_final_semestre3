-- MAGNUSSIG SIG - Sistema de gestión de inventario
-- Compatible con MySQL 8.0+. Django gestionará tablas y migraciones propias.
CREATE DATABASE IF NOT EXISTS magnussig_inventario CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE magnussig_inventario;

-- Esquema de referencia para el diseño relacional y consultas del equipo.
-- Si se usa el ORM de Django, no crees tablas paralelas con estos nombres:
-- ejecuta `python manage.py migrate` y deja que Django administre su esquema.
CREATE TABLE IF NOT EXISTS inventario_categoria_ref (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(255) NOT NULL DEFAULT '',
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventario_producto_ref (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL UNIQUE,
  nombre VARCHAR(180) NOT NULL,
  descripcion TEXT,
  categoria_id BIGINT UNSIGNED NOT NULL,
  precio DECIMAL(14,2) NOT NULL DEFAULT 0,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  stock_minimo INT UNSIGNED NOT NULL DEFAULT 0,
  unidad_medida ENUM('unidad','par','caja','paquete','botella','litro','rollo','kit','metro') NOT NULL DEFAULT 'unidad',
  fecha_caducidad DATE NULL,
  lote VARCHAR(80) NOT NULL DEFAULT '',
  marca VARCHAR(100) NOT NULL DEFAULT '',
  proveedor VARCHAR(150) NOT NULL DEFAULT '',
  ubicacion VARCHAR(150) NOT NULL DEFAULT '',
  normas TEXT NOT NULL,
  estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_producto_categoria_ref FOREIGN KEY(categoria_id) REFERENCES inventario_categoria_ref(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_producto_precio_ref CHECK(precio >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventario_movimiento_ref (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  referencia VARCHAR(40) NOT NULL UNIQUE,
  producto_id BIGINT UNSIGNED NOT NULL,
  tipo ENUM('entrada','salida','ajuste') NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  stock_anterior INT UNSIGNED NOT NULL,
  stock_nuevo INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  observacion VARCHAR(500) NOT NULL DEFAULT '',
  usuario_django_id BIGINT UNSIGNED NULL COMMENT 'ID de usuario gestionado por Django auth_user',
  creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mov_producto_ref FOREIGN KEY(producto_id) REFERENCES inventario_producto_ref(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_mov_cantidad_ref CHECK(cantidad > 0),
  INDEX idx_mov_fecha_ref(fecha),
  INDEX idx_mov_tipo_ref(tipo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventario_venta_ref (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  referencia VARCHAR(40) NOT NULL UNIQUE,
  cliente VARCHAR(180) NOT NULL DEFAULT '',
  forma_pago ENUM('efectivo','transferencia','tarjeta','credito','otro') NOT NULL,
  total DECIMAL(16,2) NOT NULL DEFAULT 0,
  vendedor_django_id BIGINT UNSIGNED NULL COMMENT 'Usuario que registra la venta',
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_venta_fecha_ref(fecha),
  INDEX idx_venta_vendedor_ref(vendedor_django_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventario_detalleventa_ref (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  venta_id BIGINT UNSIGNED NOT NULL,
  producto_id BIGINT UNSIGNED NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  precio_unitario DECIMAL(14,2) NOT NULL,
  CONSTRAINT fk_detalle_venta_ref FOREIGN KEY(venta_id) REFERENCES inventario_venta_ref(id) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto_ref FOREIGN KEY(producto_id) REFERENCES inventario_producto_ref(id) ON DELETE RESTRICT,
  CONSTRAINT chk_detalle_cantidad_ref CHECK(cantidad > 0),
  INDEX idx_detalle_venta_ref(venta_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventario_solicitudayuda_ref (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_django_id BIGINT UNSIGNED NOT NULL,
  asunto VARCHAR(180) NOT NULL,
  estado ENUM('abierta','respondida','cerrada') NOT NULL DEFAULT 'abierta',
  creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ayuda_usuario_ref(usuario_django_id),
  INDEX idx_ayuda_estado_ref(estado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventario_mensajeayuda_ref (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  solicitud_id BIGINT UNSIGNED NOT NULL,
  remitente_django_id BIGINT UNSIGNED NULL,
  contenido TEXT NOT NULL,
  creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mensaje_solicitud_ref FOREIGN KEY(solicitud_id) REFERENCES inventario_solicitudayuda_ref(id) ON DELETE CASCADE,
  INDEX idx_mensaje_solicitud_ref(solicitud_id, creado)
) ENGINE=InnoDB;

-- Categorías de referencia. Ejecuta solo si esta base se usará como esquema SQL independiente.
INSERT IGNORE INTO inventario_categoria_ref(nombre, descripcion) VALUES
('EPP','Elementos de protección personal'),
('Emergencia','Equipos e insumos para respuesta ante emergencias'),
('Señalización','Señales, avisos y elementos de demarcación'),
('Botiquín','Insumos de primeros auxilios'),
('Extintor','Extintores y equipos para control de incendios'),
('Higiene','Insumos de higiene y saneamiento');

-- Referencias iniciales sin existencias ni certificaciones atribuidas.
-- Completa precios, lotes, caducidad y normas con la información del proveedor.
INSERT IGNORE INTO inventario_producto_ref
  (codigo,nombre,categoria_id,precio,stock,stock_minimo,unidad_medida,normas)
SELECT 'MAG-EPP-001','Alcohol',id,0,0,1,'botella','' FROM inventario_categoria_ref WHERE nombre='Botiquín'
UNION ALL SELECT 'MAG-EPP-002','Casco de seguridad industrial',id,0,0,1,'unidad','' FROM inventario_categoria_ref WHERE nombre='EPP'
UNION ALL SELECT 'MAG-EPP-003','Gafas de seguridad',id,0,0,1,'unidad','' FROM inventario_categoria_ref WHERE nombre='EPP'
UNION ALL SELECT 'MAG-EPP-004','Tapón auditivo desechable',id,0,0,1,'par','' FROM inventario_categoria_ref WHERE nombre='EPP'
UNION ALL SELECT 'MAG-EPP-005','Tapabocas desechable',id,0,0,1,'unidad','' FROM inventario_categoria_ref WHERE nombre='EPP'
UNION ALL SELECT 'MAG-EPP-006','Guante de nitrilo',id,0,0,1,'caja','' FROM inventario_categoria_ref WHERE nombre='EPP'
UNION ALL SELECT 'MAG-EPP-007','Botas de seguridad',id,0,0,1,'par','' FROM inventario_categoria_ref WHERE nombre='EPP'
UNION ALL SELECT 'MAG-EPP-008','Arnés de seguridad',id,0,0,1,'unidad','' FROM inventario_categoria_ref WHERE nombre='EPP';

-- Consultas de verificación para MySQL Workbench:
-- SELECT * FROM inventario_categoria_ref;
-- SELECT p.codigo,p.nombre,c.nombre AS categoria,p.stock,p.stock_minimo,
--   CASE WHEN p.stock=0 THEN 'Agotado' WHEN p.stock<=p.stock_minimo THEN 'Stock bajo' ELSE 'Disponible' END AS estado_stock
-- FROM inventario_producto_ref p JOIN inventario_categoria_ref c ON c.id=p.categoria_id ORDER BY p.nombre;
-- SELECT m.fecha,m.referencia,p.nombre,m.tipo,m.cantidad,m.stock_anterior,m.stock_nuevo FROM inventario_movimiento_ref m JOIN inventario_producto_ref p ON p.id=m.producto_id ORDER BY m.fecha DESC;
