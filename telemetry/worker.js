/**
 * =============================================================================
 * Custom Visitor Telemetry & Visual Dashboard — Cloudflare Worker
 * =============================================================================
 * Runs 100% on Cloudflare's free tier (Workers + D1 SQLite database).
 *
 * Routes:
 *   POST /collect        — Receives JSON beacons from the website (pageviews,
 *                          heartbeats with active time & scroll depth, and
 *                          interaction events). Enriches them with Cloudflare
 *                          edge network data (IP, ISP/ASN Org, City, Lat/Lon).
 *   GET  /api/stats      — Returns aggregated stats + recent visitor timelines
 *                          as JSON (requires ?key=DASHBOARD_KEY or header).
 *   GET  /               — Serves the interactive visual dashboard UI
 *                          (World map, daily chart, ISP/City tables, and
 *                          expandable per-visitor journey cards).
 * =============================================================================
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = getCorsHeaders(request, env);

    // 1. Handle browser CORS preflight requests quickly
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // 2. Ingestion endpoint: receives tracking beacons from the website
    if (url.pathname === '/collect' && request.method === 'POST') {
      try {
        const payload = await request.json();
        // Run the DB write in ctx.waitUntil so the browser gets an instant 204
        ctx.waitUntil(handleCollect(request, env, payload));
        return new Response(null, { status: 204, headers: cors });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
    }

    // 3. Dashboard API endpoint: returns JSON data for the dashboard UI
    if (url.pathname === '/api/stats' && request.method === 'GET') {
      if (!isAuthorized(request, url, env)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '30', 10), 1), 365);
      const stats = await queryDashboardStats(env.DB, days);
      return new Response(JSON.stringify(stats), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    // 4. Visual Dashboard UI (HTML page)
    if (url.pathname === '/' || url.pathname === '/dashboard') {
      return new Response(renderDashboardHtml(), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};

// -----------------------------------------------------------------------------
// CORS & Auth helpers
// -----------------------------------------------------------------------------

function getCorsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Allow listed origins (or echo origin if ALLOWED_ORIGINS is '*')
  const allowOrigin =
    allowed.includes('*') || allowed.includes(origin) ? origin || '*' : allowed[0] || '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '0',
    'Vary': 'Origin',
  };
}

function isAuthorized(request, url, env) {
  // If no DASHBOARD_KEY secret is configured yet, deny until one is set.
  if (!env.DASHBOARD_KEY) return false;
  const headerKey = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const queryKey = (url.searchParams.get('key') || '').trim();
  return headerKey === env.DASHBOARD_KEY || queryKey === env.DASHBOARD_KEY;
}

// -----------------------------------------------------------------------------
// Ingestion logic: extract Cloudflare edge metadata + save to D1
// -----------------------------------------------------------------------------

async function handleCollect(request, env, data) {
  if (!env.DB) return;

  const now = new Date().toISOString();

  // Cloudflare automatically populates request.cf on every edge request
  const cf = request.cf || {};
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown';
  const ua = request.headers.get('User-Agent') || '';

  // Skip obvious bots/crawlers so your feed stays focused on real humans
  if (/bot|crawler|spider|lighthouse|pingdom|uptime/i.test(ua)) {
    return;
  }

  const isp = cf.asOrganization || 'Unknown ISP';
  const asn = cf.asn || null;
  const city = cf.city || 'Unknown';
  const region = cf.region || '';
  const country = cf.country || 'XX';
  const postalCode = cf.postalCode || '';
  const latitude = cf.latitude ? parseFloat(cf.latitude) : null;
  const longitude = cf.longitude ? parseFloat(cf.longitude) : null;
  const cfTimezone = cf.timezone || '';
  const colo = cf.colo || '';

  const parsedUA = parseUserAgent(ua);
  const hwHash = cleanStr(data.hwHash, 64);

  // If the visitor cleared localStorage (new random visitorId), check if we
  // already know the exact same hardware fingerprint on the same IP or ISP.
  let visitorId = cleanStr(data.visitorId, 64) || `anon-${Date.now()}`;
  if (hwHash && data.isNewVisitor) {
    const existing = await env.DB.prepare(
      `SELECT visitor_id FROM visitors WHERE hw_hash = ?1 AND (ip = ?2 OR isp = ?3) LIMIT 1`
    )
      .bind(hwHash, ip, isp)
      .first();
    if (existing?.visitor_id) {
      visitorId = existing.visitor_id;
    }
  }

  const viewId = cleanStr(data.viewId, 64);
  const sessionId = cleanStr(data.sessionId, 64) || viewId;
  const path = cleanStr(data.path, 256) || '/';
  const type = data.type || 'pageview'; // 'pageview' | 'heartbeat' | 'event'

  // 1. Upsert the visitor profile on initial pageview
  if (type === 'pageview') {
    await env.DB.prepare(
      `INSERT INTO visitors (
        visitor_id, hw_hash, first_seen, last_seen, visit_count, total_active_sec,
        ip, isp, asn, city, region, country, postal_code, latitude, longitude, cf_timezone, colo,
        user_agent, os, browser, device_type, gpu, cpu_cores, ram_gb, screen, language, browser_tz, connection, theme
      ) VALUES (
        ?1, ?2, ?3, ?3, 1, 0,
        ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
        ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26
      )
      ON CONFLICT(visitor_id) DO UPDATE SET
        last_seen   = excluded.last_seen,
        visit_count = visitors.visit_count + CASE WHEN ?27 = 1 THEN 1 ELSE 0 END,
        ip          = excluded.ip,
        isp         = excluded.isp,
        asn         = excluded.asn,
        city        = excluded.city,
        region      = excluded.region,
        country     = excluded.country,
        postal_code = excluded.postal_code,
        latitude    = COALESCE(excluded.latitude, visitors.latitude),
        longitude   = COALESCE(excluded.longitude, visitors.longitude),
        cf_timezone = excluded.cf_timezone,
        colo        = excluded.colo,
        user_agent  = excluded.user_agent,
        os          = excluded.os,
        browser     = excluded.browser,
        device_type = excluded.device_type,
        gpu         = COALESCE(excluded.gpu, visitors.gpu),
        screen      = COALESCE(excluded.screen, visitors.screen),
        connection  = COALESCE(excluded.connection, visitors.connection),
        theme       = COALESCE(excluded.theme, visitors.theme)`
    )
      .bind(
        visitorId,
        hwHash,
        now,
        ip,
        isp,
        asn,
        city,
        region,
        country,
        postalCode,
        latitude,
        longitude,
        cfTimezone,
        colo,
        ua.slice(0, 500),
        parsedUA.os,
        parsedUA.browser,
        parsedUA.deviceType,
        cleanStr(data.gpu, 160),
        typeof data.cores === 'number' ? data.cores : null,
        typeof data.ram === 'number' ? data.ram : null,
        cleanStr(data.screen, 40),
        cleanStr(data.lang, 32),
        cleanStr(data.tz, 64),
        cleanStr(data.conn, 48),
        cleanStr(data.theme, 16),
        data.isNewSession ? 1 : 0
      )
      .run();

    // Insert the pageview record
    if (viewId) {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO pageviews (
          view_id, visitor_id, session_id, created_at, updated_at,
          path, title, referrer, utm_source, utm_medium, utm_campaign, query_string,
          active_sec, max_scroll_pct, sections_seen,
          ip, isp, city, region, country, latitude, longitude, viewport
        ) VALUES (
          ?1, ?2, ?3, ?4, ?4,
          ?5, ?6, ?7, ?8, ?9, ?10, ?11,
          0, ?12, ?13,
          ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21
        )`
      )
        .bind(
          viewId,
          visitorId,
          sessionId,
          now,
          path,
          cleanStr(data.title, 200),
          cleanStr(data.referrer, 500),
          cleanStr(data.utmSource, 100),
          cleanStr(data.utmMedium, 100),
          cleanStr(data.utmCampaign, 100),
          cleanStr(data.query, 300),
          clampInt(data.scrollPct, 0, 100),
          JSON.stringify(Array.isArray(data.sections) ? data.sections.slice(0, 25) : []),
          ip,
          isp,
          city,
          region,
          country,
          latitude,
          longitude,
          cleanStr(data.viewport, 40)
        )
        .run();
    }
  }

  // 2. Heartbeat / page-exit update: update active time, scroll depth, sections read
  if ((type === 'heartbeat' || type === 'pageview') && viewId) {
    const activeSec = clampInt(data.activeSec, 0, 7200);
    const scrollPct = clampInt(data.scrollPct, 0, 100);
    const sectionsJson = Array.isArray(data.sections)
      ? JSON.stringify(data.sections.slice(0, 25))
      : null;

    // Calculate delta in active_sec so we can add it to visitors.total_active_sec
    const prev = await env.DB.prepare(`SELECT active_sec FROM pageviews WHERE view_id = ?1`)
      .bind(viewId)
      .first();

    const prevSec = prev?.active_sec || 0;
    const deltaSec = Math.max(0, activeSec - prevSec);

    await env.DB.prepare(
      `UPDATE pageviews SET
        updated_at     = ?2,
        active_sec     = MAX(active_sec, ?3),
        max_scroll_pct = MAX(max_scroll_pct, ?4),
        sections_seen  = COALESCE(?5, sections_seen)
      WHERE view_id = ?1`
    )
      .bind(viewId, now, activeSec, scrollPct, sectionsJson)
      .run();

    if (deltaSec > 0 || data.theme) {
      await env.DB.prepare(
        `UPDATE visitors SET
          last_seen        = ?2,
          total_active_sec = total_active_sec + ?3,
          theme            = COALESCE(?4, theme)
        WHERE visitor_id = ?1`
      )
        .bind(visitorId, now, deltaSec, cleanStr(data.theme, 16))
        .run();
    }
  }

  // 3. Record any discrete interaction events included in the beacon
  if (Array.isArray(data.events) && data.events.length > 0) {
    const stmt = env.DB.prepare(
      `INSERT INTO events (view_id, visitor_id, created_at, path, event_type, event_target, event_meta)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    );
    const batch = data.events.slice(0, 20).map((ev) =>
      stmt.bind(
        viewId || 'unknown',
        visitorId,
        ev.ts || now,
        cleanStr(ev.path || path, 256),
        cleanStr(ev.type, 40) || 'interaction',
        cleanStr(ev.target, 300),
        ev.meta ? JSON.stringify(ev.meta).slice(0, 500) : null
      )
    );
    await env.DB.batch(batch);
  }
}

// -----------------------------------------------------------------------------
// Dashboard SQL Queries
// -----------------------------------------------------------------------------

async function queryDashboardStats(db, days) {
  const sinceDate = new Date(Date.now() - days * 86400 * 1000).toISOString();

  const [
    totalsRow,
    dailyRows,
    topPagesRows,
    topIspsRows,
    topLocationsRows,
    topEventsRows,
    topReferrersRows,
    recentVisitorsRows,
  ] = await Promise.all([
    // 1. Headline summary numbers
    db
      .prepare(
        `SELECT
          COUNT(DISTINCT visitor_id) AS unique_visitors,
          COUNT(*) AS total_pageviews,
          ROUND(AVG(active_sec), 1) AS avg_active_sec,
          ROUND(AVG(max_scroll_pct), 0) AS avg_scroll_pct
        FROM pageviews
        WHERE created_at >= ?1`
      )
      .bind(sinceDate)
      .first(),

    // 2. Daily pageviews & unique visitors
    db
      .prepare(
        `SELECT
          substr(created_at, 1, 10) AS day,
          COUNT(*) AS views,
          COUNT(DISTINCT visitor_id) AS visitors
        FROM pageviews
        WHERE created_at >= ?1
        GROUP BY day
        ORDER BY day ASC`
      )
      .bind(sinceDate)
      .all(),

    // 3. Top pages with average active read time & scroll %
    db
      .prepare(
        `SELECT
          path,
          COUNT(*) AS views,
          COUNT(DISTINCT visitor_id) AS visitors,
          ROUND(AVG(active_sec), 1) AS avg_sec,
          ROUND(AVG(max_scroll_pct), 0) AS avg_scroll
        FROM pageviews
        WHERE created_at >= ?1
        GROUP BY path
        ORDER BY views DESC
        LIMIT 15`
      )
      .bind(sinceDate)
      .all(),

    // 4. Top ISPs / Organizations (identifies companies, universities, telecoms)
    db
      .prepare(
        `SELECT
          isp,
          country,
          COUNT(DISTINCT visitor_id) AS visitors,
          COUNT(*) AS views,
          SUM(active_sec) AS total_sec
        FROM pageviews
        WHERE created_at >= ?1
        GROUP BY isp, country
        ORDER BY visitors DESC, views DESC
        LIMIT 20`
      )
      .bind(sinceDate)
      .all(),

    // 5. Top Cities & Countries + coordinates for map pins
    db
      .prepare(
        `SELECT
          city,
          region,
          country,
          AVG(latitude) AS lat,
          AVG(longitude) AS lon,
          COUNT(DISTINCT visitor_id) AS visitors,
          COUNT(*) AS views
        FROM pageviews
        WHERE created_at >= ?1
        GROUP BY city, region, country
        ORDER BY visitors DESC, views DESC
        LIMIT 30`
      )
      .bind(sinceDate)
      .all(),

    // 6. Key interaction events (Resume opens, outbound clicks, widgets)
    db
      .prepare(
        `SELECT
          event_type,
          event_target,
          COUNT(*) AS count,
          COUNT(DISTINCT visitor_id) AS visitors
        FROM events
        WHERE created_at >= ?1
        GROUP BY event_type, event_target
        ORDER BY count DESC
        LIMIT 25`
      )
      .bind(sinceDate)
      .all(),

    // 7. Top external referrers & UTM sources
    db
      .prepare(
        `SELECT
          COALESCE(NULLIF(utm_source, ''), NULLIF(referrer, ''), 'Direct / Bookmark') AS source,
          COUNT(*) AS views,
          COUNT(DISTINCT visitor_id) AS visitors
        FROM pageviews
        WHERE created_at >= ?1
          AND (referrer NOT LIKE 'https://jnx01.github.io%' AND referrer NOT LIKE 'http://localhost%')
        GROUP BY source
        ORDER BY visitors DESC, views DESC
        LIMIT 15`
      )
      .bind(sinceDate)
      .all(),

    // 8. Individual Visitor Profiles (most recent 60 visitors with full hardware & network ID)
    db
      .prepare(
        `SELECT *
         FROM visitors
         ORDER BY last_seen DESC
         LIMIT 60`
      )
      .all(),
  ]);

  // Fetch recent pageviews & events for those 60 visitors so each card shows their exact journey
  const visitors = recentVisitorsRows.results || [];
  const visitorIds = visitors.map((v) => v.visitor_id);

  let pageviewsByVisitor = {};
  let eventsByVisitor = {};

  if (visitorIds.length > 0) {
    const placeholders = visitorIds.map((_, i) => `?${i + 1}`).join(',');

    const [pvRes, evRes] = await Promise.all([
      db
        .prepare(
          `SELECT view_id, visitor_id, created_at, path, referrer, utm_source, active_sec, max_scroll_pct, sections_seen, viewport
           FROM pageviews
           WHERE visitor_id IN (${placeholders})
           ORDER BY created_at DESC
           LIMIT 300`
        )
        .bind(...visitorIds)
        .all(),
      db
        .prepare(
          `SELECT visitor_id, created_at, path, event_type, event_target, event_meta
           FROM events
           WHERE visitor_id IN (${placeholders})
           ORDER BY created_at DESC
           LIMIT 400`
        )
        .bind(...visitorIds)
        .all(),
    ]);

    for (const pv of pvRes.results || []) {
      (pageviewsByVisitor[pv.visitor_id] ||= []).push(pv);
    }
    for (const ev of evRes.results || []) {
      (eventsByVisitor[ev.visitor_id] ||= []).push(ev);
    }
  }

  const enrichedVisitors = visitors.map((v) => ({
    ...v,
    pageviews: pageviewsByVisitor[v.visitor_id] || [],
    events: eventsByVisitor[v.visitor_id] || [],
  }));

  return {
    totals: totalsRow || { unique_visitors: 0, total_pageviews: 0, avg_active_sec: 0, avg_scroll_pct: 0 },
    daily: dailyRows.results || [],
    topPages: topPagesRows.results || [],
    topIsps: topIspsRows.results || [],
    topLocations: topLocationsRows.results || [],
    topEvents: topEventsRows.results || [],
    topReferrers: topReferrersRows.results || [],
    visitors: enrichedVisitors,
  };
}

// -----------------------------------------------------------------------------
// Small utility helpers
// -----------------------------------------------------------------------------

function cleanStr(val, maxLen = 200) {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  return trimmed ? trimmed.slice(0, maxLen) : null;
}

function clampInt(val, min, max) {
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function parseUserAgent(ua) {
  let os = 'Unknown OS';
  if (/Windows NT 10/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Brave/i.test(ua)) browser = 'Brave';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && /Version\//i.test(ua)) browser = 'Safari';

  const deviceType = /Mobi|Android|iPhone/i.test(ua)
    ? 'mobile'
    : /iPad|Tablet/i.test(ua)
    ? 'tablet'
    : 'desktop';

  return { os, browser, deviceType };
}

// -----------------------------------------------------------------------------
// Interactive Visual Dashboard HTML (Single-File UI)
// -----------------------------------------------------------------------------

function renderDashboardHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Telemetry · Jahanzeb Naeem</title>
  <style>
    :root {
      --bg: #121210;
      --surface: #1b1b18;
      --surface-2: #232320;
      --border: #2e2e2a;
      --ink: #ecece6;
      --muted: #9a9a92;
      --accent: #8f88ff;
      --accent-dim: rgba(143, 136, 255, 0.14);
      --green: #4ade80;
      --amber: #fbbf24;
      --mono: ui-monospace, 'JetBrains Mono', SFMono-Regular, Menlo, monospace;
      --sans: -apple-system, BlinkMacSystemFont, 'Inter', Segoe UI, Roboto, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--ink);
      font-family: var(--sans);
      font-size: 14px;
      line-height: 1.5;
      padding: 24px;
      max-width: 1440px;
      margin: 0 auto;
    }
    header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
    }
    h1 { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; }
    h1 span { color: var(--accent); font-family: var(--mono); font-size: 13px; margin-left: 8px; }
    .controls { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    input, select, button {
      background: var(--surface);
      color: var(--ink);
      border: 1px solid var(--border);
      padding: 7px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-family: inherit;
    }
    button {
      cursor: pointer;
      background: var(--accent);
      color: #121210;
      font-weight: 600;
      border: none;
    }
    button.secondary {
      background: var(--surface);
      color: var(--ink);
      border: 1px solid var(--border);
    }
    button:hover { opacity: 0.92; }

    /* Stat cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }
    .kpi-label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    .kpi-value { font-size: 28px; font-weight: 700; font-family: var(--mono); margin-top: 4px; color: var(--ink); }
    .kpi-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }

    /* Layout grids */
    .grid-2 {
      display: grid;
      grid-template-columns: 1.45fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    @media (max-width: 980px) {
      .grid-2 { grid-template-columns: 1fr; }
    }
    .card-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* World Map & Bar Chart SVGs */
    .map-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 2 / 1;
      background: #151513;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid var(--border);
    }
    .map-wrap svg { width: 100%; height: 100%; display: block; }
    .pin {
      fill: var(--accent);
      stroke: #121210;
      stroke-width: 1.2;
      cursor: pointer;
      transition: r 0.15s ease;
    }
    .pin:hover { fill: var(--green); }

    .chart-bars {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: 170px;
      padding-top: 20px;
    }
    .bar-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      justify-content: flex-end;
      min-width: 12px;
    }
    .bar-fill {
      width: 100%;
      background: var(--accent);
      border-radius: 3px 3px 0 0;
      min-height: 2px;
      transition: height 0.2s ease;
    }
    .bar-label {
      font-size: 10px;
      font-family: var(--mono);
      color: var(--muted);
      margin-top: 6px;
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      max-height: 46px;
      overflow: hidden;
    }

    /* Tables */
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td {
      text-align: left;
      padding: 7px 6px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    th { color: var(--muted); font-weight: 500; font-size: 11px; text-transform: uppercase; }
    td.num, th.num { text-align: right; font-family: var(--mono); }
    .mono { font-family: var(--mono); font-size: 12px; }
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-family: var(--mono);
      font-size: 11px;
      background: var(--accent-dim);
      color: var(--accent);
    }
    .badge-green {
      background: rgba(74, 222, 128, 0.14);
      color: var(--green);
    }
    .badge-amber {
      background: rgba(251, 191, 36, 0.14);
      color: var(--amber);
    }

    /* Individual Visitor Feed */
    .visitor-list { display: flex; flex-direction: column; gap: 10px; }
    details.visitor-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    details.visitor-card[open] { border-color: var(--accent); }
    summary.visitor-summary {
      list-style: none;
      cursor: pointer;
      padding: 14px 16px;
      display: grid;
      grid-template-columns: 1.5fr 1.3fr 1.3fr 0.9fr auto;
      gap: 12px;
      align-items: center;
    }
    summary.visitor-summary::-webkit-details-marker { display: none; }
    @media (max-width: 900px) {
      summary.visitor-summary { grid-template-columns: 1fr; gap: 6px; }
    }
    .v-primary { font-weight: 600; color: var(--ink); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .v-sub { font-size: 12px; color: var(--muted); font-family: var(--mono); }
    .visitor-body {
      padding: 16px;
      border-top: 1px solid var(--border);
      background: var(--surface-2);
      display: grid;
      grid-template-columns: 1fr 1.6fr;
      gap: 20px;
    }
    @media (max-width: 900px) {
      .visitor-body { grid-template-columns: 1fr; }
    }
    .kv-list { display: grid; grid-template-columns: 120px 1fr; gap: 6px 10px; font-size: 12.5px; }
    .kv-list dt { color: var(--muted); }
    .kv-list dd { font-family: var(--mono); word-break: break-all; }
    .timeline-item {
      padding: 8px 10px;
      border-left: 2px solid var(--accent);
      background: var(--surface);
      margin-bottom: 8px;
      border-radius: 0 6px 6px 0;
      font-size: 12.5px;
    }
    .timeline-item.event-item { border-left-color: var(--green); }
    .filter-bar { margin-bottom: 12px; display: flex; gap: 10px; }
    .filter-bar input { flex: 1; }
    .empty { color: var(--muted); padding: 20px 0; text-align: center; font-style: italic; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Visitor Intelligence & Telemetry <span>Cloudflare Edge + D1</span></h1>
    </div>
    <div class="controls">
      <input type="password" id="apiKey" placeholder="Dashboard secret key..." />
      <select id="daysRange">
        <option value="7">Last 7 days</option>
        <option value="30" selected>Last 30 days</option>
        <option value="90">Last 90 days</option>
        <option value="365">Last 365 days</option>
      </select>
      <button id="loadBtn">Load Data</button>
    </div>
  </header>

  <div id="statusMsg" class="empty">Enter your DASHBOARD_KEY above to load visitor intelligence.</div>

  <main id="dashContent" style="display:none;">
    <!-- Headline KPIs -->
    <section class="kpi-grid">
      <div class="card">
        <div class="kpi-label">Unique Visitors</div>
        <div class="kpi-value" id="kpiVisitors">0</div>
        <div class="kpi-sub">Deduplicated by persistent ID + hardware hash</div>
      </div>
      <div class="card">
        <div class="kpi-label">Total Pageviews</div>
        <div class="kpi-value" id="kpiViews">0</div>
        <div class="kpi-sub">Includes Astro View Transitions</div>
      </div>
      <div class="card">
        <div class="kpi-label">Avg Active Read Time</div>
        <div class="kpi-value" id="kpiTime">0s</div>
        <div class="kpi-sub">Only counts while tab is visible</div>
      </div>
      <div class="card">
        <div class="kpi-label">Avg Max Scroll</div>
        <div class="kpi-value" id="kpiScroll">0%</div>
        <div class="kpi-sub">How far down visitors read</div>
      </div>
    </section>

    <!-- Map + Daily Activity -->
    <section class="grid-2">
      <div class="card">
        <div class="card-title">
          <span>Visitor Coordinates (Edge Geo-IP)</span>
          <span class="mono" id="pinCount">0 locations</span>
        </div>
        <div class="map-wrap">
          <svg id="worldMap" viewBox="0 0 720 360">
            <!-- Subtle lat/lon graticule lines -->
            <g stroke="#252521" stroke-width="0.6">
              <line x1="0" y1="90" x2="720" y2="90" />
              <line x1="0" y1="180" x2="720" y2="180" stroke="#2f2f29" />
              <line x1="0" y1="270" x2="720" y2="270" />
              <line x1="180" y1="0" x2="180" y2="360" />
              <line x1="360" y1="0" x2="360" y2="360" stroke="#2f2f29" />
              <line x1="540" y1="0" x2="540" y2="360" />
            </g>
            <g id="mapPins"></g>
          </svg>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          <span>Daily Traffic</span>
          <span class="mono">Views per day</span>
        </div>
        <div class="chart-bars" id="dailyChart"></div>
      </div>
    </section>

    <!-- Breakdown Tables: ISP/Org, Locations, Pages, Events -->
    <section class="grid-3">
      <div class="card">
        <div class="card-title"><span>Top ISPs / Organizations (ASN)</span></div>
        <table id="ispTable">
          <thead><tr><th>ISP / Organization</th><th class="num">Visitors</th><th class="num">Views</th><th class="num">Time</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-title"><span>Cities & Countries</span></div>
        <table id="locTable">
          <thead><tr><th>Location</th><th class="num">Visitors</th><th class="num">Views</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-title"><span>Top Pages & Read Time</span></div>
        <table id="pageTable">
          <thead><tr><th>Page</th><th class="num">Views</th><th class="num">Avg Time</th><th class="num">Scroll</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-title"><span>Key Actions & Outbound Clicks</span></div>
        <table id="eventTable">
          <thead><tr><th>Type</th><th>Target</th><th class="num">Count</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-title"><span>Referrers & Sources</span></div>
        <table id="refTable">
          <thead><tr><th>Source / Referrer</th><th class="num">Visitors</th><th class="num">Views</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </section>

    <!-- Individual Visitor Profiles & Journeys -->
    <section class="card">
      <div class="card-title">
        <span>Individual Visitor Profiles & Exact Journeys (Latest 60)</span>
        <span class="mono" id="visitorShowing"></span>
      </div>
      <div class="filter-bar">
        <input type="search" id="visitorFilter" placeholder="Filter visitors by city, ISP, company, IP, GPU, page, or event..." />
      </div>
      <div class="visitor-list" id="visitorList"></div>
    </section>
  </main>

  <script>
    const keyInput = document.getElementById('apiKey');
    const daysSelect = document.getElementById('daysRange');
    const loadBtn = document.getElementById('loadBtn');
    const statusMsg = document.getElementById('statusMsg');
    const dashContent = document.getElementById('dashContent');
    const filterInput = document.getElementById('visitorFilter');

    let cachedVisitors = [];

    // Restore key from URL ?key= or localStorage
    const urlParams = new URLSearchParams(location.search);
    const initialKey = urlParams.get('key') || localStorage.getItem('telemetry_key') || '';
    if (initialKey) {
      keyInput.value = initialKey;
      fetchStats();
    }

    loadBtn.addEventListener('click', fetchStats);
    daysSelect.addEventListener('change', fetchStats);
    keyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') fetchStats(); });
    filterInput.addEventListener('input', () => renderVisitors(cachedVisitors, filterInput.value));

    function fmtDuration(sec) {
      const s = Math.round(Number(sec) || 0);
      if (s < 60) return s + 's';
      const m = Math.floor(s / 60);
      const rem = s % 60;
      return m + 'm ' + rem + 's';
    }

    function fmtTime(iso) {
      if (!iso) return '—';
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }

    function esc(str) {
      return String(str ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    }

    async function fetchStats() {
      const key = keyInput.value.trim();
      if (!key) return;
      localStorage.setItem('telemetry_key', key);

      statusMsg.style.display = 'block';
      statusMsg.textContent = 'Loading telemetry from Cloudflare D1...';

      try {
        const res = await fetch('/api/stats?days=' + daysSelect.value, {
          headers: { Authorization: 'Bearer ' + key }
        });
        if (res.status === 401) {
          statusMsg.textContent = 'Invalid DASHBOARD_KEY. Check your secret and try again.';
          dashContent.style.display = 'none';
          return;
        }
        const data = await res.json();
        statusMsg.style.display = 'none';
        dashContent.style.display = 'block';
        renderDashboard(data);
      } catch (err) {
        statusMsg.textContent = 'Error loading stats: ' + err.message;
      }
    }

    function renderDashboard(data) {
      // KPIs
      document.getElementById('kpiVisitors').textContent = data.totals.unique_visitors || 0;
      document.getElementById('kpiViews').textContent = data.totals.total_pageviews || 0;
      document.getElementById('kpiTime').textContent = fmtDuration(data.totals.avg_active_sec);
      document.getElementById('kpiScroll').textContent = (data.totals.avg_scroll_pct || 0) + '%';

      // World map pins (equirectangular projection: lon -180..180 -> 0..720, lat 90..-90 -> 0..360)
      const pinsGroup = document.getElementById('mapPins');
      const validLocs = (data.topLocations || []).filter((l) => l.lat != null && l.lon != null);
      document.getElementById('pinCount').textContent = validLocs.length + ' cities plotted';
      pinsGroup.innerHTML = validLocs.map((loc) => {
        const x = (( Number(loc.lon) + 180) / 360) * 720;
        const y = ((90 - Number(loc.lat)) / 180) * 360;
        const r = Math.min(4 + Math.sqrt(loc.visitors) * 2.2, 14);
        return '<circle class="pin" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '">' +
          '<title>' + esc(loc.city + ', ' + loc.country + ' — ' + loc.visitors + ' visitor(s), ' + loc.views + ' views') + '</title>' +
          '</circle>';
      }).join('');

      // Daily bar chart
      const chartEl = document.getElementById('dailyChart');
      const maxViews = Math.max(...(data.daily || []).map((d) => d.views), 1);
      chartEl.innerHTML = (data.daily || []).length
        ? data.daily.map((d) => {
            const pct = Math.max((d.views / maxViews) * 100, 3);
            return '<div class="bar-col" title="' + esc(d.day + ': ' + d.views + ' views (' + d.visitors + ' unique)') + '">' +
              '<div class="bar-fill" style="height:' + pct + '%"></div>' +
              '<div class="bar-label">' + esc(d.day.slice(5)) + '</div>' +
              '</div>';
          }).join('')
        : '<div class="empty" style="width:100%">No visits recorded yet.</div>';

      // ISP Table
      document.querySelector('#ispTable tbody').innerHTML = (data.topIsps || []).map((r) =>
        '<tr>' +
          '<td><strong>' + esc(r.isp) + '</strong> <span class="mono" style="color:var(--muted)">(' + esc(r.country) + ')</span></td>' +
          '<td class="num">' + r.visitors + '</td>' +
          '<td class="num">' + r.views + '</td>' +
          '<td class="num">' + fmtDuration(r.total_sec) + '</td>' +
        '</tr>'
      ).join('') || '<tr><td colspan="4" class="empty">No data yet</td></tr>';

      // Locations Table
      document.querySelector('#locTable tbody').innerHTML = (data.topLocations || []).map((r) =>
        '<tr>' +
          '<td><strong>' + esc(r.city) + '</strong>' + (r.region ? ', ' + esc(r.region) : '') + ' · <span class="badge">' + esc(r.country) + '</span></td>' +
          '<td class="num">' + r.visitors + '</td>' +
          '<td class="num">' + r.views + '</td>' +
        '</tr>'
      ).join('') || '<tr><td colspan="3" class="empty">No data yet</td></tr>';

      // Pages Table
      document.querySelector('#pageTable tbody').innerHTML = (data.topPages || []).map((r) =>
        '<tr>' +
          '<td class="mono">' + esc(r.path) + '</td>' +
          '<td class="num">' + r.views + '</td>' +
          '<td class="num">' + fmtDuration(r.avg_sec) + '</td>' +
          '<td class="num">' + (r.avg_scroll || 0) + '%</td>' +
        '</tr>'
      ).join('') || '<tr><td colspan="4" class="empty">No data yet</td></tr>';

      // Events Table
      document.querySelector('#eventTable tbody').innerHTML = (data.topEvents || []).map((r) =>
        '<tr>' +
          '<td><span class="badge ' + (r.event_type === 'resume' ? 'badge-green' : '') + '">' + esc(r.event_type) + '</span></td>' +
          '<td class="mono">' + esc(r.event_target) + '</td>' +
          '<td class="num">' + r.count + '</td>' +
        '</tr>'
      ).join('') || '<tr><td colspan="3" class="empty">No interactions yet</td></tr>';

      // Referrers Table
      document.querySelector('#refTable tbody').innerHTML = (data.topReferrers || []).map((r) =>
        '<tr>' +
          '<td class="mono">' + esc(r.source) + '</td>' +
          '<td class="num">' + r.visitors + '</td>' +
          '<td class="num">' + r.views + '</td>' +
        '</tr>'
      ).join('') || '<tr><td colspan="3" class="empty">No referrers yet</td></tr>';

      cachedVisitors = data.visitors || [];
      renderVisitors(cachedVisitors, filterInput.value);
    }

    function renderVisitors(list, query) {
      const q = (query || '').toLowerCase().trim();
      const filtered = q
        ? list.filter((v) => JSON.stringify(v).toLowerCase().includes(q))
        : list;

      document.getElementById('visitorShowing').textContent =
        filtered.length + ' of ' + list.length + ' visitors';

      const container = document.getElementById('visitorList');
      if (!filtered.length) {
        container.innerHTML = '<div class="empty">No matching visitors found.</div>';
        return;
      }

      container.innerHTML = filtered.map((v) => {
        const loc = [v.city, v.region, v.country].filter(Boolean).join(', ');
        const hasResume = (v.events || []).some((e) => e.event_type === 'resume');
        const pvs = v.pageviews || [];
        const evs = v.events || [];

        return '<details class="visitor-card">' +
          '<summary class="visitor-summary">' +
            '<div>' +
              '<div class="v-primary">' +
                '<span>' + esc(loc || 'Unknown Location') + '</span>' +
                (v.visit_count > 1 ? '<span class="badge badge-amber">Visit #' + v.visit_count + '</span>' : '<span class="badge">New</span>') +
                (hasResume ? '<span class="badge badge-green">Opened Resume</span>' : '') +
              '</div>' +
              '<div class="v-sub">Last seen: ' + esc(fmtTime(v.last_seen)) + ' · IP: ' + esc(v.ip) + '</div>' +
            '</div>' +
            '<div>' +
              '<div><strong>' + esc(v.isp || 'Unknown ISP') + '</strong></div>' +
              '<div class="v-sub">ASN: ' + esc(v.asn || '—') + ' · Colo: ' + esc(v.colo || '—') + '</div>' +
            '</div>' +
            '<div>' +
              '<div>' + esc(v.os) + ' · ' + esc(v.browser) + ' (' + esc(v.device_type) + ')</div>' +
              '<div class="v-sub">' + esc(v.gpu ? v.gpu.slice(0, 42) : v.screen || '—') + '</div>' +
            '</div>' +
            '<div>' +
              '<div class="mono"><strong>' + fmtDuration(v.total_active_sec) + '</strong> active</div>' +
              '<div class="v-sub">' + pvs.length + ' page(s) · ' + evs.length + ' action(s)</div>' +
            '</div>' +
            '<div class="mono" style="color:var(--accent)">Details ▾</div>' +
          '</summary>' +
          '<div class="visitor-body">' +
            '<div>' +
              '<div class="card-title">Hardware & Network Fingerprint</div>' +
              '<dl class="kv-list">' +
                '<dt>Visitor ID</dt><dd>' + esc(v.visitor_id) + '</dd>' +
                '<dt>Hardware Hash</dt><dd>' + esc(v.hw_hash || '—') + '</dd>' +
                '<dt>IP Address</dt><dd>' + esc(v.ip) + '</dd>' +
                '<dt>ISP / Org</dt><dd>' + esc(v.isp) + ' (AS' + esc(v.asn || '?') + ')</dd>' +
                '<dt>Location</dt><dd>' + esc(loc) + ' ' + esc(v.postal_code || '') + '</dd>' +
                '<dt>Coordinates</dt><dd>' + esc(v.latitude ?? '—') + ', ' + esc(v.longitude ?? '—') + '</dd>' +
                '<dt>Timezone</dt><dd>' + esc(v.browser_tz || v.cf_timezone || '—') + '</dd>' +
                '<dt>OS / Browser</dt><dd>' + esc(v.os + ' / ' + v.browser) + '</dd>' +
                '<dt>GPU Renderer</dt><dd>' + esc(v.gpu || '—') + '</dd>' +
                '<dt>CPU / RAM</dt><dd>' + esc((v.cpu_cores || '?') + ' cores / ' + (v.ram_gb ? v.ram_gb + ' GB' : '?')) + '</dd>' +
                '<dt>Screen / Theme</dt><dd>' + esc((v.screen || '—') + ' · ' + (v.theme || '—')) + '</dd>' +
                '<dt>Connection</dt><dd>' + esc(v.connection || '—') + '</dd>' +
                '<dt>Language</dt><dd>' + esc(v.language || '—') + '</dd>' +
                '<dt>First Seen</dt><dd>' + esc(fmtTime(v.first_seen)) + '</dd>' +
              '</dl>' +
            '</div>' +
            '<div>' +
              '<div class="card-title">Chronological Page & Interaction Journey</div>' +
              renderJourney(pvs, evs) +
            '</div>' +
          '</div>' +
        '</details>';
      }).join('');
    }

    function renderJourney(pvs, evs) {
      const items = [
        ...pvs.map((p) => ({ kind: 'page', ts: p.created_at, data: p })),
        ...evs.map((e) => ({ kind: 'event', ts: e.created_at, data: e }))
      ].sort((a, b) => (a.ts < b.ts ? 1 : -1));

      if (!items.length) return '<div class="empty">No recorded timeline items.</div>';

      return items.map((item) => {
        if (item.kind === 'page') {
          const p = item.data;
          let sections = [];
          try { sections = JSON.parse(p.sections_seen || '[]'); } catch {}
          return '<div class="timeline-item">' +
            '<div style="display:flex;justify-content:space-between;gap:8px;">' +
              '<strong class="mono">' + esc(p.path) + '</strong>' +
              '<span class="mono" style="color:var(--muted)">' + esc(fmtTime(p.created_at)) + '</span>' +
            '</div>' +
            '<div class="mono" style="font-size:11.5px;color:var(--muted);margin-top:3px;">' +
              'Active: <strong style="color:var(--ink)">' + fmtDuration(p.active_sec) + '</strong> · ' +
              'Max Scroll: <strong style="color:var(--ink)">' + (p.max_scroll_pct || 0) + '%</strong>' +
              (p.referrer ? ' · Ref: ' + esc(p.referrer) : '') +
              (p.utm_source ? ' · Source: ' + esc(p.utm_source) : '') +
            '</div>' +
            (sections.length ? '<div class="mono" style="font-size:11px;color:var(--accent);margin-top:3px;">Sections read: ' + esc(sections.join(' → ')) + '</div>' : '') +
          '</div>';
        } else {
          const e = item.data;
          return '<div class="timeline-item event-item">' +
            '<div style="display:flex;justify-content:space-between;gap:8px;">' +
              '<span><span class="badge badge-green">' + esc(e.event_type) + '</span> <strong class="mono">' + esc(e.event_target || '') + '</strong></span>' +
              '<span class="mono" style="color:var(--muted)">' + esc(fmtTime(e.created_at)) + '</span>' +
            '</div>' +
            '<div class="mono" style="font-size:11px;color:var(--muted);margin-top:2px;">On page: ' + esc(e.path) + '</div>' +
          '</div>';
        }
      }).join('');
    }
  </script>
</body>
</html>`;
}
