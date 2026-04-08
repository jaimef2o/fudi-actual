-- ============================================================
-- 005: Notifications table
-- Run in Supabase SQL Editor
-- ============================================================

create table if not exists public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  type        text not null check (type in (
    'follow_request', 'new_follower', 'new_visit', 'tagged', 'comment', 'follow_accepted', 'post_saved'
  )),
  title       text not null,
  body        text not null,
  actor_id    uuid references public.users(id) on delete set null,
  visit_id    uuid references public.visits(id) on delete set null,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- Users can only see their own notifications
create policy "notifications: own read"
  on public.notifications for select
  using (user_id = auth.uid());

-- Authenticated users can insert notifications for anyone (triggers)
create policy "notifications: authenticated insert"
  on public.notifications for insert
  with check (auth.role() = 'authenticated');

-- Users can update (mark read) their own notifications
create policy "notifications: own update"
  on public.notifications for update
  using (user_id = auth.uid());

-- Index for fast queries
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_created_at on public.notifications(user_id, created_at desc);
