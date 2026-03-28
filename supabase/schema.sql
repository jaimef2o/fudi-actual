-- ============================================================
-- fudi MVP — Schema completo + RLS
-- Ejecutar en Supabase SQL Editor (una sola vez, en orden)
-- ============================================================

-- ── EXTENSIONES ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── TABLAS ───────────────────────────────────────────────────

create table if not exists public.users (
  id                   uuid primary key references auth.users(id) on delete cascade,
  name                 text not null default '',
  handle               text unique,
  phone                text,
  avatar_url           text,
  city                 text,
  bio                  text,
  cuisine_dislikes     text[],
  dietary_restrictions text[],
  push_token           text,
  is_creator           boolean not null default false,
  taste_profile        text,
  created_at           timestamptz not null default now()
);

-- If the table already exists, run this separately:
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_token TEXT;

create table if not exists public.relationships (
  user_id       uuid not null references public.users(id) on delete cascade,
  target_id     uuid not null references public.users(id) on delete cascade,
  type          text not null check (type in ('mutual','following')),
  affinity_score numeric(4,1),
  created_at    timestamptz not null default now(),
  primary key (user_id, target_id)
);

create table if not exists public.chains (
  id   uuid primary key default uuid_generate_v4(),
  name text not null unique
);

create table if not exists public.restaurants (
  id               uuid primary key default uuid_generate_v4(),
  google_place_id  text unique,
  name             text not null,
  address          text,
  neighborhood     text,
  city             text,
  lat              numeric(9,6),
  lng              numeric(9,6),
  cuisine          text,
  price_level      text,
  cover_image_url  text,
  chain_id         uuid references public.chains(id)
);

create table if not exists public.visits (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.users(id) on delete cascade,
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  visited_at     timestamptz not null default now(),
  sentiment      text check (sentiment in ('loved','fine','disliked')),
  rank_position  int,
  rank_score     numeric(3,1),
  note           text,
  visibility     text not null default 'friends' check (visibility in ('friends','groups','private')),
  source_visit_id uuid references public.visits(id),
  created_at     timestamptz not null default now()
);

