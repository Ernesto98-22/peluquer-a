-- ========================================
-- PASO FIRME - ESQUEMA DE BASE DE DATOS (Supabase)
-- ========================================
-- Ejecutar en el SQL Editor de Supabase

-- Eliminar tablas si existen (para empezar limpio)
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS admin_emails CASCADE;

-- Tabla de productos
CREATE TABLE productos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    imagen_url TEXT,
    categoria TEXT NOT NULL,
    stock INTEGER DEFAULT 0,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de reseñas
CREATE TABLE reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre_usuario TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comentario TEXT NOT NULL,
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de administradores
CREATE TABLE admin_emails (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_productos_categoria ON productos(categoria);
CREATE INDEX idx_reviews_approved ON reviews(approved);
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);

-- Función y trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_productos_updated_at
    BEFORE UPDATE ON productos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_emails ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Anyone can view products" ON productos FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON productos FOR ALL USING (auth.email() IN (SELECT email FROM admin_emails));

CREATE POLICY "Anyone can view approved reviews" ON reviews FOR SELECT USING (approved = true);
CREATE POLICY "Authenticated users can insert reviews" ON reviews FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage reviews" ON reviews FOR ALL USING (auth.email() IN (SELECT email FROM admin_emails));

CREATE POLICY "Users can read own admin status" ON admin_emails FOR SELECT USING (auth.email() = email);

-- Datos de ejemplo (cambia 'erneg442@gmail.com' por tu correo si quieres)
INSERT INTO admin_emails (email) VALUES ('erneg442@gmail.com') ON CONFLICT DO NOTHING;

INSERT INTO productos (nombre, precio, imagen_url, categoria) VALUES
    ('Camisa Oxford Azul', 4500, 'https://placehold.co/400x400/EEE/555?text=Camisa+Azul', 'camisas'),
    ('Pantalón Gris Formal', 6500, 'https://placehold.co/400x400/EEE/555?text=Pantalon+Gris', 'pantalones'),
    ('Short Beige Casual', 3500, 'https://placehold.co/400x400/EEE/555?text=Short+Beige', 'shorts'),
    ('Sneakers Blancos', 8500, 'https://placehold.co/400x400/EEE/555?text=Sneakers', 'zapatos'),
    ('Conjunto Niña Amarillo', 4200, 'https://placehold.co/400x400/EEE/555?text=Conjunto+Niño', 'ninos')
ON CONFLICT DO NOTHING;

INSERT INTO reviews (nombre_usuario, rating, comentario, approved) VALUES
    ('María G.', 5, 'Excelente calidad y atención. Los zapatos son increíbles.', true),
    ('Carlos R.', 4, 'La ropa es de primera, volveré a comprar.', true),
    ('Ana L.', 5, 'Diseños únicos, me encanta su estilo.', true),
    ('Pedro S.', 5, 'Muy contento con mi compra, envío rápido.', false)
ON CONFLICT DO NOTHING;