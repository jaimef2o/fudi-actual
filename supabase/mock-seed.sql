-- ============================================================
-- fudi — Mock seed data
-- 10 fake users · 5 friends of j14fernandez@gmail.com · 10 visits each
-- Run in Supabase SQL Editor (service role)
-- ============================================================

-- Ensure spend_per_person column exists (added after initial schema)
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS spend_per_person TEXT
  CHECK (spend_per_person IN ('0-20','20-35','35-60','60+'));

DO $$
DECLARE
  jaime_id UUID;

  u1  UUID := 'a1000000-0000-0000-0000-000000000001';
  u2  UUID := 'a1000000-0000-0000-0000-000000000002';
  u3  UUID := 'a1000000-0000-0000-0000-000000000003';
  u4  UUID := 'a1000000-0000-0000-0000-000000000004';
  u5  UUID := 'a1000000-0000-0000-0000-000000000005';
  u6  UUID := 'a1000000-0000-0000-0000-000000000006';
  u7  UUID := 'a1000000-0000-0000-0000-000000000007';
  u8  UUID := 'a1000000-0000-0000-0000-000000000008';
  u9  UUID := 'a1000000-0000-0000-0000-000000000009';
  u10 UUID := 'a1000000-0000-0000-0000-000000000010';

  r1  UUID := 'b1000000-0000-0000-0000-000000000001';
  r2  UUID := 'b1000000-0000-0000-0000-000000000002';
  r3  UUID := 'b1000000-0000-0000-0000-000000000003';
  r4  UUID := 'b1000000-0000-0000-0000-000000000004';
  r5  UUID := 'b1000000-0000-0000-0000-000000000005';
  r6  UUID := 'b1000000-0000-0000-0000-000000000006';
  r7  UUID := 'b1000000-0000-0000-0000-000000000007';
  r8  UUID := 'b1000000-0000-0000-0000-000000000008';
  r9  UUID := 'b1000000-0000-0000-0000-000000000009';
  r10 UUID := 'b1000000-0000-0000-0000-000000000010';

  v UUID;

