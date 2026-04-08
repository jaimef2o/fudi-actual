-- ============================================================
-- fudi — Social Graph v2 Migration
-- Run in Supabase SQL Editor after schema.sql has been applied.
-- Safe to re-run: uses IF NOT EXISTS and DO $$ blocks.
-- ============================================================

-- ── 1. Add `status` column to relationships ─────────────────
-- Tracks whether a relationship is active or pending approval.
ALTER TABLE public.relationships
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add CHECK constraint for status (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'relationships_status_check'
      AND conrelid = 'public.relationships'::regclass
  ) THEN
    ALTER TABLE public.relationships
      ADD CONSTRAINT relationships_status_check
      CHECK (status IN ('active', 'pending'));
  END IF;
END $$;

-- ── 2. Add `is_public` column to users ──────────────────────
-- Controls profile visibility: true = discoverable, false = private.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- ── 3. Add `phone_hash` column to users ─────────────────────
-- SHA-256 hash of the phone number, used for contact-sync matching.
-- Nullable because not all users provide a phone number.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone_hash text;

-- ── 4. Index on users(phone_hash) for contact-sync lookups ──
-- Partial index: only rows that have a phone_hash are indexed.
CREATE INDEX IF NOT EXISTS idx_users_phone_hash
  ON public.users (phone_hash)
  WHERE phone_hash IS NOT NULL;

-- ── 5. Partial indexes on relationships for fast graph queries
-- Active followers of a given user (outgoing edges)
CREATE INDEX IF NOT EXISTS idx_rel_follower_active
  ON public.relationships (user_id)
  WHERE status = 'active';

-- Active followees targeting a given user (incoming edges)
CREATE INDEX IF NOT EXISTS idx_rel_followed_active
  ON public.relationships (target_id)
  WHERE status = 'active';

-- Pending requests targeting a given user (inbox)
CREATE INDEX IF NOT EXISTS idx_rel_pending
  ON public.relationships (target_id)
  WHERE status = 'pending';

-- ── 6. Update CHECK constraint on `type` (backward-compatible) ─
-- The original constraint allows ('mutual', 'following').
-- We keep those values — no change needed since v2 does not add
-- new type values. This block is here as a safe no-op placeholder
-- so future additions can follow the same pattern.
DO $$
BEGIN
  -- Verify the existing constraint is present; if someone
  -- dropped it manually we re-create it with the same values.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'relationships_type_check'
      AND conrelid = 'public.relationships'::regclass
  ) THEN
    ALTER TABLE public.relationships
      ADD CONSTRAINT relationships_type_check
      CHECK (type IN ('mutual', 'following'));
  END IF;
END $$;

-- ── 7. Drop `is_creator` column from users ──────────────────
-- Creator mode is not in MVP scope. Remove the column to keep
-- the schema clean. Safe even if already dropped.
ALTER TABLE public.users
  DROP COLUMN IF EXISTS is_creator;

-- ============================================================
-- Done. Verify with:
--   SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'users' AND table_schema = 'public';
--
--   SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'relationships' AND table_schema = 'public';
-- ============================================================
