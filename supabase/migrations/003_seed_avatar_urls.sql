-- ═══════════════════════════════════════════════════════════════════════════
-- SEED: Add real profile pictures to all 30 mock users
-- Uses randomuser.me public portrait API (stable, hotlinkable)
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Users 1-10 (friends)
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/32.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000001'; -- Carlos García
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/44.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000002'; -- Marina López
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/75.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000003'; -- Pablo Martínez
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/68.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000004'; -- Lucía Fernández
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/22.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000005'; -- Andrés Ruiz
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/29.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000006'; -- Sofía Moreno
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/45.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000007'; -- Diego Navarro
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/55.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000008'; -- Elena Romero
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/61.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000009'; -- Javier Torres
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/72.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000010'; -- Carmen Díaz

-- Users 11-20 (not friends)
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/11.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000011'; -- Alejandro Sanz
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/19.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000012'; -- Inés Castro
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/52.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000013'; -- Marcos Blanco
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/37.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000014'; -- Valeria Herrera
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/18.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000015'; -- Hugo Méndez
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/82.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000016'; -- Nuria Pérez
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/67.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000017'; -- Raúl Ortega
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/14.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000018'; -- Alba Jiménez
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/39.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000019'; -- Iván Santos
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/90.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000020'; -- Paula Vega

-- Users 21-30 (not friends)
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/84.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000021'; -- Daniel Ríos
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/47.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000022'; -- Cristina Fuentes
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/29.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000023'; -- Miguel Caballero
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/63.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000024'; -- Laura Aguilar
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/56.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000025'; -- Adrián Prieto
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/33.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000026'; -- Marta Calvo
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/71.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000027'; -- Óscar León
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/25.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000028'; -- Beatriz Molina
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/43.jpg'   WHERE id = 'a0000001-0000-0000-0000-000000000029'; -- Sergio Peña
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/51.jpg' WHERE id = 'a0000001-0000-0000-0000-000000000030'; -- Ana Delgado

-- Also update the old mock-seed users (a1000000 series) if they exist
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/32.jpg'   WHERE id = 'a1000000-0000-0000-0000-000000000001'; -- Carlos García
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/44.jpg' WHERE id = 'a1000000-0000-0000-0000-000000000002'; -- Marina Fdez
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/75.jpg'   WHERE id = 'a1000000-0000-0000-0000-000000000003'; -- Pablo Ramos
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/68.jpg' WHERE id = 'a1000000-0000-0000-0000-000000000004'; -- Lucía Moreno
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/29.jpg' WHERE id = 'a1000000-0000-0000-0000-000000000005'; -- Ana Sánchez
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/45.jpg'   WHERE id = 'a1000000-0000-0000-0000-000000000006'; -- Diego Torres
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/55.jpg' WHERE id = 'a1000000-0000-0000-0000-000000000007'; -- Sofía Vega
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/61.jpg'   WHERE id = 'a1000000-0000-0000-0000-000000000008'; -- Javier Blanco
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/women/72.jpg' WHERE id = 'a1000000-0000-0000-0000-000000000009'; -- Elena Cruz
UPDATE public.users SET avatar_url = 'https://randomuser.me/api/portraits/men/22.jpg'   WHERE id = 'a1000000-0000-0000-0000-000000000010'; -- Miguel Herrero
