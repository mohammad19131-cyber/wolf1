-- Wolf of Tech Street — fresh production schema
-- Run this in an empty Supabase project's SQL Editor.
-- Safe to re-run: CREATE IF NOT EXISTS / INSERT ON CONFLICT DO NOTHING.
-- Does not DROP, DELETE, or TRUNCATE.
--
-- Architecture: the Next.js API uses SUPABASE_SERVICE_ROLE_KEY on the server.
-- There is no browser Supabase client. RLS is enabled with NO anon/authenticated
-- policies so PostgREST cannot read hidden crisis outcomes or passwords.
-- service_role bypasses RLS. SUPABASE_SERVICE_ROLE_KEY is required.

-- =====================================================================
-- 1. users — login, capital (users.balance), holdings JSON
--    Columns from: login, userinfo, admin, trading, livebids award/place, crisis reveal
--    Starting capital default $10,000. Admin creates participant rows; no seeds here.
--    StonksAdmin is application cookie-auth, not a database row.
-- =====================================================================
CREATE TABLE IF NOT EXISTS users (
  username text PRIMARY KEY,
  password text NOT NULL,
  balance numeric NOT NULL DEFAULT 10000,
  stocks jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- =====================================================================
-- 2. stocks — legacy trading catalog
--    Insert/select/update: id, "StockName", "StockValue"
--    Quoted identifiers required: the API sends PascalCase keys.
-- =====================================================================
CREATE TABLE IF NOT EXISTS stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "StockName" text NOT NULL,
  "StockValue" numeric NOT NULL
);

-- =====================================================================
-- 3. news — legacy news feed
--    Insert/update: title, body. GET orders by created_at desc.
-- =====================================================================
CREATE TABLE IF NOT EXISTS news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- 4. livebids — legacy live bidding
--    Insert: stockName, value, quantity, status, bids, optional duration_seconds
--    Updates: status, started_at, ends_at, winner, bids
--    GET orders by created_at desc.
-- =====================================================================
CREATE TABLE IF NOT EXISTS livebids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "stockName" text NOT NULL,
  value numeric NOT NULL,
  quantity numeric NOT NULL,
  status text NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('inactive', 'active', 'awarded')),
  bids jsonb NOT NULL DEFAULT '[]'::jsonb,
  duration_seconds integer,
  started_at timestamptz,
  ends_at timestamptz,
  winner text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- 5. competition — singleton timer/status (id = 1)
--    Upserted by the API: status, starts_at, ends_at, pause_remaining_ms, updated_at
-- =====================================================================
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

-- =====================================================================
-- 6. crises — draft → active → locked → revealed
--    12-crisis cap is enforced in application code, not here.
-- =====================================================================
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
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- 7. crisis_options — exactly 8 options per crisis (API-enforced)
--    financial_effect and explanation are hidden until reveal (API + RLS).
-- =====================================================================
CREATE TABLE IF NOT EXISTS crisis_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crisis_id uuid NOT NULL REFERENCES crises(id) ON DELETE CASCADE,
  option_index integer NOT NULL CHECK (option_index BETWEEN 1 AND 8),
  title text NOT NULL,
  description text,
  category text,
  financial_effect numeric,
  explanation text,
  UNIQUE (crisis_id, option_index)
);

-- =====================================================================
-- 8. team_decisions — one locked choice per team per crisis
--    UNIQUE (crisis_id, username) rejects a second submission (error 23505).
--    No FK to users.username: admin user-delete must keep working.
-- =====================================================================
CREATE TABLE IF NOT EXISTS team_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crisis_id uuid NOT NULL REFERENCES crises(id) ON DELETE CASCADE,
  username text NOT NULL,
  selected_option_id uuid NOT NULL REFERENCES crisis_options(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  locked boolean NOT NULL DEFAULT true,
  UNIQUE (crisis_id, username)
);

-- =====================================================================
-- 9. crisis_results — reveal processing record / payout history
--    UNIQUE (crisis_id, username) is the idempotent double-payout guard.
--    Insert-before-pay in application code; 23505 means skip.
-- =====================================================================
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
  processed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (crisis_id, username)
);

-- =====================================================================
-- Indexes matching current query patterns
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_stocks_stockname ON stocks ("StockName");
CREATE INDEX IF NOT EXISTS idx_news_created_at ON news (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_livebids_created_at ON livebids (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_livebids_status ON livebids (status);
CREATE INDEX IF NOT EXISTS idx_crises_status ON crises (status);
CREATE INDEX IF NOT EXISTS idx_crises_revealed ON crises (revealed);
CREATE INDEX IF NOT EXISTS idx_crises_starts_at ON crises (starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_crisis_options_crisis_id ON crisis_options (crisis_id);
CREATE INDEX IF NOT EXISTS idx_team_decisions_crisis_id ON team_decisions (crisis_id);
CREATE INDEX IF NOT EXISTS idx_crisis_results_crisis_id ON crisis_results (crisis_id);
CREATE INDEX IF NOT EXISTS idx_crisis_results_username ON crisis_results (username);

-- =====================================================================
-- RLS — deny anon/authenticated. No public SELECT on hidden columns.
-- The Next.js server must use SUPABASE_SERVICE_ROLE_KEY.
-- No policies are created: the app has no direct client Supabase access.
-- =====================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE livebids ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition ENABLE ROW LEVEL SECURITY;
ALTER TABLE crises ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_results ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE users FROM anon, authenticated;
REVOKE ALL ON TABLE stocks FROM anon, authenticated;
REVOKE ALL ON TABLE news FROM anon, authenticated;
REVOKE ALL ON TABLE livebids FROM anon, authenticated;
REVOKE ALL ON TABLE competition FROM anon, authenticated;
REVOKE ALL ON TABLE crises FROM anon, authenticated;
REVOKE ALL ON TABLE crisis_options FROM anon, authenticated;
REVOKE ALL ON TABLE team_decisions FROM anon, authenticated;
REVOKE ALL ON TABLE crisis_results FROM anon, authenticated;

GRANT ALL ON TABLE users TO service_role;
GRANT ALL ON TABLE stocks TO service_role;
GRANT ALL ON TABLE news TO service_role;
GRANT ALL ON TABLE livebids TO service_role;
GRANT ALL ON TABLE competition TO service_role;
GRANT ALL ON TABLE crises TO service_role;
GRANT ALL ON TABLE crisis_options TO service_role;
GRANT ALL ON TABLE team_decisions TO service_role;
GRANT ALL ON TABLE crisis_results TO service_role;
