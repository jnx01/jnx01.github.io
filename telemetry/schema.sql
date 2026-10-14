-- =============================================================================
-- Cloudflare D1 (SQLite) schema for visitor telemetry
-- =============================================================================
-- Three simple tables:
--   1. visitors  — one row per unique person (matched by persistent ID or
--                  hardware+IP fingerprint), updated on every visit.
--   2. pageviews — one row per page viewed, with entry time, active read time,
--                  max scroll %, referrer, and network/geo snapshot.
--   3. events    — one row per interaction (link click, resume open, section
--                  viewed, widget used, email copied, text copied).
-- =============================================================================

CREATE TABLE IF NOT EXISTS visitors (
  visitor_id        TEXT PRIMARY KEY,        -- Persistent UUID (or hardware hash fallback)
  hw_hash           TEXT,                    -- Hardware fingerprint hash (GPU + screen + cores + tz)
  first_seen        TEXT NOT NULL,           -- ISO timestamp of very first visit
  last_seen         TEXT NOT NULL,           -- ISO timestamp of most recent activity
  visit_count       INTEGER NOT NULL DEFAULT 1,
  total_active_sec  INTEGER NOT NULL DEFAULT 0,

  -- Latest network & location from Cloudflare Edge (request.cf)
  ip                TEXT,
  isp               TEXT,                    -- ASN Organization (e.g. "Teradata", "Comcast", "PTCL")
  asn               INTEGER,
  city              TEXT,
  region            TEXT,
  country           TEXT,
  postal_code       TEXT,
  latitude          REAL,
  longitude         REAL,
  cf_timezone       TEXT,
  colo              TEXT,                    -- Cloudflare datacenter code (e.g. "IAD", "KHI", "LHR")

  -- Device & hardware profile from browser
  user_agent        TEXT,
  os                TEXT,
  browser           TEXT,
  device_type       TEXT,                    -- desktop / mobile / tablet
  gpu               TEXT,                    -- WebGL renderer (e.g. "Apple M3 Max", "ANGLE (NVIDIA RTX...)")
  cpu_cores         INTEGER,
  ram_gb            REAL,
  screen            TEXT,                    -- e.g. "1728x1117 @2x"
  language          TEXT,
  browser_tz        TEXT,
  connection        TEXT,                    -- e.g. "4g (10 Mbps)"
  theme             TEXT                     -- "light" or "dark"
);

CREATE TABLE IF NOT EXISTS pageviews (
  view_id           TEXT PRIMARY KEY,        -- Unique ID for this specific page load
  visitor_id        TEXT NOT NULL,
  session_id        TEXT NOT NULL,           -- Groups pages opened in the same tab session
  created_at        TEXT NOT NULL,           -- ISO timestamp when page opened
  updated_at        TEXT NOT NULL,           -- ISO timestamp of last heartbeat/exit

  -- Page & attribution
  path              TEXT NOT NULL,           -- e.g. "/", "/work/teradata", "/research"
  title             TEXT,
  referrer          TEXT,                    -- External referrer or previous internal path
  utm_source        TEXT,                    -- ?utm_source= or ?ref=
  utm_medium        TEXT,
  utm_campaign      TEXT,
  query_string      TEXT,

  -- Engagement metrics (updated live as the user reads/scrolls/leaves)
  active_sec        INTEGER NOT NULL DEFAULT 0,  -- Seconds the tab was actually visible & active
  max_scroll_pct    INTEGER NOT NULL DEFAULT 0,  -- Deepest scroll percentage (0..100)
  sections_seen     TEXT DEFAULT '[]',           -- JSON array of section IDs viewed

  -- Snapshot of network/location at the time of this pageview
  ip                TEXT,
  isp               TEXT,
  city              TEXT,
  region            TEXT,
  country           TEXT,
  latitude          REAL,
  longitude         REAL,
  viewport          TEXT                     -- e.g. "1440x812"
);

CREATE TABLE IF NOT EXISTS events (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  view_id           TEXT NOT NULL,
  visitor_id        TEXT NOT NULL,
  created_at        TEXT NOT NULL,
  path              TEXT NOT NULL,
  event_type        TEXT NOT NULL,           -- e.g. "click", "resume", "section", "widget", "copy"
  event_target      TEXT,                    -- e.g. label or URL clicked
  event_meta        TEXT                     -- JSON string with extra details
);

-- Indexes so the visual dashboard queries stay fast as data grows
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_hw_hash   ON visitors(hw_hash);
CREATE INDEX IF NOT EXISTS idx_pageviews_created  ON pageviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pageviews_visitor  ON pageviews(visitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_visitor     ON events(visitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_view        ON events(view_id);
