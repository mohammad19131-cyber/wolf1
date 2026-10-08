-- Additive schema for live competition operations.
-- Safe to re-run. Does not drop tables, columns, or data.

CREATE TABLE IF NOT EXISTS competition (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'active', 'paused', 'ended')),
  starts_at timestamptz,
  ends_at timestamptz,
  pause_remaining_ms bigint,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO competition (id, status)
VALUES (1, 'waiting')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE livebids ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE livebids ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE livebids ADD COLUMN IF NOT EXISTS duration_seconds integer;
ALTER TABLE livebids ADD COLUMN IF NOT EXISTS winner text;

-- Optional later columns for technologies. Do not apply until the product needs them.
-- ALTER TABLE stocks ADD COLUMN IF NOT EXISTS description text;
-- ALTER TABLE stocks ADD COLUMN IF NOT EXISTS category text;
-- ALTER TABLE stocks ADD COLUMN IF NOT EXISTS available_quantity integer;
-- ALTER TABLE stocks ADD COLUMN IF NOT EXISTS status text;
-- ALTER TABLE stocks ADD COLUMN IF NOT EXISTS image_url text;
-- ALTER TABLE stocks ADD COLUMN IF NOT EXISTS starting_value numeric;

-- =====================================================================
-- WOLF OF TECH STREET: crisis system (additive, not applied remotely)
-- =====================================================================
-- Finalized rules encoded here:
--   12 crises, 8 options each, exactly 1 submitted option per team
--   no upfront cost, fixed/deterministic financial_effect per option
--   choice cannot be changed after submit
--   users.balance is competition capital (starting $10,000, carries over)
--   no-submit => $0 capital change at reveal
--   reveal applies each team's selected option financial_effect exactly once
--
-- Do NOT apply this file to a live Supabase project from this phase.

CREATE TABLE IF NOT EXISTS crises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  scenario text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'locked', 'revealed')),
  starts_at timestamptz,
  ends_at timestamptz,
  revealed boolean NOT NULL DEFAULT false,
  duration_seconds integer NOT NULL DEFAULT 600,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crisis_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crisis_id uuid NOT NULL REFERENCES crises(id) ON DELETE CASCADE,
  option_index integer NOT NULL CHECK (option_index BETWEEN 1 AND 8),
  title text NOT NULL,
  description text,
  category text,
  -- Hidden from participants until a later reveal phase.
  -- Never expose via a public/anon SELECT on this table.
  financial_effect numeric,
  explanation text,
  UNIQUE (crisis_id, option_index)
);

-- Exactly one row per team per crisis. Insert-only: unique (crisis_id, username)
-- rejects duplicate submissions. selected_option_id is exactly one option.
CREATE TABLE IF NOT EXISTS team_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crisis_id uuid NOT NULL REFERENCES crises(id) ON DELETE CASCADE,
  username text NOT NULL,
  selected_option_id uuid NOT NULL REFERENCES crisis_options(id),
  submitted_at timestamptz DEFAULT now(),
  locked boolean NOT NULL DEFAULT true,
  UNIQUE (crisis_id, username)
);

CREATE INDEX IF NOT EXISTS idx_crisis_options_crisis_id ON crisis_options(crisis_id);
CREATE INDEX IF NOT EXISTS idx_team_decisions_crisis_id ON team_decisions(crisis_id);

-- One row per team per crisis, written at reveal time. Unique (crisis_id, username)
-- is the double-payout guard: a result cannot be recorded twice.
CREATE TABLE IF NOT EXISTS crisis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crisis_id uuid NOT NULL REFERENCES crises(id) ON DELETE CASCADE,
  username text NOT NULL,
  selected_option_id uuid REFERENCES crisis_options(id),
  financial_effect numeric NOT NULL DEFAULT 0,
  explanation text,
  submitted boolean NOT NULL DEFAULT false,
  capital_before numeric NOT NULL,
  capital_after numeric NOT NULL,
  processed_at timestamptz DEFAULT now(),
  UNIQUE (crisis_id, username)
);

CREATE INDEX IF NOT EXISTS idx_crisis_results_crisis_id ON crisis_results(crisis_id);
CREATE INDEX IF NOT EXISTS idx_crisis_results_username ON crisis_results(username);

-- If an earlier draft of this schema already created crises without `revealed`:
ALTER TABLE crises ADD COLUMN IF NOT EXISTS revealed boolean NOT NULL DEFAULT false;
ALTER TABLE crises ADD COLUMN IF NOT EXISTS duration_seconds integer NOT NULL DEFAULT 600;
ALTER TABLE team_decisions ADD COLUMN IF NOT EXISTS selected_option_id uuid;
ALTER TABLE team_decisions ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  ALTER TABLE crises DROP CONSTRAINT IF EXISTS crises_status_check;
  ALTER TABLE crises ADD CONSTRAINT crises_status_check
    CHECK (status IN ('draft', 'active', 'locked', 'revealed'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Recommended RLS if using the anon key from the server:
-- Keep writes blocked for anonymous browser clients. The Next.js API should use
-- SUPABASE_SERVICE_ROLE_KEY so it can write regardless of RLS.
--
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE news ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE livebids ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE competition ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE crises ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE crisis_options ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE team_decisions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE crisis_results ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "public read stocks" ON stocks FOR SELECT USING (true);
-- CREATE POLICY "public read news" ON news FOR SELECT USING (true);
-- CREATE POLICY "public read livebids" ON livebids FOR SELECT USING (true);
-- CREATE POLICY "public read competition" ON competition FOR SELECT USING (true);
-- Do NOT add a public/anon read policy on crisis_options. Hidden columns
-- (financial_effect, explanation) must only be read by the Next.js server
-- using SUPABASE_SERVICE_ROLE_KEY. Participant APIs select public columns
-- only and strip hidden fields before responding.