create table if not exists public.visit_dishes (
  id          uuid primary key default uuid_generate_v4(),
  visit_id    uuid not null references public.visits(id) on delete cascade,
  name        text not null,
  highlighted boolean not null default false,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_visit_dishes_visit on public.visit_dishes(visit_id);

-- ── MIGRATION (run once if upgrading from v1 schema) ─────────────────────────
-- ALTER TABLE public.visit_dishes RENAME COLUMN dish_name TO name;
-- ALTER TABLE public.visit_dishes RENAME COLUMN rank_position TO position;
-- UPDATE public.visit_dishes SET position = 0 WHERE position IS NULL;
-- ALTER TABLE public.visit_dishes ALTER COLUMN position SET NOT NULL;
-- ALTER TABLE public.visit_dishes ALTER COLUMN position SET DEFAULT 0;
-- ALTER TABLE public.visit_dishes DROP COLUMN IF EXISTS note;
-- ALTER TABLE public.visit_dishes ADD COLUMN IF NOT EXISTS highlighted BOOLEAN NOT NULL DEFAULT FALSE;
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.visit_photos (
  id         uuid primary key default uuid_generate_v4(),
  visit_id   uuid not null references public.visits(id) on delete cascade,
  dish_id    uuid references public.visit_dishes(id) on delete set null,
  photo_url  text not null,
  type       text not null check (type in ('restaurant','dish')),
  created_at timestamptz not null default now()
);

create table if not exists public.visit_tags (
  id             uuid primary key default uuid_generate_v4(),
  visit_id       uuid not null references public.visits(id) on delete cascade,
  tagged_user_id uuid not null references public.users(id) on delete cascade,
  notified_at    timestamptz,
  completed_at   timestamptz
);

create table if not exists public.reactions (
  id         uuid primary key default uuid_generate_v4(),
  visit_id   uuid not null references public.visits(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  emoji      text not null check (emoji in ('hungry','fire')),
  created_at timestamptz not null default now(),
  unique (visit_id, user_id, emoji)
);

create table if not exists public.lists (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  name       text,
  type       text not null check (type in ('been','want','shared')),
  created_at timestamptz not null default now()
);

create table if not exists public.list_items (
  id            uuid primary key default uuid_generate_v4(),
  list_id       uuid not null references public.lists(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  added_at      timestamptz not null default now()
);

create table if not exists public.invitations (
  id                  uuid primary key default uuid_generate_v4(),
  inviter_user_id     uuid not null references public.users(id) on delete cascade,
  token               text not null unique,
  claimed_by_user_id  uuid references public.users(id),
  created_at          timestamptz not null default now(),
  claimed_at          timestamptz
);

create table if not exists public.saved_visits (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  visit_id   uuid not null references public.visits(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, visit_id)
);

-- ── TRIGGER: crear fila en users cuando se registra un auth.user ──

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── ROW LEVEL SECURITY ───────────────────────────────────────

alter table public.users         enable row level security;
alter table public.relationships  enable row level security;
alter table public.restaurants    enable row level security;
alter table public.visits         enable row level security;
alter table public.visit_dishes   enable row level security;
alter table public.visit_photos   enable row level security;
alter table public.visit_tags     enable row level security;
alter table public.reactions      enable row level security;
alter table public.lists          enable row level security;
alter table public.list_items     enable row level security;
alter table public.invitations    enable row level security;
alter table public.saved_visits   enable row level security;

-- USERS: cada uno ve todos los perfiles (app social), edita solo el suyo
create policy "users: anyone can read" on public.users
  for select using (true);
create policy "users: own insert" on public.users
  for insert with check (auth.uid() = id);
create policy "users: own update" on public.users
  for update using (auth.uid() = id);

-- RELATIONSHIPS: ver las propias
create policy "relationships: own" on public.relationships
  for all using (auth.uid() = user_id);

-- RESTAURANTS: lectura pública, escritura autenticada
create policy "restaurants: read all" on public.restaurants
  for select using (true);
create policy "restaurants: authenticated insert" on public.restaurants
  for insert with check (auth.role() = 'authenticated');

-- VISITS: ver las propias + las de amigos mutuos con visibility=friends
create policy "visits: own" on public.visits
  for all using (auth.uid() = user_id);
create policy "visits: friends can read" on public.visits
  for select using (
    visibility = 'friends'
    and exists (
      select 1 from public.relationships r
      where r.user_id = auth.uid()
        and r.target_id = visits.user_id
        and r.type = 'mutual'
    )
  );

-- VISIT_DISHES / VISIT_PHOTOS: quien puede ver la visita puede ver sus platos y fotos
create policy "visit_dishes: via visit" on public.visit_dishes
  for select using (
    exists (
      select 1 from public.visits v
      where v.id = visit_dishes.visit_id
        and (v.user_id = auth.uid()
          or (v.visibility = 'friends' and exists (
            select 1 from public.relationships r
            where r.user_id = auth.uid()
              and r.target_id = v.user_id
              and r.type in ('mutual', 'following')
          ))
        )
    )
  );
create policy "visit_dishes: own write" on public.visit_dishes
  for all using (
    exists (select 1 from public.visits v where v.id = visit_dishes.visit_id and v.user_id = auth.uid())
  );

create policy "visit_photos: via visit" on public.visit_photos
  for select using (
    exists (
      select 1 from public.visits v
      where v.id = visit_photos.visit_id
        and (v.user_id = auth.uid()
          or (v.visibility = 'friends' and exists (
            select 1 from public.relationships r
            where r.user_id = auth.uid() and r.target_id = v.user_id and r.type = 'mutual'
          ))
        )
    )
  );
create policy "visit_photos: own write" on public.visit_photos
  for all using (
    exists (select 1 from public.visits v where v.id = visit_photos.visit_id and v.user_id = auth.uid())
  );

-- VISIT_TAGS: ver si eres el tagger o el tagged
create policy "visit_tags: own" on public.visit_tags
  for all using (
    auth.uid() = tagged_user_id
    or exists (select 1 from public.visits v where v.id = visit_tags.visit_id and v.user_id = auth.uid())
  );

-- REACTIONS: cualquier autenticado puede leer; sólo puedes insertar/borrar las tuyas
create policy "reactions: read all" on public.reactions
  for select using (true);
create policy "reactions: own write" on public.reactions
  for all using (auth.uid() = user_id);

-- LISTS / LIST_ITEMS: solo el dueño
create policy "lists: own" on public.lists
  for all using (auth.uid() = user_id);
create policy "list_items: via list" on public.list_items
  for all using (
    exists (select 1 from public.lists l where l.id = list_items.list_id and l.user_id = auth.uid())
  );

-- INVITATIONS: el inviter gestiona las suyas; cualquiera puede reclamar
create policy "invitations: inviter own" on public.invitations
  for all using (auth.uid() = inviter_user_id);
create policy "invitations: claim" on public.invitations
  for update using (claimed_by_user_id is null);

-- SAVED_VISITS: cada usuario gestiona los suyos
create policy "saved_visits: own" on public.saved_visits
  for all using (auth.uid() = user_id);

-- ── STORAGE BUCKET para fotos ────────────────────────────────
-- Ejecutar esto si no tienes ya el bucket creado en el dashboard
insert into storage.buckets (id, name, public)
values ('visit-photos', 'visit-photos', true)
on conflict do nothing;

create policy "visit-photos: public read" on storage.objects
  for select using (bucket_id = 'visit-photos');
create policy "visit-photos: auth upload" on storage.objects
  for insert with check (bucket_id = 'visit-photos' and auth.role() = 'authenticated');
create policy "visit-photos: own delete" on storage.objects
  for delete using (bucket_id = 'visit-photos' and auth.uid()::text = (storage.foldername(name))[1]);