BEGIN

  -- ── 0. Find jaime's user id ──────────────────────────────────────────────
  SELECT id INTO jaime_id FROM auth.users WHERE email = 'j14fernandez@gmail.com' LIMIT 1;
  IF jaime_id IS NULL THEN
    RAISE EXCEPTION 'User j14fernandez@gmail.com not found in auth.users';
  END IF;

  -- ── 1. Create auth users ─────────────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    role, aud, raw_app_meta_data, raw_user_meta_data
  ) VALUES
    (u1,  '00000000-0000-0000-0000-000000000000', 'carlosgg@mock.fudi',     '', now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{"name":"Carlos García"}'),
    (u2,  '00000000-0000-0000-0000-000000000000', 'marinafood@mock.fudi',   '', now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{"name":"Marina Fdez"}'),
    (u3,  '00000000-0000-0000-0000-000000000000', 'pablorest@mock.fudi',    '', now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{"name":"Pablo Ramos"}'),
    (u4,  '00000000-0000-0000-0000-000000000000', 'luciagmt@mock.fudi',     '', now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{"name":"Lucía Moreno"}'),
    (u5,  '00000000-0000-0000-0000-000000000000', 'anaeats@mock.fudi',      '', now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{"name":"Ana Sánchez"}'),
    (u6,  '00000000-0000-0000-0000-000000000000', 'diegotastes@mock.fudi',  '', now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{"name":"Diego Torres"}'),
    (u7,  '00000000-0000-0000-0000-000000000000', 'sofiachef@mock.fudi',    '', now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{"name":"Sofía Vega"}'),
    (u8,  '00000000-0000-0000-0000-000000000000', 'javierf@mock.fudi',      '', now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{"name":"Javier Blanco"}'),
    (u9,  '00000000-0000-0000-0000-000000000000', 'elenadi@mock.fudi',      '', now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{"name":"Elena Cruz"}'),
    (u10, '00000000-0000-0000-0000-000000000000', 'mherrero@mock.fudi',     '', now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{"name":"Miguel Herrero"}')
  ON CONFLICT (id) DO NOTHING;

  -- ── 2. Update public.users (trigger may have created rows already) ────────
  -- If trigger didn't fire, insert directly
  INSERT INTO public.users (id, name) VALUES
    (u1, 'Carlos García'), (u2, 'Marina Fdez'), (u3, 'Pablo Ramos'),
    (u4, 'Lucía Moreno'),  (u5, 'Ana Sánchez'), (u6, 'Diego Torres'),
    (u7, 'Sofía Vega'),    (u8, 'Javier Blanco'), (u9, 'Elena Cruz'),
    (u10,'Miguel Herrero')
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.users SET handle='carlosgg',     name='Carlos García',    city='Madrid',     taste_profile='Gourmet Clásico'          WHERE id=u1;
  UPDATE public.users SET handle='marina_food',  name='Marina Fdez',      city='Madrid',     taste_profile='Exploradora Incansable'   WHERE id=u2;
  UPDATE public.users SET handle='pablorest',    name='Pablo Ramos',      city='Madrid',     taste_profile='Carnívoro Declarado'      WHERE id=u3;
  UPDATE public.users SET handle='lucia_gmt',    name='Lucía Moreno',     city='Madrid',     taste_profile='Crítica Gastronómica'     WHERE id=u4;
  UPDATE public.users SET handle='ana_eats',     name='Ana Sánchez',      city='Madrid',     taste_profile='Brunchera Empedernida'    WHERE id=u5;
  UPDATE public.users SET handle='diego_tastes', name='Diego Torres',     city='Barcelona',  taste_profile='Innovador Sin Frontera'   WHERE id=u6;
  UPDATE public.users SET handle='sofiachef',    name='Sofía Vega',       city='Madrid',     taste_profile='Chef Amateur Apasionada'  WHERE id=u7;
  UPDATE public.users SET handle='javier_f',     name='Javier Blanco',    city='Madrid',     taste_profile='Tabernero de Pro'         WHERE id=u8;
  UPDATE public.users SET handle='elenadi',      name='Elena Cruz',       city='Sevilla',    taste_profile='Viajera Gourmet'          WHERE id=u9;
  UPDATE public.users SET handle='mherrero',     name='Miguel Herrero',   city='Madrid',     taste_profile='Fiel a la Tradición'      WHERE id=u10;

  -- ── 3. Relationships — 5 mutual friends with jaime ───────────────────────
  INSERT INTO public.relationships (user_id, target_id, type, affinity_score) VALUES
    (jaime_id, u1, 'mutual', 87.5), (u1, jaime_id, 'mutual', 87.5),
    (jaime_id, u2, 'mutual', 92.0), (u2, jaime_id, 'mutual', 92.0),
    (jaime_id, u3, 'mutual', 78.0), (u3, jaime_id, 'mutual', 78.0),
    (jaime_id, u4, 'mutual', 83.5), (u4, jaime_id, 'mutual', 83.5),
    (jaime_id, u5, 'mutual', 70.0), (u5, jaime_id, 'mutual', 70.0)
  ON CONFLICT (user_id, target_id) DO NOTHING;

  -- ── 4. Restaurants ───────────────────────────────────────────────────────
  INSERT INTO public.restaurants (id, name, address, neighborhood, city, cuisine, price_level, cover_image_url) VALUES
    (r1,  'DiverXO',               'C. del Padre Damián, 23',    'Chamartín',   'Madrid', 'Vanguardia',        '€€€€', NULL),
    (r2,  'Casa Botín',            'C. Cuchilleros, 17',         'La Latina',   'Madrid', 'Española & Tapas',  '€€€',  NULL),
    (r3,  'StreetXO',              'P.º de la Castellana, 57',   'Almagro',     'Madrid', 'Asiática',          '€€€',  NULL),
    (r4,  'La Carmencita',         'C. de la Libertad, 16',      'Chueca',      'Madrid', 'Española & Tapas',  '€€',   NULL),
    (r5,  'Yakitoro by Chicote',   'C. de la Reina, 41',         'Chueca',      'Madrid', 'Asiática',          '€€',   NULL),
    (r6,  'El Club Allard',        'C. Ferraz, 2',               'Argüelles',   'Madrid', 'Vanguardia',        '€€€€', NULL),
    (r7,  'Café de Oriente',       'Pl. de Oriente, 2',          'La Latina',   'Madrid', 'Española & Tapas',  '€€€',  NULL),
    (r8,  'DANI Brasserie',        'Torre de Cristal, 29',       'Chamartín',   'Madrid', 'Española & Tapas',  '€€€€', NULL),
    (r9,  'Tripea',                'Mercado de Vallehermoso',    'Chamberí',    'Madrid', 'Latinoamericana',   '€€',   NULL),
    (r10, 'Grosso Napoletano',     'C. Alcalá, 21',              'Centro',      'Madrid', 'Italiana & Pizza',  '€€',   NULL)
  ON CONFLICT (id) DO NOTHING;

  -- ── 5. Visits — 10 per user ───────────────────────────────────────────────
  -- Each block inserts a visit + 3 dishes

  -- ─ CARLOS (@carlosgg) ───────────────────────────────────────────────────
  INSERT INTO public.visits (id,user_id,restaurant_id,visited_at,sentiment,rank_score,rank_position,note,visibility,spend_per_person) VALUES
    ('c1000001-0000-0000-0000-000000000001',u1,r1,now()-'180 days'::interval,'loved',9.2,1,'David Muñoz lo cambia todo. Un espectáculo que no olvidaré.','friends','60+'),
    ('c1000001-0000-0000-0000-000000000002',u1,r2,now()-'155 days'::interval,'loved',8.8,2,'El restaurante más antiguo del mundo sigue siendo una maravilla.','friends','35-60'),
    ('c1000001-0000-0000-0000-000000000003',u1,r3,now()-'130 days'::interval,'loved',8.5,3,'StreetXO es caos delicioso. No hay nada igual en Madrid.','friends','35-60'),
    ('c1000001-0000-0000-0000-000000000004',u1,r4,now()-'110 days'::interval,'loved',8.2,4,'La Carmencita tiene el alma de Madrid en cada tapa.','friends','20-35'),
    ('c1000001-0000-0000-0000-000000000005',u1,r5,now()-'90 days'::interval, 'loved',8.0,5,'Las yakitoris de Chicote son adictivas. Volvería cada semana.','friends','20-35'),
    ('c1000001-0000-0000-0000-000000000006',u1,r6,now()-'75 days'::interval, 'fine', 7.5,6,'Club Allard no decepciona, pero esperaba más sorpresa.','friends','60+'),
    ('c1000001-0000-0000-0000-000000000007',u1,r7,now()-'55 days'::interval, 'loved',7.8,7,'Las vistas al Palacio Real valen el precio. Cocina sólida.','friends','35-60'),
    ('c1000001-0000-0000-0000-000000000008',u1,r8,now()-'40 days'::interval, 'loved',8.3,8,'DANI es una brasserie de lujo que cumple con creces.','friends','60+'),
    ('c1000001-0000-0000-0000-000000000009',u1,r9,now()-'20 days'::interval, 'loved',8.6,9,'Tripea rompe todos los esquemas. Sabores de otro mundo.','friends','20-35'),
    ('c1000001-0000-0000-0000-000000000010',u1,r10,now()-'7 days'::interval, 'fine', 7.0,10,'La pizza estaba buena pero sin más. Quizás esperaba demasiado.','friends','20-35')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.visit_dishes (visit_id,name,highlighted,position) VALUES
    ('c1000001-0000-0000-0000-000000000001','Cochinillo XO glaseado',true,0),
    ('c1000001-0000-0000-0000-000000000001','Dumplings de foie con trufa',false,1),
    ('c1000001-0000-0000-0000-000000000001','Postre "Nuestros Quesos"',false,2),
    ('c1000001-0000-0000-0000-000000000002','Cochinillo asado al horno de leña',true,0),
    ('c1000001-0000-0000-0000-000000000002','Sopa de ajo castellana',false,1),
    ('c1000001-0000-0000-0000-000000000002','Cordero asado',false,2),
    ('c1000001-0000-0000-0000-000000000003','King Crab Bao',true,0),
    ('c1000001-0000-0000-0000-000000000003','Noodles de trufa negra',false,1),
    ('c1000001-0000-0000-0000-000000000004','Croquetas de jamón ibérico',true,0),
    ('c1000001-0000-0000-0000-000000000004','Tortilla de patatas al punto',false,1),
    ('c1000001-0000-0000-0000-000000000005','Yakitori de papada ibérica',true,0),
    ('c1000001-0000-0000-0000-000000000005','Yakitori de pollo con wasabi',false,1),
    ('c1000001-0000-0000-0000-000000000006','Menú degustación completo',true,0),
    ('c1000001-0000-0000-0000-000000000006','Ostra con granizado de limón',false,1),
    ('c1000001-0000-0000-0000-000000000007','Callos a la madrileña',true,0),
    ('c1000001-0000-0000-0000-000000000007','Cocido madrileño',false,1),
    ('c1000001-0000-0000-0000-000000000008','Steak tartar',true,0),
    ('c1000001-0000-0000-0000-000000000008','Foie mi-cuit',false,1),
    ('c1000001-0000-0000-0000-000000000009','Ceviche de lubina',true,0),
    ('c1000001-0000-0000-0000-000000000009','Taco de cochinita pibil',false,1),
    ('c1000001-0000-0000-0000-000000000010','Pizza Margherita con búfala',true,0),
    ('c1000001-0000-0000-0000-000000000010','Burrata con tomate seco',false,1)
  ON CONFLICT (id) DO NOTHING;

  -- ─ MARINA (@marina_food) ────────────────────────────────────────────────
  INSERT INTO public.visits (id,user_id,restaurant_id,visited_at,sentiment,rank_score,rank_position,note,visibility,spend_per_person) VALUES
    ('c2000001-0000-0000-0000-000000000001',u2,r9,now()-'170 days'::interval,'loved',9.0,1,'Tripea es mi secreto mejor guardado de Madrid. Pura emoción.','friends','20-35'),
    ('c2000001-0000-0000-0000-000000000002',u2,r1,now()-'150 days'::interval,'loved',9.3,2,'DiverXO te sacude. Sales diferente de como entras.','friends','60+'),
    ('c2000001-0000-0000-0000-000000000003',u2,r4,now()-'125 days'::interval,'loved',8.4,3,'La Carmencita tiene una magia especial. Un clásico de Chueca.','friends','20-35'),
    ('c2000001-0000-0000-0000-000000000004',u2,r10,now()-'105 days'::interval,'loved',8.1,4,'La pizza de Grosso es de las mejores de Madrid. Sin duda.','friends','20-35'),
    ('c2000001-0000-0000-0000-000000000005',u2,r5,now()-'85 days'::interval, 'loved',8.3,5,'Yakitoro tiene energía y sabor. La terraza en verano, imprescindible.','friends','20-35'),
    ('c2000001-0000-0000-0000-000000000006',u2,r2,now()-'65 days'::interval, 'loved',8.7,6,'Casa Botín es historia viva. El cochinillo es religioso.','friends','35-60'),
    ('c2000001-0000-0000-0000-000000000007',u2,r3,now()-'50 days'::interval, 'fine', 7.3,7,'StreetXO tiene momentos brillantes pero también irregularidades.','friends','35-60'),
    ('c2000001-0000-0000-0000-000000000008',u2,r7,now()-'35 days'::interval, 'loved',7.9,8,'Café de Oriente para una noche especial con vistas únicas.','friends','35-60'),
    ('c2000001-0000-0000-0000-000000000009',u2,r6,now()-'18 days'::interval, 'loved',8.5,9,'El Club Allard está en forma. Menú de temporada espectacular.','friends','60+'),
    ('c2000001-0000-0000-0000-000000000010',u2,r8,now()-'5 days'::interval,  'fine', 7.6,10,'DANI es correcto pero no emociona como debería a ese precio.','friends','60+')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.visit_dishes (visit_id,name,highlighted,position) VALUES
    ('c2000001-0000-0000-0000-000000000001','Arepa de rabo de toro',true,0),
    ('c2000001-0000-0000-0000-000000000001','Tiradito de corvina',false,1),
    ('c2000001-0000-0000-0000-000000000002','Calamar con tamarindo y coco',true,0),
    ('c2000001-0000-0000-0000-000000000002','Langostino XO a la brasa',false,1),
    ('c2000001-0000-0000-0000-000000000003','Croquetas de boletus',true,0),
    ('c2000001-0000-0000-0000-000000000003','Patatas bravas con alioli',false,1),
    ('c2000001-0000-0000-0000-000000000004','Pizza con nduja y stracciatella',true,0),
    ('c2000001-0000-0000-0000-000000000004','Foccacia al rosmarino',false,1),
    ('c2000001-0000-0000-0000-000000000005','Yakitori de ternera con sichimi',true,0),
    ('c2000001-0000-0000-0000-000000000005','Onigiri de salmón',false,1),
    ('c2000001-0000-0000-0000-000000000006','Menú botín completo',true,0),
    ('c2000001-0000-0000-0000-000000000006','Entrecot a la castellana',false,1),
    ('c2000001-0000-0000-0000-000000000007','Dumplings de vieira y cebollino',true,0),
    ('c2000001-0000-0000-0000-000000000007','Curry de cigalas con leche de coco',false,1),
    ('c2000001-0000-0000-0000-000000000008','Ostra con champagne y caviar',true,0),
    ('c2000001-0000-0000-0000-000000000008','Costilla de vaca rubia gallega',false,1),
    ('c2000001-0000-0000-0000-000000000009','Bacalao al pil-pil con cítricos',true,0),
    ('c2000001-0000-0000-0000-000000000009','Crema catalana flambeada',false,1),
    ('c2000001-0000-0000-0000-000000000010','Solomillo Wellington',true,0),
    ('c2000001-0000-0000-0000-000000000010','Ensalada César de bogavante',false,1)
  ON CONFLICT (id) DO NOTHING;

  -- ─ PABLO (@pablorest) ────────────────────────────────────────────────────
  INSERT INTO public.visits (id,user_id,restaurant_id,visited_at,sentiment,rank_score,rank_position,note,visibility,spend_per_person) VALUES
    ('c3000001-0000-0000-0000-000000000001',u3,r2,now()-'175 days'::interval,'loved',9.1,1,'Botín es un templo. El cochinillo asado: perfección absoluta.','friends','35-60'),
    ('c3000001-0000-0000-0000-000000000002',u3,r8,now()-'152 days'::interval,'loved',8.9,2,'DANI tiene la mejor chuleta de Madrid. Sin discusión posible.','friends','60+'),
    ('c3000001-0000-0000-0000-000000000003',u3,r1,now()-'130 days'::interval,'loved',9.4,3,'DiverXO te hace entender por qué la cocina puede ser arte.','friends','60+'),
    ('c3000001-0000-0000-0000-000000000004',u3,r7,now()-'110 days'::interval,'loved',8.0,4,'Café de Oriente, atmósfera única y cocina a la altura.','friends','35-60'),
    ('c3000001-0000-0000-0000-000000000005',u3,r6,now()-'88 days'::interval, 'fine', 7.7,5,'Club Allard es sólido pero ya no me sorprende como antes.','friends','60+'),
    ('c3000001-0000-0000-0000-000000000006',u3,r5,now()-'70 days'::interval, 'loved',7.9,6,'Yakitoro es un plan perfecto para una noche informal con amigos.','friends','20-35'),
    ('c3000001-0000-0000-0000-000000000007',u3,r4,now()-'52 days'::interval, 'loved',8.2,7,'La Carmencita siempre está ahí. El gazpacho en verano es top.','friends','20-35'),
    ('c3000001-0000-0000-0000-000000000008',u3,r3,now()-'38 days'::interval, 'loved',8.6,8,'StreetXO es adrenalina gastronómica. Me encanta el caos.','friends','35-60'),
    ('c3000001-0000-0000-0000-000000000009',u3,r10,now()-'22 days'::interval,'loved',7.8,9,'Grosso tiene la mejor masa de pizza de Madrid. Punto.','friends','20-35'),
    ('c3000001-0000-0000-0000-000000000010',u3,r9,now()-'9 days'::interval,  'loved',8.4,10,'Tripea me ha abierto los ojos a la cocina latinoamericana.','friends','20-35')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.visit_dishes (visit_id,name,highlighted,position) VALUES
    ('c3000001-0000-0000-0000-000000000001','Cochinillo asado entero',true,0),
    ('c3000001-0000-0000-0000-000000000001','Cordero lechal',false,1),
    ('c3000001-0000-0000-0000-000000000002','Chuleta de buey madurada 40 días',true,0),
    ('c3000001-0000-0000-0000-000000000002','Patatas revolconas',false,1),
    ('c3000001-0000-0000-0000-000000000003','Menú XO Experience',true,0),
    ('c3000001-0000-0000-0000-000000000003','Erizo con pilpil y trufa',false,1),
    ('c3000001-0000-0000-0000-000000000004','Callos a la madrileña trufados',true,0),
    ('c3000001-0000-0000-0000-000000000004','Croquetas líquidas de jamón',false,1),
    ('c3000001-0000-0000-0000-000000000005','Bacalao negro con miso',true,0),
    ('c3000001-0000-0000-0000-000000000005','Tartar de atún con aguacate',false,1),
    ('c3000001-0000-0000-0000-000000000006','Yakitori de espárragos con yema',true,0),
    ('c3000001-0000-0000-0000-000000000006','Edamame con mantequilla de trufa',false,1),
    ('c3000001-0000-0000-0000-000000000007','Bravas de La Carmencita',true,0),
    ('c3000001-0000-0000-0000-000000000007','Boquerones en vinagre casero',false,1),
    ('c3000001-0000-0000-0000-000000000008','Pato Pekín StreetXO',true,0),
    ('c3000001-0000-0000-0000-000000000008','Noodles picantes con cerdo',false,1),
    ('c3000001-0000-0000-0000-000000000009','Pizza con trufa y stracciatella',true,0),
    ('c3000001-0000-0000-0000-000000000009','Tiramisu della nonna',false,1),
    ('c3000001-0000-0000-0000-000000000010','Ceviche de corvina',true,0),
    ('c3000001-0000-0000-0000-000000000010','Chicharrón con ají amarillo',false,1)
  ON CONFLICT (id) DO NOTHING;

  -- ─ LUCÍA (@lucia_gmt) ────────────────────────────────────────────────────
  INSERT INTO public.visits (id,user_id,restaurant_id,visited_at,sentiment,rank_score,rank_position,note,visibility,spend_per_person) VALUES
    ('c4000001-0000-0000-0000-000000000001',u4,r6,now()-'172 days'::interval,'loved',9.3,1,'El Club Allard es la cena perfecta para una ocasión especial.','friends','60+'),
    ('c4000001-0000-0000-0000-000000000002',u4,r1,now()-'148 days'::interval,'loved',9.5,2,'DiverXO es el mejor restaurante de España. Lo he probado todo.','friends','60+'),
    ('c4000001-0000-0000-0000-000000000003',u4,r9,now()-'128 days'::interval,'loved',8.7,3,'Tripea cambia el juego. Cocina de fusión con alma propia.','friends','20-35'),
    ('c4000001-0000-0000-0000-000000000004',u4,r4,now()-'105 days'::interval,'loved',8.3,4,'La Carmencita es el sitio que llevas a tus padres y triunfas.','friends','20-35'),
    ('c4000001-0000-0000-0000-000000000005',u4,r2,now()-'85 days'::interval, 'loved',8.8,5,'Casa Botín me enamora cada vez más. Historia y sabor únicos.','friends','35-60'),
    ('c4000001-0000-0000-0000-000000000006',u4,r3,now()-'67 days'::interval, 'loved',8.4,6,'StreetXO es irreverente y delicioso. David en estado puro.','friends','35-60'),
    ('c4000001-0000-0000-0000-000000000007',u4,r8,now()-'50 days'::interval, 'fine', 7.4,7,'DANI es correcto pero para ese precio espero más emoción.','friends','60+'),
    ('c4000001-0000-0000-0000-000000000008',u4,r5,now()-'35 days'::interval, 'loved',8.0,8,'Yakitoro sorprende. Informal pero con mucho nivel.','friends','20-35'),
    ('c4000001-0000-0000-0000-000000000009',u4,r10,now()-'18 days'::interval,'loved',8.2,9,'Grosso es mi pizza de guardia en Madrid. Siempre cumple.','friends','20-35'),
    ('c4000001-0000-0000-0000-000000000010',u4,r7,now()-'6 days'::interval,  'loved',7.7,10,'Café de Oriente: vista inmejorable, cocina sólida.','friends','35-60')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.visit_dishes (visit_id,name,highlighted,position) VALUES
    ('c4000001-0000-0000-0000-000000000001','Menú degustación Allard',true,0),
    ('c4000001-0000-0000-0000-000000000001','Homenaje al arroz con leche',false,1),
    ('c4000001-0000-0000-0000-000000000002','Wagyu con kimchi y daikon',true,0),
    ('c4000001-0000-0000-0000-000000000002','Bogavante a la brasa con XO',false,1),
    ('c4000001-0000-0000-0000-000000000003','Lomo saltado de wagyu',true,0),
    ('c4000001-0000-0000-0000-000000000003','Anticucho de corazón',false,1),
    ('c4000001-0000-0000-0000-000000000004','Ensaladilla rusa casera',true,0),
    ('c4000001-0000-0000-0000-000000000004','Callos con chorizo',false,1),
    ('c4000001-0000-0000-0000-000000000005','Cochinillo de leche asado',true,0),
    ('c4000001-0000-0000-0000-000000000005','Judiones de La Granja',false,1),
    ('c4000001-0000-0000-0000-000000000006','Taco coreano de pato lacado',true,0),
    ('c4000001-0000-0000-0000-000000000006','Gyoza frita de rabo de toro',false,1),
    ('c4000001-0000-0000-0000-000000000007','Ensalada de bogavante',true,0),
    ('c4000001-0000-0000-0000-000000000007','Rodaballo al horno',false,1),
    ('c4000001-0000-0000-0000-000000000008','Yakitori de panceta ibérica',true,0),
    ('c4000001-0000-0000-0000-000000000008','Ramen con dashi de pollo',false,1),
    ('c4000001-0000-0000-0000-000000000009','Pizza bianca con ricotta',true,0),
    ('c4000001-0000-0000-0000-000000000009','Cacio e pepe de espaguetti',false,1),
    ('c4000001-0000-0000-0000-000000000010','Gazpacho manchego',true,0),
    ('c4000001-0000-0000-0000-000000000010','Lomo de merluza al vapor',false,1)
  ON CONFLICT (id) DO NOTHING;

  -- ─ ANA (@ana_eats) ───────────────────────────────────────────────────────
  INSERT INTO public.visits (id,user_id,restaurant_id,visited_at,sentiment,rank_score,rank_position,note,visibility,spend_per_person) VALUES
    ('c5000001-0000-0000-0000-000000000001',u5,r10,now()-'165 days'::interval,'loved',8.9,1,'Grosso es amor a primera vista. La pizza más honesta de Madrid.','friends','20-35'),
    ('c5000001-0000-0000-0000-000000000002',u5,r5,now()-'142 days'::interval,'loved',8.5,2,'Yakitoro me ha robado el corazón. El ambiente lo da todo.','friends','20-35'),
    ('c5000001-0000-0000-0000-000000000003',u5,r4,now()-'122 days'::interval,'loved',8.7,3,'La Carmencita es mi brunch favorito de Chueca sin duda.','friends','20-35'),
    ('c5000001-0000-0000-0000-000000000004',u5,r9,now()-'100 days'::interval,'loved',9.1,4,'Tripea es la mejor sorpresa gastronómica que me he llevado.','friends','20-35'),
    ('c5000001-0000-0000-0000-000000000005',u5,r3,now()-'82 days'::interval, 'fine', 7.5,5,'StreetXO es interesante pero el ruido no me deja disfrutar.','friends','35-60'),
    ('c5000001-0000-0000-0000-000000000006',u5,r2,now()-'60 days'::interval, 'loved',8.4,6,'Casa Botín para los turistas... y también para nosotros.','friends','35-60'),
    ('c5000001-0000-0000-0000-000000000007',u5,r7,now()-'45 days'::interval, 'loved',8.1,7,'Café de Oriente para fecha especial. Las vistas no tienen precio.','friends','35-60'),
    ('c5000001-0000-0000-0000-000000000008',u5,r8,now()-'28 days'::interval, 'loved',8.6,8,'DANI Brasserie es Madrid en estado puro. Lujo accesible.','friends','60+'),
    ('c5000001-0000-0000-0000-000000000009',u5,r1,now()-'14 days'::interval, 'loved',9.4,9,'DiverXO cambia tu percepción de lo que puede ser un restaurante.','friends','60+'),
    ('c5000001-0000-0000-0000-000000000010',u5,r6,now()-'3 days'::interval,  'loved',8.8,10,'Club Allard sorprendió gratamente. El menú de otoño es una obra.','friends','60+')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.visit_dishes (visit_id,name,highlighted,position) VALUES
    ('c5000001-0000-0000-0000-000000000001','Pizza marinara con anchoas',true,0),
    ('c5000001-0000-0000-0000-000000000001','Negroni de aperitivo',false,1),
    ('c5000001-0000-0000-0000-000000000002','Yakitori de codorniz con miso',true,0),
    ('c5000001-0000-0000-0000-000000000002','Tataki de atún',false,1),
    ('c5000001-0000-0000-0000-000000000003','Huevos rotos con jamón',true,0),
    ('c5000001-0000-0000-0000-000000000003','Croquetas de pollo asado',false,1),
    ('c5000001-0000-0000-0000-000000000004','Causa limeña de langostinos',true,0),
    ('c5000001-0000-0000-0000-000000000004','Chaufa de pato y setas',false,1),
    ('c5000001-0000-0000-0000-000000000005','Cangrejo de caparazón blando',true,0),
    ('c5000001-0000-0000-0000-000000000005','Fried rice de gambas',false,1),
    ('c5000001-0000-0000-0000-000000000006','Sopa castellana con huevo',true,0),
    ('c5000001-0000-0000-0000-000000000006','Tostada de manteca colorá',false,1),
    ('c5000001-0000-0000-0000-000000000007','Merluza en salsa verde',true,0),
    ('c5000001-0000-0000-0000-000000000007','Crema de espárragos trigueros',false,1),
    ('c5000001-0000-0000-0000-000000000008','Steak tartar con mostaza Dijon',true,0),
    ('c5000001-0000-0000-0000-000000000008','Crème brûlée de vainilla bourbon',false,1),
    ('c5000001-0000-0000-0000-000000000009','Bloody Mary XO con gambas',true,0),
    ('c5000001-0000-0000-0000-000000000009','Costilla de cochinillo lacada',false,1),
    ('c5000001-0000-0000-0000-000000000010','Lubina en costra de sal',true,0),
    ('c5000001-0000-0000-0000-000000000010','Coulant de chocolate 70%',false,1)
  ON CONFLICT (id) DO NOTHING;

  -- ─ DIEGO (@diego_tastes) — NOT a friend ─────────────────────────────────
  INSERT INTO public.visits (id,user_id,restaurant_id,visited_at,sentiment,rank_score,rank_position,note,visibility,spend_per_person) VALUES
    ('c6000001-0000-0000-0000-000000000001',u6,r1,now()-'168 days'::interval,'loved',9.5,1,'DiverXO desde Barcelona: el viaje merece cada euro.','friends','60+'),
    ('c6000001-0000-0000-0000-000000000002',u6,r3,now()-'145 days'::interval,'loved',8.8,2,'StreetXO me recuerda a elBulli pero en formato urbano.','friends','35-60'),
    ('c6000001-0000-0000-0000-000000000003',u6,r9,now()-'123 days'::interval,'loved',8.6,3,'Tripea es lo que pasa cuando la creatividad toca un mercado.','friends','20-35'),
    ('c6000001-0000-0000-0000-000000000004',u6,r6,now()-'102 days'::interval,'fine', 7.8,4,'Club Allard: técnica impecable pero falta chispa.','friends','60+'),
    ('c6000001-0000-0000-0000-000000000005',u6,r2,now()-'83 days'::interval, 'loved',8.5,5,'Casa Botín: un must que se mantiene vivo y relevante.','friends','35-60'),
    ('c6000001-0000-0000-0000-000000000006',u6,r8,now()-'63 days'::interval, 'fine', 7.5,6,'DANI es brasserie de lujo previsible. Correcto sin más.','friends','60+'),
    ('c6000001-0000-0000-0000-000000000007',u6,r4,now()-'48 days'::interval, 'loved',8.3,7,'La Carmencita es lo que los barceloneses buscan en Madrid.','friends','20-35'),
    ('c6000001-0000-0000-0000-000000000008',u6,r5,now()-'30 days'::interval, 'loved',8.1,8,'Yakitoro: técnica japonesa, producto español. Genial.','friends','20-35'),
    ('c6000001-0000-0000-0000-000000000009',u6,r10,now()-'15 days'::interval,'loved',7.9,9,'Grosso sabe lo que es y lo hace bien. Sin pretensiones.','friends','20-35'),
    ('c6000001-0000-0000-0000-000000000010',u6,r7,now()-'4 days'::interval,  'fine', 7.2,10,'Café de Oriente vive de su terraza más que de su carta.','friends','35-60')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.visit_dishes (visit_id,name,highlighted,position) VALUES
    ('c6000001-0000-0000-0000-000000000001','Ostra con gazpacho de manzana verde',true,0),
    ('c6000001-0000-0000-0000-000000000001','Paloma con cacao y remolacha',false,1),
    ('c6000001-0000-0000-0000-000000000002','Banh mi de ternera y foie',true,0),
    ('c6000001-0000-0000-0000-000000000002','Dumpling de bogavante y jengibre',false,1),
    ('c6000001-0000-0000-0000-000000000003','Corvina a la plancha con ají panka',true,0),
    ('c6000001-0000-0000-0000-000000000003','Yuca frita con salsa criolla',false,1),
    ('c6000001-0000-0000-0000-000000000004','Vieira con coliflor y caviar',true,0),
    ('c6000001-0000-0000-0000-000000000004','Pichón royal con puré trufado',false,1),
    ('c6000001-0000-0000-0000-000000000005','Solomillo ibérico asado',true,0),
    ('c6000001-0000-0000-0000-000000000005','Alubias de Tolosa con sacramentos',false,1),
    ('c6000001-0000-0000-0000-000000000006','Risotto de trufa negra',true,0),
    ('c6000001-0000-0000-0000-000000000006','Tarta tatín de pera',false,1),
    ('c6000001-0000-0000-0000-000000000007','Pimientos del padrón con sal gorda',true,0),
    ('c6000001-0000-0000-0000-000000000007','Tortilla de camarones',false,1),
    ('c6000001-0000-0000-0000-000000000008','Yakitori de setas silvestres',true,0),
    ('c6000001-0000-0000-0000-000000000008','Mochi de matcha y yuzu',false,1),
    ('c6000001-0000-0000-0000-000000000009','Pizza con sobrasada y miel',true,0),
    ('c6000001-0000-0000-0000-000000000009','Panna cotta de vainilla',false,1),
    ('c6000001-0000-0000-0000-000000000010','Lubina al horno con patatas panadera',true,0),
    ('c6000001-0000-0000-0000-000000000010','Sopa de cebolla gratinada',false,1)
  ON CONFLICT (id) DO NOTHING;

  -- ─ SOFÍA (@sofiachef) ────────────────────────────────────────────────────
  INSERT INTO public.visits (id,user_id,restaurant_id,visited_at,sentiment,rank_score,rank_position,note,visibility,spend_per_person) VALUES
    ('c7000001-0000-0000-0000-000000000001',u7,r4,now()-'160 days'::interval,'loved',9.0,1,'La Carmencita tiene lo que busco: producto, receta y cariño.','friends','20-35'),
    ('c7000001-0000-0000-0000-000000000002',u7,r10,now()-'138 days'::interval,'loved',8.7,2,'Grosso: cuando la pizza italiana llega a Madrid y lo clava.','friends','20-35'),
    ('c7000001-0000-0000-0000-000000000003',u7,r9,now()-'118 days'::interval,'loved',8.9,3,'Tripea me demostró que la cocina latinoamericana es alta cocina.','friends','20-35'),
    ('c7000001-0000-0000-0000-000000000004',u7,r5,now()-'96 days'::interval, 'loved',8.4,4,'Yakitoro: el yakitori como arte. Madrid necesita más de esto.','friends','20-35'),
    ('c7000001-0000-0000-0000-000000000005',u7,r2,now()-'78 days'::interval, 'loved',8.6,5,'Casa Botín sigue siendo el mejor asado de la capital.','friends','35-60'),
    ('c7000001-0000-0000-0000-000000000006',u7,r7,now()-'60 days'::interval, 'fine', 7.3,6,'Café de Oriente te cobra las vistas. La cocina es discreta.','friends','35-60'),
    ('c7000001-0000-0000-0000-000000000007',u7,r3,now()-'44 days'::interval, 'loved',8.5,7,'StreetXO: no apto para los que buscan tranquilidad, pero sí sabor.','friends','35-60'),
    ('c7000001-0000-0000-0000-000000000008',u7,r8,now()-'27 days'::interval, 'loved',8.3,8,'DANI Brasserie: el mejor producto de temporada en Madrid.','friends','60+'),
    ('c7000001-0000-0000-0000-000000000009',u7,r6,now()-'13 days'::interval, 'loved',8.8,9,'Club Allard me ha reconciliado con la alta cocina clásica.','friends','60+'),
    ('c7000001-0000-0000-0000-000000000010',u7,r1,now()-'2 days'::interval,  'loved',9.3,10,'DiverXO: te hace llorar de felicidad. El mejor de España.','friends','60+')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.visit_dishes (visit_id,name,highlighted,position) VALUES
    ('c7000001-0000-0000-0000-000000000001','Salmorejo con crujiente de ibérico',true,0),
    ('c7000001-0000-0000-0000-000000000001','Chistorra a la sidra',false,1),
    ('c7000001-0000-0000-0000-000000000002','Pizza quattro formaggi con trufa',true,0),
    ('c7000001-0000-0000-0000-000000000002','Bruschetta de tomate seco y orégano',false,1),
    ('c7000001-0000-0000-0000-000000000003','Seco de cordero al estilo limeño',true,0),
    ('c7000001-0000-0000-0000-000000000003','Tostada de palta con quinoa',false,1),
    ('c7000001-0000-0000-0000-000000000004','Yakitori de gamba blanca al ajillo',true,0),
    ('c7000001-0000-0000-0000-000000000004','Gyoza de cerdo y setas',false,1),
    ('c7000001-0000-0000-0000-000000000005','Lechazo castellano al horno de leña',true,0),
    ('c7000001-0000-0000-0000-000000000005','Tarta de almendra de Botín',false,1),
    ('c7000001-0000-0000-0000-000000000006','Arroz meloso de setas y trufa',true,0),
    ('c7000001-0000-0000-0000-000000000006','Brandada de bacalao',false,1),
    ('c7000001-0000-0000-0000-000000000007','Bao de carrillada con kimchi',true,0),
    ('c7000001-0000-0000-0000-000000000007','Pad thai con gambas y tofu',false,1),
    ('c7000001-0000-0000-0000-000000000008','Salmonete con hinojo y azafrán',true,0),
    ('c7000001-0000-0000-0000-000000000008','Queso manchego curado con membrillo',false,1),
    ('c7000001-0000-0000-0000-000000000009','Rôti de ternera con salsa bordelesa',true,0),
    ('c7000001-0000-0000-0000-000000000009','Soufflé de Grand Marnier',false,1),
    ('c7000001-0000-0000-0000-000000000010','Caviar con nata agria y blini',true,0),
    ('c7000001-0000-0000-0000-000000000010','Lenguado meunière con alcaparras',false,1)
  ON CONFLICT (id) DO NOTHING;

  -- ─ JAVIER (@javier_f) ────────────────────────────────────────────────────
  INSERT INTO public.visits (id,user_id,restaurant_id,visited_at,sentiment,rank_score,rank_position,note,visibility,spend_per_person) VALUES
    ('c8000001-0000-0000-0000-000000000001',u8,r2,now()-'173 days'::interval,'loved',9.0,1,'Botín es mi catedral. Nada como el cochinillo y un Ribera.','friends','35-60'),
    ('c8000001-0000-0000-0000-000000000002',u8,r7,now()-'151 days'::interval,'loved',8.5,2,'Café de Oriente: le regalo estas vistas a mi madre cada año.','friends','35-60'),
    ('c8000001-0000-0000-0000-000000000003',u8,r4,now()-'129 days'::interval,'loved',8.8,3,'La Carmencita tiene los mejores callos de Madrid. Lo juro.','friends','20-35'),
    ('c8000001-0000-0000-0000-000000000004',u8,r8,now()-'108 days'::interval,'fine', 7.6,4,'DANI: bien, pero para ese precio quiero más magia.','friends','60+'),
    ('c8000001-0000-0000-0000-000000000005',u8,r5,now()-'87 days'::interval, 'loved',8.2,5,'Yakitoro: plan perfecto para cualquier noche. Repito siempre.','friends','20-35'),
    ('c8000001-0000-0000-0000-000000000006',u8,r9,now()-'67 days'::interval, 'loved',8.7,6,'Tripea es un descubrimiento que le recomiendo a todo el mundo.','friends','20-35'),
    ('c8000001-0000-0000-0000-000000000007',u8,r10,now()-'49 days'::interval,'loved',8.0,7,'Grosso: la pizza napolitana que Madrid necesitaba hace años.','friends','20-35'),
    ('c8000001-0000-0000-0000-000000000008',u8,r3,now()-'33 days'::interval, 'fine', 7.4,8,'StreetXO es demasiado caótico para mis gustos. Pero hay nivel.','friends','35-60'),
    ('c8000001-0000-0000-0000-000000000009',u8,r6,now()-'17 days'::interval, 'loved',8.4,9,'Club Allard con la pareja: el regalo ideal por un aniversario.','friends','60+'),
    ('c8000001-0000-0000-0000-000000000010',u8,r1,now()-'5 days'::interval,  'loved',9.2,10,'DiverXO: he tardado en venir. Me arrepiento de no haberlo hecho antes.','friends','60+')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.visit_dishes (visit_id,name,highlighted,position) VALUES
    ('c8000001-0000-0000-0000-000000000001','Cochinillo asado con miel de brezo',true,0),
    ('c8000001-0000-0000-0000-000000000001','Sopa de ajo con huevo poché',false,1),
    ('c8000001-0000-0000-0000-000000000002','Lubina a la sal con verduritas',true,0),
    ('c8000001-0000-0000-0000-000000000002','Crema de calabaza con foie',false,1),
    ('c8000001-0000-0000-0000-000000000003','Callos a la madrileña con chorizo',true,0),
    ('c8000001-0000-0000-0000-000000000003','Patatas a la importancia con almejas',false,1),
    ('c8000001-0000-0000-0000-000000000004','Entrecot madurado 45 días',true,0),
    ('c8000001-0000-0000-0000-000000000004','Sopa de trufa con yema confitada',false,1),
    ('c8000001-0000-0000-0000-000000000005','Yakitori de papada con soja',true,0),
    ('c8000001-0000-0000-0000-000000000005','Karaage de pollo con yuzu mayo',false,1),
    ('c8000001-0000-0000-0000-000000000006','Conejo con curry y coco',true,0),
    ('c8000001-0000-0000-0000-000000000006','Pan de yuca con guacamole',false,1),
    ('c8000001-0000-0000-0000-000000000007','Pizza a la puttanesca',true,0),
    ('c8000001-0000-0000-0000-000000000007','Gelato de pistacho siciliano',false,1),
    ('c8000001-0000-0000-0000-000000000008','Gyoza de rabo de toro y foie',true,0),
    ('c8000001-0000-0000-0000-000000000008','Bowl de miso negro con cerdo',false,1),
    ('c8000001-0000-0000-0000-000000000009','Pato con salsa de naranja y setas',true,0),
    ('c8000001-0000-0000-0000-000000000009','Torrija caramelizada con crema',false,1),
    ('c8000001-0000-0000-0000-000000000010','Erizo de mar con aceite de trufa',true,0),
    ('c8000001-0000-0000-0000-000000000010','Pichón con reducción de Oporto',false,1)
  ON CONFLICT (id) DO NOTHING;

  -- ─ ELENA (@elenadi) ──────────────────────────────────────────────────────
  INSERT INTO public.visits (id,user_id,restaurant_id,visited_at,sentiment,rank_score,rank_position,note,visibility,spend_per_person) VALUES
    ('c9000001-0000-0000-0000-000000000001',u9,r9,now()-'162 days'::interval,'loved',9.2,1,'Tripea me demostró que Madrid sí entiende de cocina del mundo.','friends','20-35'),
    ('c9000001-0000-0000-0000-000000000002',u9,r4,now()-'140 days'::interval,'loved',8.9,2,'La Carmencita desde Sevilla: ahora entiendo por qué Madrid la ama.','friends','20-35'),
    ('c9000001-0000-0000-0000-000000000003',u9,r3,now()-'120 days'::interval,'loved',8.7,3,'StreetXO es lo opuesto a la cocina sevillana. Y también me encanta.','friends','35-60'),
    ('c9000001-0000-0000-0000-000000000004',u9,r1,now()-'99 days'::interval, 'loved',9.4,4,'DiverXO: el mejor momento que he vivido en una mesa.','friends','60+'),
    ('c9000001-0000-0000-0000-000000000005',u9,r5,now()-'80 days'::interval, 'loved',8.3,5,'Yakitoro: rápido, sabroso y con buen vino. Perfecto.','friends','20-35'),
    ('c9000001-0000-0000-0000-000000000006',u9,r10,now()-'61 days'::interval,'loved',8.5,6,'Grosso: si esto es de cadena, que todas las cadenas fueran así.','friends','20-35'),
    ('c9000001-0000-0000-0000-000000000007',u9,r2,now()-'45 days'::interval, 'fine', 7.8,7,'Botín es turístico, sí. Pero el cochinillo no miente.','friends','35-60'),
    ('c9000001-0000-0000-0000-000000000008',u9,r8,now()-'28 days'::interval, 'loved',8.2,8,'DANI Brasserie es el restaurante de lujo que no intimida.','friends','60+'),
    ('c9000001-0000-0000-0000-000000000009',u9,r7,now()-'14 days'::interval, 'loved',7.9,9,'Café de Oriente: comida bien, vistas perfectas. Vale la pena.','friends','35-60'),
    ('c9000001-0000-0000-0000-000000000010',u9,r6,now()-'3 days'::interval,  'loved',8.6,10,'Club Allard: elegancia sin ostentación. Me ha sorprendido mucho.','friends','60+')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.visit_dishes (visit_id,name,highlighted,position) VALUES
    ('c9000001-0000-0000-0000-000000000001','Ceviche mixto de corvina y pulpo',true,0),
    ('c9000001-0000-0000-0000-000000000001','Empanada de pino con ají de color',false,1),
    ('c9000001-0000-0000-0000-000000000002','Jamón ibérico de bellota cortado a cuchillo',true,0),
    ('c9000001-0000-0000-0000-000000000002','Morcilla de Burgos con pimientos',false,1),
    ('c9000001-0000-0000-0000-000000000003','Pho de rabo de toro',true,0),
    ('c9000001-0000-0000-0000-000000000003','Curry de carrillada con arroz jazmín',false,1),
    ('c9000001-0000-0000-0000-000000000004','Calamar en su tinta con alioli negro',true,0),
    ('c9000001-0000-0000-0000-000000000004','Maíz a la brasa con mantequilla',false,1),
    ('c9000001-0000-0000-0000-000000000005','Yakitori de presa ibérica con sake',true,0),
    ('c9000001-0000-0000-0000-000000000005','Tofu frito con cebollino y soja',false,1),
    ('c9000001-0000-0000-0000-000000000006','Pizza con prosciutto San Daniele',true,0),
    ('c9000001-0000-0000-0000-000000000006','Cannoli siciliano de ricotta',false,1),
    ('c9000001-0000-0000-0000-000000000007','Cabrito lechal con patatas paja',true,0),
    ('c9000001-0000-0000-0000-000000000007','Rabo de toro estofado',false,1),
    ('c9000001-0000-0000-0000-000000000008','Tartar de gambas con caviar',true,0),
    ('c9000001-0000-0000-0000-000000000008','Merluza en verde con almejas',false,1),
    ('c9000001-0000-0000-0000-000000000009','Arroz a banda con alioli',true,0),
    ('c9000001-0000-0000-0000-000000000009','Tarta de Santiago casera',false,1),
    ('c9000001-0000-0000-0000-000000000010','Cochinillo confitado con manzana',true,0),
    ('c9000001-0000-0000-0000-000000000010','Tatín de cebolla con Cabrales',false,1)
  ON CONFLICT (id) DO NOTHING;

  -- ─ MIGUEL (@mherrero) ────────────────────────────────────────────────────
  INSERT INTO public.visits (id,user_id,restaurant_id,visited_at,sentiment,rank_score,rank_position,note,visibility,spend_per_person) VALUES
    ('ca000001-0000-0000-0000-000000000001',u10,r2,now()-'178 days'::interval,'loved',9.1,1,'Botín es como volver a casa. El cochinillo, siempre 10.','friends','35-60'),
    ('ca000001-0000-0000-0000-000000000002',u10,r7,now()-'155 days'::interval,'loved',8.6,2,'Café de Oriente: lo de siempre, bien hecho. Me fío de ellos.','friends','35-60'),
    ('ca000001-0000-0000-0000-000000000003',u10,r4,now()-'133 days'::interval,'loved',8.9,3,'La Carmencita es taberna de las de verdad. Imprescindible.','friends','20-35'),
    ('ca000001-0000-0000-0000-000000000004',u10,r5,now()-'112 days'::interval,'loved',8.3,4,'Yakitoro es el sitio donde llevo a los extranjeros. Siempre triunfo.','friends','20-35'),
    ('ca000001-0000-0000-0000-000000000005',u10,r10,now()-'91 days'::interval,'loved',8.1,5,'Grosso: sencillo y bueno. Así de fácil. La masa es perfecta.','friends','20-35'),
    ('ca000001-0000-0000-0000-000000000006',u10,r9,now()-'72 days'::interval, 'loved',8.5,6,'Tripea: no esperaba tanto. Ha sido una revelación total.','friends','20-35'),
    ('ca000001-0000-0000-0000-000000000007',u10,r3,now()-'53 days'::interval, 'fine', 7.6,7,'StreetXO: entiendo el hype pero prefiero la cocina tradicional.','friends','35-60'),
    ('ca000001-0000-0000-0000-000000000008',u10,r8,now()-'36 days'::interval, 'loved',8.0,8,'DANI: producto excepcional, servicio impecable. Lujo sin exabruptos.','friends','60+'),
    ('ca000001-0000-0000-0000-000000000009',u10,r6,now()-'20 days'::interval, 'fine', 7.7,9,'Club Allard: técnicamente perfecto. Le falta alma a veces.','friends','60+'),
    ('ca000001-0000-0000-0000-000000000010',u10,r1,now()-'8 days'::interval,  'loved',9.0,10,'DiverXO: lo entendí todo cuando el primer plato llegó a la mesa.','friends','60+')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.visit_dishes (visit_id,name,highlighted,position) VALUES
    ('ca000001-0000-0000-0000-000000000001','Cochinillo a la antigua usanza',true,0),
    ('ca000001-0000-0000-0000-000000000001','Sopa de fideos con puchero',false,1),
    ('ca000001-0000-0000-0000-000000000002','Besugo a la madrileña',true,0),
    ('ca000001-0000-0000-0000-000000000002','Ensalada templada de perdiz',false,1),
    ('ca000001-0000-0000-0000-000000000003','Oreja de cerdo frita con chimichurri',true,0),
    ('ca000001-0000-0000-0000-000000000003','Salpicón de mariscos',false,1),
    ('ca000001-0000-0000-0000-000000000004','Pollo yakitori con tare clásico',true,0),
    ('ca000001-0000-0000-0000-000000000004','Tsukune con huevo codorniz',false,1),
    ('ca000001-0000-0000-0000-000000000005','Pizza Napoli con aceitunas y anchoas',true,0),
    ('ca000001-0000-0000-0000-000000000005','Lasagna de espinacas y ricotta',false,1),
    ('ca000001-0000-0000-0000-000000000006','Chicharrón de cerdo con mojo verde',true,0),
    ('ca000001-0000-0000-0000-000000000006','Aguachile de langostino',false,1),
    ('ca000001-0000-0000-0000-000000000007','Tonkotsu con cerdo y nori',true,0),
    ('ca000001-0000-0000-0000-000000000007','Edamame con mantequilla de misó',false,1),
    ('ca000001-0000-0000-0000-000000000008','Chuleta de ternera asturiana',true,0),
    ('ca000001-0000-0000-0000-000000000008','Croquetas de jamón de bellota',false,1),
    ('ca000001-0000-0000-0000-000000000009','Rape con salsa de azafrán',true,0),
    ('ca000001-0000-0000-0000-000000000009','Semifrío de limón y albahaca',false,1),
    ('ca000001-0000-0000-0000-000000000010','Langosta a la parrilla con mantequilla',true,0),
    ('ca000001-0000-0000-0000-000000000010','Hígado de pato mi-cuit con higos',false,1)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Mock seed completado: 10 usuarios, 5 amigos de jaime, 100 visitas, 200 platos.';

END $$;
