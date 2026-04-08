-- ═══════════════════════════════════════════════════════════════════════════
-- SEED: 30 mock users, 10 friends of j14fernandez, 10 visits each (300 total)
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Step 0: Find the real user ─────────────────────────────────────────────
-- We need the UUID of j14fernandez@gmail.com from auth.users
DO $$
DECLARE
  main_user_id UUID;
BEGIN
  SELECT id INTO main_user_id FROM auth.users WHERE email = 'j14fernandez@gmail.com' LIMIT 1;
  IF main_user_id IS NULL THEN
    RAISE EXCEPTION 'User j14fernandez@gmail.com not found in auth.users';
  END IF;
  -- Store in temp table for use across statements
  CREATE TEMP TABLE IF NOT EXISTS _seed_config (key TEXT PRIMARY KEY, val UUID);
  INSERT INTO _seed_config VALUES ('main_user', main_user_id) ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
END $$;

-- ── Step 1: Create 30 mock users in auth.users ────────────────────────────
-- (the trigger handle_new_user auto-creates public.users rows)
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, aud, role, created_at, updated_at, raw_user_meta_data)
VALUES
  ('a0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'carlos.garcia@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '45 days', now(), '{"name":"Carlos García"}'),
  ('a0000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'marina.lopez@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '40 days', now(), '{"name":"Marina López"}'),
  ('a0000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'pablo.martinez@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '38 days', now(), '{"name":"Pablo Martínez"}'),
  ('a0000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'lucia.fernandez@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '35 days', now(), '{"name":"Lucía Fernández"}'),
  ('a0000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'andres.ruiz@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '33 days', now(), '{"name":"Andrés Ruiz"}'),
  ('a0000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'sofia.moreno@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '30 days', now(), '{"name":"Sofía Moreno"}'),
  ('a0000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'diego.navarro@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '28 days', now(), '{"name":"Diego Navarro"}'),
  ('a0000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'elena.romero@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '25 days', now(), '{"name":"Elena Romero"}'),
  ('a0000001-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'javier.torres@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '22 days', now(), '{"name":"Javier Torres"}'),
  ('a0000001-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'carmen.diaz@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '20 days', now(), '{"name":"Carmen Díaz"}'),
  -- Users 11-20 (NOT friends)
  ('a0000001-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'alejandro.sanz@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '18 days', now(), '{"name":"Alejandro Sanz"}'),
  ('a0000001-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'ines.castro@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '17 days', now(), '{"name":"Inés Castro"}'),
  ('a0000001-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'marcos.blanco@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '16 days', now(), '{"name":"Marcos Blanco"}'),
  ('a0000001-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', 'valeria.herrera@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '15 days', now(), '{"name":"Valeria Herrera"}'),
  ('a0000001-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000000', 'hugo.mendez@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '14 days', now(), '{"name":"Hugo Méndez"}'),
  ('a0000001-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000000', 'nuria.perez@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '13 days', now(), '{"name":"Nuria Pérez"}'),
  ('a0000001-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000000', 'raul.ortega@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '12 days', now(), '{"name":"Raúl Ortega"}'),
  ('a0000001-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000000', 'alba.jimenez@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '11 days', now(), '{"name":"Alba Jiménez"}'),
  ('a0000001-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000000', 'ivan.santos@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '10 days', now(), '{"name":"Iván Santos"}'),
  ('a0000001-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000000', 'paula.vega@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '9 days', now(), '{"name":"Paula Vega"}'),
  -- Users 21-30 (NOT friends)
  ('a0000001-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000000', 'daniel.rios@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '8 days', now(), '{"name":"Daniel Ríos"}'),
  ('a0000001-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000000', 'cristina.fuentes@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '7 days', now(), '{"name":"Cristina Fuentes"}'),
  ('a0000001-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000000', 'miguel.caballero@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '6 days', now(), '{"name":"Miguel Caballero"}'),
  ('a0000001-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000000', 'laura.aguilar@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '5 days', now(), '{"name":"Laura Aguilar"}'),
  ('a0000001-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000000', 'adrian.prieto@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '4 days', now(), '{"name":"Adrián Prieto"}'),
  ('a0000001-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000000', 'marta.calvo@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '3 days', now(), '{"name":"Marta Calvo"}'),
  ('a0000001-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000000', 'oscar.leon@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '3 days', now(), '{"name":"Óscar León"}'),
  ('a0000001-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000000', 'beatriz.molina@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '2 days', now(), '{"name":"Beatriz Molina"}'),
  ('a0000001-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000000', 'sergio.pena@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '2 days', now(), '{"name":"Sergio Peña"}'),
  ('a0000001-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000000', 'ana.delgado@mock.savry', '', now(), 'authenticated', 'authenticated', now() - interval '1 day', now(), '{"name":"Ana Delgado"}')
ON CONFLICT (id) DO NOTHING;

-- ── Step 2: Update public.users with profile data ──────────────────────────
-- (trigger created basic rows, now we enrich them)
UPDATE public.users SET name = 'Carlos García',    handle = 'carlosg',      city = 'Madrid', bio = 'Amante de la cocina japonesa y los vinos naturales', taste_profile = 'Explorador Gourmet', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/men/32.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000001';
UPDATE public.users SET name = 'Marina López',     handle = 'marinafoodie', city = 'Madrid', bio = 'Siempre buscando el brunch perfecto', taste_profile = 'Brunch Queen', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/women/44.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000002';
UPDATE public.users SET name = 'Pablo Martínez',   handle = 'pablomtz',     city = 'Madrid', bio = 'Carnívoro confeso. BBQ es mi religión', taste_profile = 'Carnívoro Pro', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/men/75.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000003';
UPDATE public.users SET name = 'Lucía Fernández',  handle = 'luciafood',    city = 'Madrid', bio = 'Vegana desde 2020. Descubriendo Madrid sin carne', taste_profile = 'Green Critic', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/women/68.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000004';
UPDATE public.users SET name = 'Andrés Ruiz',      handle = 'andresruiz',   city = 'Madrid', bio = 'Chef aficionado, fan del street food', taste_profile = 'Street Food Hunter', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/men/22.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000005';
UPDATE public.users SET name = 'Sofía Moreno',     handle = 'sofiamore',    city = 'Madrid', bio = 'Italiana de corazón, madrileña de nacimiento', taste_profile = 'Pasta Lover', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/women/29.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000006';
UPDATE public.users SET name = 'Diego Navarro',    handle = 'diegonav',     city = 'Madrid', bio = 'Buscando el mejor cochinillo de Madrid', taste_profile = 'Tradición Pura', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/men/45.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000007';
UPDATE public.users SET name = 'Elena Romero',     handle = 'elenaromer',   city = 'Madrid', bio = 'Sommelière amateur. Maridaje o muerte', taste_profile = 'Wine & Dine', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/women/55.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000008';
UPDATE public.users SET name = 'Javier Torres',    handle = 'javitorre',    city = 'Madrid', bio = 'Foodie de fin de semana, ingeniero de lunes a viernes', taste_profile = 'Weekend Foodie', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/men/61.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000009';
UPDATE public.users SET name = 'Carmen Díaz',      handle = 'carmendz',     city = 'Madrid', bio = 'Dulce sobre salado, siempre', taste_profile = 'Sweet Tooth', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/women/72.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000010';
UPDATE public.users SET name = 'Alejandro Sanz',   handle = 'alexsanz',     city = 'Madrid', bio = 'Tapas y cañas, nada más', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/men/11.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000011';
UPDATE public.users SET name = 'Inés Castro',      handle = 'inescastro',   city = 'Madrid', bio = 'Exploradora de mercados', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/women/19.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000012';
UPDATE public.users SET name = 'Marcos Blanco',    handle = 'marcosb',      city = 'Barcelona', bio = 'Madrileño en Barcelona', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/men/52.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000013';
UPDATE public.users SET name = 'Valeria Herrera',  handle = 'valeriah',     city = 'Madrid', bio = 'Crítica exigente', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/women/37.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000014';
UPDATE public.users SET name = 'Hugo Méndez',      handle = 'hugomendez',   city = 'Madrid', bio = 'Sushi addict', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/men/18.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000015';
UPDATE public.users SET name = 'Nuria Pérez',      handle = 'nuriap',       city = 'Sevilla', bio = 'Andaluza en la capital', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/women/82.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000016';
UPDATE public.users SET name = 'Raúl Ortega',      handle = 'raulortega',   city = 'Madrid', bio = 'Pizza lover', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/men/67.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000017';
UPDATE public.users SET name = 'Alba Jiménez',     handle = 'albajim',      city = 'Madrid', bio = 'Healthy pero con excepciones', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/women/14.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000018';
UPDATE public.users SET name = 'Iván Santos',      handle = 'ivansantos',   city = 'Valencia', bio = 'Paella snob', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/men/39.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000019';
UPDATE public.users SET name = 'Paula Vega',       handle = 'paulavega',    city = 'Madrid', bio = 'Brunch y café de especialidad', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/women/90.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000020';
UPDATE public.users SET name = 'Daniel Ríos',      handle = 'danielrios',   city = 'Madrid', bio = 'Ramen hunter', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/men/84.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000021';
UPDATE public.users SET name = 'Cristina Fuentes', handle = 'cristinaf',    city = 'Madrid', bio = 'Fine dining cuando puedo', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/women/47.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000022';
UPDATE public.users SET name = 'Miguel Caballero', handle = 'miguelcab',    city = 'Madrid', bio = 'Siempre pidiendo el especial del día', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/men/29.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000023';
UPDATE public.users SET name = 'Laura Aguilar',    handle = 'lauraag',      city = 'Madrid', bio = 'Croquetas queen', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/women/63.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000024';
UPDATE public.users SET name = 'Adrián Prieto',    handle = 'adrianp',      city = 'Madrid', bio = 'Le echo salsa a todo', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/men/56.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000025';
UPDATE public.users SET name = 'Marta Calvo',      handle = 'martacalvo',   city = 'Madrid', bio = 'Vermut o''clock siempre', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/women/33.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000026';
UPDATE public.users SET name = 'Óscar León',       handle = 'oscarleon',    city = 'Madrid', bio = 'El postre no es opcional', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/men/71.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000027';
UPDATE public.users SET name = 'Beatriz Molina',   handle = 'beatrizmol',   city = 'Madrid', bio = 'Tacos y mezcal', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/women/25.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000028';
UPDATE public.users SET name = 'Sergio Peña',      handle = 'sergiopena',   city = 'Bilbao', bio = 'Pintxos por encima de todo', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/men/43.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000029';
UPDATE public.users SET name = 'Ana Delgado',      handle = 'anadelgado',   city = 'Madrid', bio = 'Cocina de autor y mercados', is_public = true, avatar_url = 'https://randomuser.me/api/portraits/women/51.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000030';

-- ── Step 3: Create mutual friendships (users 1-10 ↔ main user) ─────────────
DO $$
DECLARE
  mu UUID;
BEGIN
  SELECT val INTO mu FROM _seed_config WHERE key = 'main_user';

  -- Bidirectional mutual relationships (both directions for proper RLS)
  INSERT INTO public.relationships (user_id, target_id, type, status, affinity_score) VALUES
    (mu, 'a0000001-0000-0000-0000-000000000001', 'mutual', 'active', 87.5),
    ('a0000001-0000-0000-0000-000000000001', mu, 'mutual', 'active', 87.5),
    (mu, 'a0000001-0000-0000-0000-000000000002', 'mutual', 'active', 92.0),
    ('a0000001-0000-0000-0000-000000000002', mu, 'mutual', 'active', 92.0),
    (mu, 'a0000001-0000-0000-0000-000000000003', 'mutual', 'active', 78.3),
    ('a0000001-0000-0000-0000-000000000003', mu, 'mutual', 'active', 78.3),
    (mu, 'a0000001-0000-0000-0000-000000000004', 'mutual', 'active', 65.0),
    ('a0000001-0000-0000-0000-000000000004', mu, 'mutual', 'active', 65.0),
    (mu, 'a0000001-0000-0000-0000-000000000005', 'mutual', 'active', 81.2),
    ('a0000001-0000-0000-0000-000000000005', mu, 'mutual', 'active', 81.2),
    (mu, 'a0000001-0000-0000-0000-000000000006', 'mutual', 'active', 73.8),
    ('a0000001-0000-0000-0000-000000000006', mu, 'mutual', 'active', 73.8),
    (mu, 'a0000001-0000-0000-0000-000000000007', 'mutual', 'active', 69.1),
    ('a0000001-0000-0000-0000-000000000007', mu, 'mutual', 'active', 69.1),
    (mu, 'a0000001-0000-0000-0000-000000000008', 'mutual', 'active', 88.4),
    ('a0000001-0000-0000-0000-000000000008', mu, 'mutual', 'active', 88.4),
    (mu, 'a0000001-0000-0000-0000-000000000009', 'mutual', 'active', 55.6),
    ('a0000001-0000-0000-0000-000000000009', mu, 'mutual', 'active', 55.6),
    (mu, 'a0000001-0000-0000-0000-000000000010', 'mutual', 'active', 71.0),
    ('a0000001-0000-0000-0000-000000000010', mu, 'mutual', 'active', 71.0)
  ON CONFLICT (user_id, target_id) DO NOTHING;

  -- Some friendships between mock users too (makes discovery interesting)
  INSERT INTO public.relationships (user_id, target_id, type, status, affinity_score) VALUES
    ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'mutual', 'active', 80.0),
    ('a0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'mutual', 'active', 80.0),
    ('a0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000005', 'mutual', 'active', 75.0),
    ('a0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000003', 'mutual', 'active', 75.0),
    ('a0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000008', 'mutual', 'active', 68.0),
    ('a0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000006', 'mutual', 'active', 68.0)
  ON CONFLICT (user_id, target_id) DO NOTHING;
END $$;

-- ── Step 4: Create 40 restaurants ──────────────────────────────────────────
INSERT INTO public.restaurants (id, name, address, neighborhood, city, cuisine, price_level, chain_name, cover_image_url) VALUES
  -- Independent Madrid restaurants
  ('b0000001-0000-0000-0000-000000000001', 'Casa Lucio',             'Calle de la Cava Baja 35',        'La Latina',    'Madrid', 'Castellana',     3, NULL, 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000002', 'StreetXO',               'Calle de Serrano 52',             'Salamanca',    'Madrid', 'Fusión',         3, NULL, 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000003', 'Punto MX',               'Calle del General Pardiñas 40',   'Salamanca',    'Madrid', 'Mexicana',       3, NULL, 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000004', 'La Barraca',             'Calle de la Reina 29',            'Chueca',       'Madrid', 'Arrocería',      3, NULL, 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000005', 'Sala de Despiece',       'Calle de Ponzano 11',             'Chamberí',     'Madrid', 'Tapas Creativas', 2, NULL, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000006', 'Taberna La Concha',      'Calle de la Cava Baja 7',         'La Latina',    'Madrid', 'Tapas',          2, NULL, 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000007', 'Numa Pompilio',          'Calle de Sagasta 16',             'Alonso Martínez', 'Madrid', 'Italiana',    2, NULL, 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000008', 'El Paraguas',            'Calle de Jorge Juan 16',          'Retiro',       'Madrid', 'Contemporánea',  4, NULL, 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000009', 'Triciclo',               'Calle de Santa María 28',         'Huertas',      'Madrid', 'Autor',          3, NULL, 'https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000010', 'La Carmencita',          'Calle de la Libertad 16',         'Chueca',       'Madrid', 'Tradicional',    2, NULL, 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000011', 'Alimentación Quiroga',   'Calle de Santa Isabel 5',         'Lavapiés',     'Madrid', 'Fusión',         2, NULL, 'https://images.unsplash.com/photo-1521917441209-e886f0404a7b?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000012', 'Coque',                  'Calle del Marqués del Riscal 11', 'Alonso Martínez', 'Madrid', 'Alta Cocina',  4, NULL, 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000013', 'Yakitoro by Chicote',    'Calle de la Reina 41',            'Chueca',       'Madrid', 'Japonesa',       3, NULL, 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000014', 'Fismuler',               'Calle de Sagasta 29',             'Chamberí',     'Madrid', 'Autor',          3, NULL, 'https://images.unsplash.com/photo-1592861956120-e524fc739696?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000015', 'El Club Allard',         'Calle de Ferraz 2',               'Plaza de España', 'Madrid', 'Alta Cocina', 4, NULL, 'https://images.unsplash.com/photo-1560053608-13721e0d69e8?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000016', 'La Tasquería',           'Calle del Duque de Sesto 48',     'Retiro',       'Madrid', 'Casquería',      3, NULL, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000017', 'Taberna Pedraza',        'Calle de Recoletos 4',            'Recoletos',    'Madrid', 'Tapas',          2, NULL, 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000018', 'Amazónico',              'Calle de Jorge Juan 20',          'Retiro',       'Madrid', 'Tropical Fusión', 4, NULL, 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000019', 'Rosi La Loca',           'Calle de la Cava Alta 4',         'La Latina',    'Madrid', 'Tapas',          2, NULL, 'https://images.unsplash.com/photo-1485963631004-f2f00b1d6571?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000020', 'Bacira',                 'Calle del Castillo 16',           'Chamberí',     'Madrid', 'Fusión Asiática', 3, NULL, 'https://images.unsplash.com/photo-1562436260-ddc221b4ac82?w=800&h=800&fit=crop'),
  -- Chain restaurants
  ('b0000001-0000-0000-0000-000000000021', 'Goiko Juan Bravo',       'Calle de Juan Bravo 6',           'Salamanca',    'Madrid', 'Hamburguesas',   2, 'goiko', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000022', 'Honest Greens Ponzano',  'Calle de Ponzano 46',             'Chamberí',     'Madrid', 'Healthy',        2, 'honest-greens', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000023', 'Lateral Castellana',     'Paseo de la Castellana 42',       'Salamanca',    'Madrid', 'Tapas Modernas', 3, 'lateral', 'https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000024', 'Grosso Napoletano Fuencarral', 'Calle de Fuencarral 73',    'Malasaña',     'Madrid', 'Pizza Napolitana', 2, 'grosso-napoletano', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000025', 'La Tagliatella Goya',    'Calle de Goya 47',                'Salamanca',    'Madrid', 'Italiana',       2, 'la-tagliatella', 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000026', 'Five Guys Gran Vía',     'Gran Vía 44',                     'Gran Vía',     'Madrid', 'Hamburguesas',   2, 'five-guys', 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000027', 'SUMO Juan Bravo',        'Calle de Juan Bravo 38',          'Salamanca',    'Madrid', 'Japonesa',       2, 'sumo', 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000028', 'La Monarracha Pozuelo',  'Av. de Europa 13',                'Pozuelo',      'Madrid', 'Japo-fusión',    3, 'la-monarracha', 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000029', 'Hundred Burgers Malasaña','Calle del Espíritu Santo 19',    'Malasaña',     'Madrid', 'Hamburguesas',   2, 'hundred-burgers', 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000030', 'Flax & Kale Madrid',     'Calle del Marqués de Santa Ana 4','Malasaña',     'Madrid', 'Healthy',        2, 'flax-kale', 'https://images.unsplash.com/photo-1540914124281-342587941389?w=800&h=800&fit=crop'),
  -- More independent restaurants
  ('b0000001-0000-0000-0000-000000000031', 'Smoked Room',            'Calle de Ponzano 14',             'Chamberí',     'Madrid', 'BBQ',            3, NULL, 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000032', 'Álbora',                 'Calle de Jorge Juan 33',          'Retiro',       'Madrid', 'Mediterránea',   4, NULL, 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000033', 'Lakasa',                 'Plaza del Descubridor Diego de Ordás 1', 'Chamberí', 'Madrid', 'Autor',       3, NULL, 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000034', 'Chifa',                  'Calle del Marqués de Villamagna 3','Salamanca',    'Madrid', 'Nikkei',         3, NULL, 'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000035', 'Santceloni',             'Paseo de la Castellana 57',       'Salamanca',    'Madrid', 'Alta Cocina',    4, NULL, 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000036', 'Taberna La Daniela Medinaceli', 'Plaza de Jesús 7',         'Huertas',      'Madrid', 'Cocido',         2, 'taberna-la-daniela', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000037', 'Rubaiyat Madrid',        'Calle de Juan Ramón Jiménez 37',  'Chamartín',    'Madrid', 'Brasileña',      4, NULL, 'https://images.unsplash.com/photo-1558030006-450675393462?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000038', 'Candeli',                'Plaza de la Paja 4',              'La Latina',    'Madrid', 'Mediterránea',   3, NULL, 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000039', 'Ultramarinos Quintín',   'Calle de Regueros 10',            'Chueca',       'Madrid', 'Deli',           2, NULL, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=800&fit=crop'),
  ('b0000001-0000-0000-0000-000000000040', 'Tepic',                  'Calle de Pelayo 4',               'Chueca',       'Madrid', 'Mexicana',       3, NULL, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&h=800&fit=crop')
ON CONFLICT (id) DO NOTHING;

-- ── Step 5: Create 300 visits (10 per user × 30 users) ─────────────────────
-- Each visit gets realistic data: score, sentiment, note, date, spend
INSERT INTO public.visits (id, user_id, restaurant_id, visited_at, sentiment, rank_score, note, visibility, spend_per_person) VALUES
  -- ── User 1: Carlos García (friend) — Japanese/fusion lover ──
  ('c0000001-0001-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000013', now() - interval '2 days',  'loved', 9.2, 'El mejor yakitori que he probado en Madrid. El de corazón de pollo es brutal.', 'friends', '35-60'),
  ('c0000001-0001-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000027', now() - interval '5 days',  'loved', 8.8, 'SUMO nunca falla. El tataki de atún estaba en su punto.', 'friends', '20-35'),
  ('c0000001-0001-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000020', now() - interval '8 days',  'loved', 9.5, 'Bacira es mi restaurante favorito ahora mismo. El dim sum es perfecto.', 'friends', '35-60'),
  ('c0000001-0001-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000005', now() - interval '12 days', 'loved', 8.5, 'Sala de Despiece sigue sorprendiéndome cada vez que voy.', 'friends', '20-35'),
  ('c0000001-0001-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000034', now() - interval '15 days', 'loved', 9.0, 'El ceviche nikkei es una obra de arte. Volveré seguro.', 'friends', '35-60'),
  ('c0000001-0001-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000014', now() - interval '18 days', 'fine',  7.5, 'Fismuler bien pero no me voló la cabeza. Quizá el menú del día no era el mejor.', 'friends', '20-35'),
  ('c0000001-0001-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', now() - interval '20 days', 'loved', 8.9, 'Los huevos rotos de Casa Lucio son legendarios con razón.', 'friends', '35-60'),
  ('c0000001-0001-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000028', now() - interval '23 days', 'loved', 8.3, 'La Monarracha es el nuevo sitio de moda. El sushi burrito no decepciona.', 'friends', '20-35'),
  ('c0000001-0001-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000018', now() - interval '27 days', 'loved', 9.1, 'Amazónico tiene un ambiente increíble. El ceviche de lubina fue espectacular.', 'friends', '60+'),
  ('c0000001-0001-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000024', now() - interval '30 days', 'fine',  7.8, 'Grosso tiene buena pizza pero para lo que cuesta... esperaba más.', 'friends', '20-35'),

  -- ── User 2: Marina López (friend) — Brunch/healthy lover ──
  ('c0000001-0002-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000022', now() - interval '1 day',   'loved', 9.3, 'Honest Greens de Ponzano es mi segunda casa. El pollo al horno es insuperable.', 'friends', '0-20'),
  ('c0000001-0002-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000030', now() - interval '4 days',  'loved', 8.7, 'Flax & Kale tiene los mejores bowls de Madrid. El de salmón es adictivo.', 'friends', '20-35'),
  ('c0000001-0002-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000010', now() - interval '7 days',  'loved', 8.5, 'La Carmencita es puro encanto. Los huevos benedictine del brunch top.', 'friends', '20-35'),
  ('c0000001-0002-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000039', now() - interval '10 days', 'loved', 8.9, 'Quintín tiene la mejor tostada de aguacate de Chueca. Punto.', 'friends', '0-20'),
  ('c0000001-0002-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000014', now() - interval '14 days', 'loved', 9.0, 'Fismuler para cenar es otra experiencia. El steak tartar increíble.', 'friends', '35-60'),
  ('c0000001-0002-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000011', now() - interval '17 days', 'fine',  7.2, 'Alimentación Quiroga es curioso pero los platos son irregulares.', 'friends', '20-35'),
  ('c0000001-0002-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000005', now() - interval '20 days', 'loved', 8.6, 'Las tapas de Sala de Despiece son espectaculares de presentación.', 'friends', '20-35'),
  ('c0000001-0002-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000038', now() - interval '25 days', 'loved', 8.8, 'Candeli en La Latina es una joya escondida. La terraza en la plaza divina.', 'friends', '20-35'),
  ('c0000001-0002-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000009', now() - interval '28 days', 'loved', 9.1, 'Triciclo siempre acierta. El menú degustación vale cada euro.', 'friends', '35-60'),
  ('c0000001-0002-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000032', now() - interval '32 days', 'loved', 9.4, 'Álbora es alta cocina accesible. El arroz con carabineros espectacular.', 'friends', '60+'),

  -- ── User 3: Pablo Martínez (friend) — Carnívoro ──
  ('c0000001-0003-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000021', now() - interval '1 day',   'loved', 8.5, 'Goiko siempre consistente. La Kevin Bacon nunca falla.', 'friends', '20-35'),
  ('c0000001-0003-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000026', now() - interval '3 days',  'loved', 9.0, 'Five Guys cuando quieres una burger honesta sin tonterías. Perfecto.', 'friends', '20-35'),
  ('c0000001-0003-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000031', now() - interval '6 days',  'loved', 9.3, 'Smoked Room tiene la mejor brisket de Madrid. 14 horas de ahumado se notan.', 'friends', '35-60'),
  ('c0000001-0003-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000029', now() - interval '9 days',  'loved', 8.2, 'Hundred Burgers está subiendo el nivel. La smash burger buenísima.', 'friends', '0-20'),
  ('c0000001-0003-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000037', now() - interval '12 days', 'loved', 9.5, 'Rubaiyat es otro nivel. El chuletón de buey fue la mejor carne del año.', 'friends', '60+'),
  ('c0000001-0003-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000001', now() - interval '16 days', 'loved', 8.7, 'Casa Lucio y una buena botella de Ribera. Plan perfecto de domingo.', 'friends', '35-60'),
  ('c0000001-0003-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000016', now() - interval '19 days', 'loved', 8.8, 'La Tasquería dignifica la casquería. Los callos eran de otro planeta.', 'friends', '35-60'),
  ('c0000001-0003-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000008', now() - interval '22 days', 'fine',  7.5, 'El Paraguas correcto pero le falta alma. Demasiado formal para mi gusto.', 'friends', '60+'),
  ('c0000001-0003-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000023', now() - interval '26 days', 'fine',  7.0, 'Lateral está bien para quedar con muchos. Cocina correcta sin más.', 'friends', '20-35'),
  ('c0000001-0003-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000002', now() - interval '30 days', 'loved', 8.9, 'StreetXO es puro espectáculo. El bao de rabo de toro increíble.', 'friends', '35-60'),

  -- ── User 4: Lucía Fernández (friend) — Vegana ──
  ('c0000001-0004-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000022', now() - interval '2 days',  'loved', 9.1, 'Honest Greens es mi refugio. Todo fresco, todo rico. El sweet potato bowl top.', 'friends', '0-20'),
  ('c0000001-0004-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000030', now() - interval '5 days',  'loved', 9.4, 'Flax & Kale demuestra que vegano no es aburrido. Pizza de coliflor 10/10.', 'friends', '20-35'),
  ('c0000001-0004-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000011', now() - interval '9 days',  'fine',  7.8, 'Alimentación Quiroga tiene opciones veganas pero pocas.', 'friends', '20-35'),
  ('c0000001-0004-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000039', now() - interval '13 days', 'loved', 8.5, 'Quintín sorprende con sus opciones plant-based. La tostada de hummus top.', 'friends', '0-20'),
  ('c0000001-0004-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000014', now() - interval '16 days', 'fine',  7.0, 'Fismuler limitado para veganos. Solo ensalada y algún acompañamiento.', 'friends', '35-60'),
  ('c0000001-0004-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000010', now() - interval '20 days', 'loved', 8.3, 'La Carmencita tiene tortilla vegana y brunch adaptado. Me encanta.', 'friends', '20-35'),
  ('c0000001-0004-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000024', now() - interval '24 days', 'loved', 8.0, 'La pizza vegana de Grosso está sorprendentemente buena.', 'friends', '20-35'),
  ('c0000001-0004-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000020', now() - interval '27 days', 'loved', 8.7, 'Bacira adapta platos a vegano si pides. El curry de verduras top.', 'friends', '35-60'),
  ('c0000001-0004-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000038', now() - interval '30 days', 'fine',  7.5, 'Candeli tiene buenas ensaladas pero el menú vegano es limitado.', 'friends', '20-35'),
  ('c0000001-0004-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000005', now() - interval '35 days', 'loved', 8.9, 'Sala de Despiece tiene tapas veganas creativas que no esperaba. Bravo.', 'friends', '20-35'),

  -- ── User 5: Andrés Ruiz (friend) — Street food ──
  ('c0000001-0005-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000003', now() - interval '1 day',   'loved', 9.2, 'Punto MX sigue siendo el mejor mexicano de Madrid. Los tacos al pastor divinos.', 'friends', '35-60'),
  ('c0000001-0005-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000040', now() - interval '4 days',  'loved', 8.5, 'Tepic para tacos rápidos y buenos. El de cochinita pibil increíble.', 'friends', '20-35'),
  ('c0000001-0005-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000002', now() - interval '7 days',  'loved', 9.0, 'StreetXO es street food elevado. El concepto funciona perfectamente.', 'friends', '35-60'),
  ('c0000001-0005-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000029', now() - interval '11 days', 'loved', 8.3, 'Hundred Burgers para smash burgers casuales. Relación calidad-precio genial.', 'friends', '0-20'),
  ('c0000001-0005-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000021', now() - interval '14 days', 'fine',  7.8, 'Goiko bien pero empieza a ser caro para lo que es.', 'friends', '20-35'),
  ('c0000001-0005-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000019', now() - interval '18 days', 'loved', 8.6, 'Rosi La Loca tiene las mejores croquetas de La Latina.', 'friends', '0-20'),
  ('c0000001-0005-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000006', now() - interval '21 days', 'loved', 8.4, 'Taberna La Concha con sus tortillas y vermut. La Latina auténtica.', 'friends', '0-20'),
  ('c0000001-0005-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000028', now() - interval '25 days', 'loved', 8.1, 'La Monarracha fusión japón-españa que funciona. Los gyozas riquísimas.', 'friends', '20-35'),
  ('c0000001-0005-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000024', now() - interval '28 days', 'loved', 8.8, 'Grosso Napoletano es la mejor pizza napolitana de la zona. Masa perfecta.', 'friends', '20-35'),
  ('c0000001-0005-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000017', now() - interval '33 days', 'fine',  7.2, 'Taberna Pedraza correcta para tapas clásicas. Nada especial.', 'friends', '20-35'),

  -- ── User 6: Sofía Moreno (friend) — Italiana ──
  ('c0000001-0006-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000025', now() - interval '2 days',  'loved', 8.2, 'La Tagliatella para pasta rápida está bien. La carbonara aceptable.', 'friends', '20-35'),
  ('c0000001-0006-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000007', now() - interval '5 days',  'loved', 9.1, 'Numa Pompilio es mi italiano favorito. La pasta fresca hecha al momento.', 'friends', '20-35'),
  ('c0000001-0006-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000024', now() - interval '8 days',  'loved', 9.0, 'Grosso Napoletano tiene la masa más auténtica de Madrid. La margherita perfecta.', 'friends', '20-35'),
  ('c0000001-0006-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000009', now() - interval '12 days', 'loved', 8.6, 'Triciclo tiene platos con toques italianos muy bien ejecutados.', 'friends', '35-60'),
  ('c0000001-0006-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000032', now() - interval '15 days', 'loved', 9.3, 'Álbora tiene un risotto de boletus que es pura mantequilla. Top.', 'friends', '60+'),
  ('c0000001-0006-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000001', now() - interval '19 days', 'fine',  7.5, 'Casa Lucio no es italiano pero los huevos rotos compensan.', 'friends', '35-60'),
  ('c0000001-0006-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000014', now() - interval '22 days', 'loved', 8.4, 'Fismuler sorprende con la pasta del día. Cambia cada semana.', 'friends', '35-60'),
  ('c0000001-0006-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000033', now() - interval '26 days', 'loved', 8.8, 'Lakasa tiene un menú mediterráneo que roza lo italiano. Muy bueno.', 'friends', '35-60'),
  ('c0000001-0006-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000010', now() - interval '30 days', 'fine',  7.3, 'La Carmencita cena correcta pero no para repetir.', 'friends', '20-35'),
  ('c0000001-0006-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000018', now() - interval '35 days', 'loved', 8.5, 'Amazónico tiene cócteles increíbles. La comida acompaña bien.', 'friends', '60+'),

  -- ── User 7: Diego Navarro (friend) — Tradición ──
  ('c0000001-0007-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000001', now() - interval '3 days',  'loved', 9.5, 'Casa Lucio es sagrado. Huevos rotos con jamón: no hay nada mejor.', 'friends', '35-60'),
  ('c0000001-0007-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000036', now() - interval '6 days',  'loved', 9.0, 'El cocido de la Daniela merece patrimonio de la humanidad.', 'friends', '20-35'),
  ('c0000001-0007-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000016', now() - interval '9 days',  'loved', 8.8, 'La Tasquería es valentía culinaria. Casquería hecha arte.', 'friends', '35-60'),
  ('c0000001-0007-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000006', now() - interval '13 days', 'loved', 8.5, 'Taberna La Concha con una caña bien tirada. Esto es Madrid.', 'friends', '0-20'),
  ('c0000001-0007-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000019', now() - interval '17 days', 'loved', 8.3, 'Rosi La Loca: patatas bravas de las mejores de la zona.', 'friends', '0-20'),
  ('c0000001-0007-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000017', now() - interval '20 days', 'loved', 8.6, 'Taberna Pedraza me sorprendió. Las croquetas de jamón perfectas.', 'friends', '20-35'),
  ('c0000001-0007-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000004', now() - interval '24 days', 'loved', 9.2, 'La Barraca tiene el mejor arroz a banda de Madrid. Sin discusión.', 'friends', '35-60'),
  ('c0000001-0007-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000035', now() - interval '28 days', 'loved', 9.7, 'Santceloni es una experiencia religiosa. Cada plato es perfección.', 'friends', '60+'),
  ('c0000001-0007-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000023', now() - interval '32 days', 'fine',  7.0, 'Lateral para un afterwork rápido. Nada memorable pero cumple.', 'friends', '20-35'),
  ('c0000001-0007-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000012', now() - interval '36 days', 'loved', 9.8, 'Coque: dos estrellas Michelin bien merecidas. Impresionante de principio a fin.', 'friends', '60+'),

  -- ── User 8: Elena Romero (friend) — Wine lover ──
  ('c0000001-0008-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000032', now() - interval '1 day',   'loved', 9.4, 'Álbora tiene la mejor carta de vinos de Jorge Juan. El sommelier es genial.', 'friends', '60+'),
  ('c0000001-0008-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000008', now() - interval '4 days',  'loved', 8.9, 'El Paraguas con un buen Rioja reserva. Maridaje perfecto.', 'friends', '60+'),
  ('c0000001-0008-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000012', now() - interval '8 days',  'loved', 9.6, 'Coque tiene un maridaje de vinos que es un viaje. Cada copa cuenta una historia.', 'friends', '60+'),
  ('c0000001-0008-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000033', now() - interval '11 days', 'loved', 8.7, 'Lakasa con su selección de vinos naturales. Descubrí un Mencia brutal.', 'friends', '35-60'),
  ('c0000001-0008-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000009', now() - interval '15 days', 'loved', 8.5, 'Triciclo tiene una carta de vinos pequeña pero muy bien curada.', 'friends', '35-60'),
  ('c0000001-0008-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000005', now() - interval '19 days', 'loved', 8.8, 'Sala de Despiece con vermut de grifo. Una combinación ganadora.', 'friends', '20-35'),
  ('c0000001-0008-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000015', now() - interval '23 days', 'loved', 9.2, 'El Club Allard ya no es lo que era pero sigue teniendo momentos mágicos.', 'friends', '60+'),
  ('c0000001-0008-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000035', now() - interval '27 days', 'loved', 9.5, 'Santceloni con su menú de maridaje. 5 copas, 5 mundos diferentes.', 'friends', '60+'),
  ('c0000001-0008-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000001', now() - interval '31 days', 'loved', 8.3, 'Casa Lucio con un buen tinto de la casa. Lo clásico funciona.', 'friends', '35-60'),
  ('c0000001-0008-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000018', now() - interval '35 days', 'loved', 8.6, 'Amazónico tiene cócteles de autor que merecen mención aparte.', 'friends', '60+'),

  -- ── User 9: Javier Torres (friend) — Weekend foodie ──
  ('c0000001-0009-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000022', now() - interval '3 days',  'fine',  7.5, 'Honest Greens rápido y sano para la semana. No emociona pero cumple.', 'friends', '0-20'),
  ('c0000001-0009-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000021', now() - interval '6 days',  'fine',  7.8, 'Goiko para un viernes casual. La burger bien, las patatas mejorables.', 'friends', '20-35'),
  ('c0000001-0009-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000014', now() - interval '10 days', 'loved', 8.5, 'Fismuler sorprende siempre. Buen sitio para impresionar en una cita.', 'friends', '35-60'),
  ('c0000001-0009-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000003', now() - interval '14 days', 'loved', 8.9, 'Punto MX un sábado por la noche. Los margaritas son peligrosos de buenos.', 'friends', '35-60'),
  ('c0000001-0009-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000010', now() - interval '17 days', 'loved', 8.2, 'La Carmencita para brunch de domingo. Tortilla jugosa perfecta.', 'friends', '20-35'),
  ('c0000001-0009-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000024', now() - interval '21 days', 'loved', 8.0, 'Grosso un viernes. Pizza y birra. Simple y eficaz.', 'friends', '20-35'),
  ('c0000001-0009-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000011', now() - interval '25 days', 'fine',  6.8, 'Alimentación Quiroga tiene potencial pero el servicio fue lento.', 'friends', '20-35'),
  ('c0000001-0009-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000040', now() - interval '28 days', 'loved', 8.3, 'Tepic para unos tacos casuales. El guacamole recién hecho top.', 'friends', '20-35'),
  ('c0000001-0009-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000026', now() - interval '32 days', 'fine',  7.2, 'Five Guys cuando no quieres pensar. La burger cumple, nada más.', 'friends', '20-35'),
  ('c0000001-0009-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000019', now() - interval '36 days', 'loved', 8.4, 'Rosi La Loca es La Latina en estado puro. Patatas bravas top 5 Madrid.', 'friends', '0-20'),

  -- ── User 10: Carmen Díaz (friend) — Sweet tooth ──
  ('c0000001-0010-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000010', now() - interval '2 days',  'loved', 8.8, 'La Carmencita tiene el mejor cheesecake de la zona. Cremoso perfecto.', 'friends', '20-35'),
  ('c0000001-0010-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000039', now() - interval '5 days',  'loved', 8.5, 'Los pasteles de Quintín son obra de arte. El carrot cake es adictivo.', 'friends', '0-20'),
  ('c0000001-0010-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000012', now() - interval '9 days',  'loved', 9.5, 'Los postres de Coque merecen un capítulo aparte. Arte comestible.', 'friends', '60+'),
  ('c0000001-0010-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000009', now() - interval '12 days', 'loved', 8.7, 'El coulant de Triciclo es brutal. Se deshace en la boca.', 'friends', '35-60'),
  ('c0000001-0010-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000030', now() - interval '16 days', 'loved', 8.3, 'Flax & Kale tiene postres saludables que saben a pecado. Genial.', 'friends', '20-35'),
  ('c0000001-0010-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000007', now() - interval '19 days', 'loved', 9.0, 'El tiramisú de Numa Pompilio es el mejor que he probado fuera de Italia.', 'friends', '20-35'),
  ('c0000001-0010-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000032', now() - interval '23 days', 'loved', 9.2, 'Álbora: su tarta de chocolate fundente con helado de vainilla. Perfección.', 'friends', '60+'),
  ('c0000001-0010-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000022', now() - interval '26 days', 'fine',  7.0, 'Honest Greens los postres son flojos comparado con la comida.', 'friends', '0-20'),
  ('c0000001-0010-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000015', now() - interval '30 days', 'loved', 9.3, 'El Club Allard: su soufflé de chocolate es una experiencia sensorial.', 'friends', '60+'),
  ('c0000001-0010-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000018', now() - interval '34 days', 'loved', 8.6, 'Amazónico tiene un postre de coco y maracuyá que es tropical puro.', 'friends', '60+'),

  -- ── Users 11-20 (NOT friends — appear in global discovery) ──
  -- User 11
  ('c0000001-0011-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000001', now() - interval '2 days',  'loved', 8.5, 'Clásico que no falla.', 'friends', '35-60'),
  ('c0000001-0011-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000005', now() - interval '5 days',  'loved', 9.0, 'Tapas de nivel.', 'friends', '20-35'),
  ('c0000001-0011-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000014', now() - interval '8 days',  'loved', 8.7, 'Sorpresa total.', 'friends', '35-60'),
  ('c0000001-0011-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000021', now() - interval '11 days', 'fine',  7.5, 'Rico pero caro.', 'friends', '20-35'),
  ('c0000001-0011-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000024', now() - interval '14 days', 'loved', 8.8, 'Pizza perfecta.', 'friends', '20-35'),
  ('c0000001-0011-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000031', now() - interval '17 days', 'loved', 9.2, 'Brisket increíble.', 'friends', '35-60'),
  ('c0000001-0011-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000003', now() - interval '20 days', 'loved', 8.6, 'Tacos auténticos.', 'friends', '35-60'),
  ('c0000001-0011-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000018', now() - interval '23 days', 'loved', 8.9, 'Ambiente único.', 'friends', '60+'),
  ('c0000001-0011-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000010', now() - interval '26 days', 'fine',  7.2, 'Bien para brunch.', 'friends', '20-35'),
  ('c0000001-0011-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000040', now() - interval '30 days', 'loved', 8.3, 'Tacos ricos.', 'friends', '20-35'),

  -- Users 12-30: 10 visits each with shorter notes (bulk)
  -- User 12
  ('c0000001-0012-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000009', now() - interval '1 day', 'loved', 9.1, 'Menú degustación memorable.', 'friends', '35-60'),
  ('c0000001-0012-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000020', now() - interval '4 days', 'loved', 8.9, 'Fusión asiática top.', 'friends', '35-60'),
  ('c0000001-0012-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000034', now() - interval '7 days', 'loved', 8.7, 'Nikkei sorprendente.', 'friends', '35-60'),
  ('c0000001-0012-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000022', now() - interval '10 days', 'fine', 7.5, 'Correcto y rápido.', 'friends', '0-20'),
  ('c0000001-0012-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000001', now() - interval '13 days', 'loved', 8.8, 'Tradición madrileña.', 'friends', '35-60'),
  ('c0000001-0012-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000038', now() - interval '16 days', 'loved', 8.4, 'Terraza encantadora.', 'friends', '20-35'),
  ('c0000001-0012-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000027', now() - interval '19 days', 'loved', 8.6, 'Sushi fresco y bien hecho.', 'friends', '20-35'),
  ('c0000001-0012-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000015', now() - interval '22 days', 'loved', 9.3, 'Experiencia top.', 'friends', '60+'),
  ('c0000001-0012-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000007', now() - interval '25 days', 'loved', 8.5, 'Pasta fresca perfecta.', 'friends', '20-35'),
  ('c0000001-0012-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000031', now() - interval '28 days', 'loved', 9.0, 'BBQ auténtico americano.', 'friends', '35-60')
ON CONFLICT (id) DO NOTHING;

-- Users 13-30 — simplified bulk visits (2 per INSERT for readability)
DO $$
DECLARE
  users_offset INT;
  rest_ids UUID[] := ARRAY[
    'b0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000002','b0000001-0000-0000-0000-000000000003',
    'b0000001-0000-0000-0000-000000000004','b0000001-0000-0000-0000-000000000005','b0000001-0000-0000-0000-000000000006',
    'b0000001-0000-0000-0000-000000000007','b0000001-0000-0000-0000-000000000008','b0000001-0000-0000-0000-000000000009',
    'b0000001-0000-0000-0000-000000000010','b0000001-0000-0000-0000-000000000011','b0000001-0000-0000-0000-000000000012',
    'b0000001-0000-0000-0000-000000000013','b0000001-0000-0000-0000-000000000014','b0000001-0000-0000-0000-000000000015',
    'b0000001-0000-0000-0000-000000000016','b0000001-0000-0000-0000-000000000017','b0000001-0000-0000-0000-000000000018',
    'b0000001-0000-0000-0000-000000000019','b0000001-0000-0000-0000-000000000020','b0000001-0000-0000-0000-000000000021',
    'b0000001-0000-0000-0000-000000000022','b0000001-0000-0000-0000-000000000023','b0000001-0000-0000-0000-000000000024',
    'b0000001-0000-0000-0000-000000000025','b0000001-0000-0000-0000-000000000026','b0000001-0000-0000-0000-000000000027',
    'b0000001-0000-0000-0000-000000000028','b0000001-0000-0000-0000-000000000029','b0000001-0000-0000-0000-000000000030',
    'b0000001-0000-0000-0000-000000000031','b0000001-0000-0000-0000-000000000032','b0000001-0000-0000-0000-000000000033',
    'b0000001-0000-0000-0000-000000000034','b0000001-0000-0000-0000-000000000035','b0000001-0000-0000-0000-000000000036',
    'b0000001-0000-0000-0000-000000000037','b0000001-0000-0000-0000-000000000038','b0000001-0000-0000-0000-000000000039',
    'b0000001-0000-0000-0000-000000000040'
  ];
  sentiments TEXT[] := ARRAY['loved','loved','loved','loved','loved','loved','loved','fine','fine','disliked'];
  scores NUMERIC[] := ARRAY[9.2, 8.8, 8.5, 9.0, 7.8, 8.3, 7.5, 8.7, 9.1, 7.0];
  notes TEXT[] := ARRAY[
    'Muy recomendable, volveré seguro.',
    'Buena experiencia en general.',
    'El servicio excelente, la comida bien.',
    'Platos creativos y bien presentados.',
    'Correcto pero sin sorpresas.',
    'Ambiente genial para una cena.',
    'Esperaba más por el precio.',
    'Una de mis mejores cenas recientes.',
    'Todo perfecto de principio a fin.',
    'No repetiría, hay opciones mejores.'
  ];
  spends TEXT[] := ARRAY['0-20','20-35','20-35','35-60','35-60','20-35','60+','20-35','35-60','0-20'];
  u INT;
  v INT;
  uid UUID;
  rid UUID;
BEGIN
  FOR u IN 13..30 LOOP
    uid := ('a0000001-0000-0000-0000-0000000000' || lpad(u::text, 2, '0'))::UUID;
    FOR v IN 1..10 LOOP
      rid := rest_ids[((u * 7 + v * 3) % 40) + 1];  -- pseudo-random restaurant
      INSERT INTO public.visits (id, user_id, restaurant_id, visited_at, sentiment, rank_score, note, visibility, spend_per_person)
      VALUES (
        uuid_generate_v4(),
        uid,
        rid,
        now() - ((u + v * 3) || ' days')::interval,
        sentiments[(v % 10) + 1],
        scores[(v % 10) + 1],
        notes[(v % 10) + 1],
        'friends',
        spends[(v % 10) + 1]
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ── Step 6: Create dishes for ALL visits (2-4 dishes per visit) ────────────
DO $$
DECLARE
  v RECORD;
  dish_names TEXT[] := ARRAY[
    'Huevos rotos con jamón', 'Croquetas de jamón ibérico', 'Tortilla española', 'Patatas bravas',
    'Salmorejo cordobés', 'Pulpo a la gallega', 'Gambas al ajillo', 'Pimientos de padrón',
    'Tataki de atún', 'Sushi variado', 'Gyozas de pollo', 'Ramen tonkotsu',
    'Pizza margherita', 'Pasta carbonara', 'Risotto de setas', 'Tiramisú',
    'Tacos al pastor', 'Guacamole', 'Ceviche de lubina', 'Burrata con tomate',
    'Steak tartar', 'Chuletón de buey', 'Cochinillo asado', 'Arroz a banda',
    'Tarta de chocolate', 'Cheesecake', 'Crème brûlée', 'Coulant de chocolate',
    'Ensalada César', 'Hummus con pita', 'Bowl de salmón', 'Tostada de aguacate',
    'Bao de rabo de toro', 'Dim sum variado', 'Edamame', 'Tempura de verduras',
    'Carpaccio de ternera', 'Foie con reducción', 'Alcachofas fritas', 'Calamares a la romana'
  ];
  num_dishes INT;
  d INT;
  idx INT;
BEGIN
  FOR v IN (SELECT id FROM public.visits WHERE id LIKE 'c0000001-%' OR created_at > now() - interval '60 days') LOOP
    num_dishes := 2 + (floor(random() * 3))::int;  -- 2 to 4 dishes
    FOR d IN 1..num_dishes LOOP
      idx := (floor(random() * 40) + 1)::int;
      INSERT INTO public.visit_dishes (visit_id, name, position, highlighted)
      VALUES (v.id, dish_names[idx], d - 1, d = 1)  -- first dish is highlighted
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ── Step 7: Add some reactions to visits from friends ──────────────────────
DO $$
DECLARE
  mu UUID;
  v RECORD;
BEGIN
  SELECT val INTO mu FROM _seed_config WHERE key = 'main_user';

  -- Main user reacts to some friend visits
  FOR v IN (
    SELECT id FROM public.visits
    WHERE user_id IN (
      'a0000001-0000-0000-0000-000000000001',
      'a0000001-0000-0000-0000-000000000002',
      'a0000001-0000-0000-0000-000000000003'
    )
    AND id LIKE 'c0000001-%'
    LIMIT 8
  ) LOOP
    INSERT INTO public.reactions (visit_id, user_id, emoji)
    VALUES (v.id, mu, 'fire')
    ON CONFLICT (visit_id, user_id, emoji) DO NOTHING;
  END LOOP;

  -- Friends react to each other's visits
  INSERT INTO public.reactions (visit_id, user_id, emoji) VALUES
    ('c0000001-0001-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'hungry'),
    ('c0000001-0001-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000003', 'fire'),
    ('c0000001-0002-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'fire'),
    ('c0000001-0002-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000004', 'hungry'),
    ('c0000001-0003-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000005', 'fire'),
    ('c0000001-0003-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001', 'hungry'),
    ('c0000001-0004-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000002', 'fire'),
    ('c0000001-0005-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 'hungry'),
    ('c0000001-0006-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'fire'),
    ('c0000001-0007-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'hungry'),
    ('c0000001-0008-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000006', 'fire'),
    ('c0000001-0010-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000008', 'hungry')
  ON CONFLICT (visit_id, user_id, emoji) DO NOTHING;
END $$;

-- ── Step 8: Create "want to go" lists for some users ──────────────────────
DO $$
DECLARE
  mu UUID;
  list_id UUID;
BEGIN
  SELECT val INTO mu FROM _seed_config WHERE key = 'main_user';

  -- Main user's want list
  INSERT INTO public.lists (id, user_id, name, type) VALUES
    ('d0000001-0000-0000-0000-000000000001', mu, 'Quiero ir', 'want')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.list_items (list_id, restaurant_id) VALUES
    ('d0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000012'),
    ('d0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000035'),
    ('d0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000034'),
    ('d0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000020'),
    ('d0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000037')
  ON CONFLICT DO NOTHING;
END $$;

-- ── Step 9: Add visit photos (restaurant + dish photos) ───────────────────
INSERT INTO public.visit_photos (visit_id, photo_url, type) VALUES
  -- User 1 visits
  ('c0000001-0001-0000-0000-000000000001', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0001-0000-0000-000000000001', 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=800&h=800&fit=crop', 'dish'),
  ('c0000001-0001-0000-0000-000000000002', 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0001-0000-0000-000000000003', 'https://images.unsplash.com/photo-1562436260-ddc221b4ac82?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0001-0000-0000-000000000003', 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800&h=800&fit=crop', 'dish'),
  ('c0000001-0001-0000-0000-000000000005', 'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0001-0000-0000-000000000007', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0001-0000-0000-000000000009', 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=800&h=800&fit=crop', 'restaurant'),
  -- User 2 visits
  ('c0000001-0002-0000-0000-000000000001', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0002-0000-0000-000000000001', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=800&fit=crop', 'dish'),
  ('c0000001-0002-0000-0000-000000000002', 'https://images.unsplash.com/photo-1540914124281-342587941389?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0002-0000-0000-000000000003', 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0002-0000-0000-000000000005', 'https://images.unsplash.com/photo-1592861956120-e524fc739696?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0002-0000-0000-000000000005', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&h=800&fit=crop', 'dish'),
  ('c0000001-0002-0000-0000-000000000009', 'https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0002-0000-0000-000000000010', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=800&fit=crop', 'restaurant'),
  -- User 3 visits
  ('c0000001-0003-0000-0000-000000000001', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0003-0000-0000-000000000001', 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&h=800&fit=crop', 'dish'),
  ('c0000001-0003-0000-0000-000000000002', 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0003-0000-0000-000000000003', 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0003-0000-0000-000000000003', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=800&fit=crop', 'dish'),
  ('c0000001-0003-0000-0000-000000000005', 'https://images.unsplash.com/photo-1558030006-450675393462?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0003-0000-0000-000000000007', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=800&fit=crop', 'restaurant'),
  -- User 4 visits
  ('c0000001-0004-0000-0000-000000000001', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0004-0000-0000-000000000002', 'https://images.unsplash.com/photo-1540914124281-342587941389?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0004-0000-0000-000000000002', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=800&fit=crop', 'dish'),
  ('c0000001-0004-0000-0000-000000000008', 'https://images.unsplash.com/photo-1562436260-ddc221b4ac82?w=800&h=800&fit=crop', 'restaurant'),
  -- User 5 visits
  ('c0000001-0005-0000-0000-000000000001', 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0005-0000-0000-000000000001', 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&h=800&fit=crop', 'dish'),
  ('c0000001-0005-0000-0000-000000000003', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0005-0000-0000-000000000006', 'https://images.unsplash.com/photo-1485963631004-f2f00b1d6571?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0005-0000-0000-000000000009', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&h=800&fit=crop', 'restaurant'),
  -- User 6 visits
  ('c0000001-0006-0000-0000-000000000002', 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0006-0000-0000-000000000002', 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&h=800&fit=crop', 'dish'),
  ('c0000001-0006-0000-0000-000000000003', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0006-0000-0000-000000000005', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=800&fit=crop', 'restaurant'),
  -- User 7 visits
  ('c0000001-0007-0000-0000-000000000001', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0007-0000-0000-000000000001', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=800&fit=crop', 'dish'),
  ('c0000001-0007-0000-0000-000000000004', 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0007-0000-0000-000000000008', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0007-0000-0000-000000000010', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=800&fit=crop', 'restaurant'),
  -- User 8 visits
  ('c0000001-0008-0000-0000-000000000001', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0008-0000-0000-000000000003', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0008-0000-0000-000000000003', 'https://images.unsplash.com/photo-1560053608-13721e0d69e8?w=800&h=800&fit=crop', 'dish'),
  ('c0000001-0008-0000-0000-000000000008', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=800&fit=crop', 'restaurant'),
  -- User 9 visits
  ('c0000001-0009-0000-0000-000000000003', 'https://images.unsplash.com/photo-1592861956120-e524fc739696?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0009-0000-0000-000000000004', 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0009-0000-0000-000000000004', 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&h=800&fit=crop', 'dish'),
  ('c0000001-0009-0000-0000-000000000010', 'https://images.unsplash.com/photo-1485963631004-f2f00b1d6571?w=800&h=800&fit=crop', 'restaurant'),
  -- User 10 visits
  ('c0000001-0010-0000-0000-000000000001', 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0010-0000-0000-000000000003', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0010-0000-0000-000000000003', 'https://images.unsplash.com/photo-1560053608-13721e0d69e8?w=800&h=800&fit=crop', 'dish'),
  ('c0000001-0010-0000-0000-000000000006', 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0010-0000-0000-000000000007', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=800&fit=crop', 'restaurant'),
  ('c0000001-0010-0000-0000-000000000009', 'https://images.unsplash.com/photo-1560053608-13721e0d69e8?w=800&h=800&fit=crop', 'restaurant')
ON CONFLICT DO NOTHING;

-- ── Cleanup temp table ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS _seed_config;

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE! Summary:
-- • 30 users created (10 mutual friends of j14fernandez@gmail.com)
-- • 40 restaurants (20 independent Madrid + 10 chains + 10 more)
-- • 300+ visits with realistic notes, scores, sentiments
-- • 600-1200 dishes across all visits
-- • Reactions between friends
-- • "Want to go" list for main user
-- ═══════════════════════════════════════════════════════════════════════════
