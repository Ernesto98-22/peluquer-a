-- ========================================
-- PELUQUERÍA ROSA - ESQUEMA DE BASE DE DATOS
-- ========================================

-- Tabla de productos
CREATE TABLE IF NOT EXISTS productos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    imagen_url TEXT,
    categoria TEXT NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de reservas
CREATE TABLE IF NOT EXISTS reservas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    servicios TEXT NOT NULL,
    notas TEXT,
    estado TEXT DEFAULT 'pendiente',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de reseñas
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre_usuario TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comentario TEXT NOT NULL,
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de administradores
CREATE TABLE IF NOT EXISTS admin_emails (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas(estado);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(approved);

-- RLS
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_emails ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Anyone can view products" ON productos FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON productos FOR ALL USING (auth.email() IN (SELECT email FROM admin_emails));

CREATE POLICY "Anyone can insert reservations" ON reservas FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage reservations" ON reservas FOR ALL USING (auth.email() IN (SELECT email FROM admin_emails));

CREATE POLICY "Anyone can view approved reviews" ON reviews FOR SELECT USING (approved = true);
CREATE POLICY "Authenticated users can insert reviews" ON reviews FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage reviews" ON reviews FOR ALL USING (auth.email() IN (SELECT email FROM admin_emails));

CREATE POLICY "Users can read own admin status" ON admin_emails FOR SELECT USING (auth.email() = email);

-- Datos de ejemplo
INSERT INTO admin_emails (email) VALUES ('erneg442@gmail.com') ON CONFLICT DO NOTHING;

INSERT INTO productos (nombre, precio, imagen_url, categoria) VALUES
('Tinte Rosa Pastel', 1200, 'https://placehold.co/400x400/ffb6d9/white?text=Tinte+Rosa', 'tintes'),
('Champú Hidratante', 850, 'https://placehold.co/400x400/ffb6d9/white?text=Champú', 'champus'),
('Keratina Líquida', 2100, 'https://placehold.co/400x400/ffb6d9/white?text=Keratina', 'keratinas'),
('Crema para Peinar', 650, 'https://placehold.co/400x400/ffb6d9/white?text=Crema', 'cremas'),
('Set de Cepillos', 980, 'https://placehold.co/400x400/ffb6d9/white?text=Cepillos', 'variados');

INSERT INTO reviews (nombre_usuario, rating, comentario, approved) VALUES
('Laura M.', 5, 'Excelente atención, me encantó mi nuevo corte. Volveré seguro.', true),
('Camila R.', 5, 'El color quedó perfecto y el ambiente es muy acogedor.', true),
('Sofía G.', 4, 'Profesionales muy capacitados, me asesoraron increíble.', true);