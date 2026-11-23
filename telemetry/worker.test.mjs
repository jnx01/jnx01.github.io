// Tests for the telemetry Worker, run against a real in-memory SQLite database
// built from schema.sql (stands in for Cloudflare D1). No dependencies.
//
//   node --test telemetry/worker.test.mjs      (or: npm run test:telemetry)
//
// Why this exists: on 2026-10-28 an edit deleted variables that /collect used
// to save pageviews. The browser still got a 204 (the DB write runs in the
// background), so nothing looked wrong and four weeks of pageviews were lost.
// These tests send real beacons and check that the rows actually land.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from './worker.js';

const SCHEMA = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
const ORIGIN = 'https://jnx01.github.io';
const HUMAN_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
// What Cloudflare attaches to request.cf at the edge.
const HOME_CF = {
  asOrganization: 'PTCL',
  asn: 17557,
  city: 'Islamabad',
  region: 'Islamabad',
  country: 'PK',
  latitude: '33.7',
  longitude: '73.1',
  timezone: 'Asia/Karachi',
  colo: 'KHI',
};

// Minimal D1 adapter over node:sqlite (D1 uses ?1, ?2 ... placeholders).
function d1(db) {
  return {
    prepare(sql) {
      let args = [];
      const exec = () => {
        const params = {};
        args.forEach((v, i) => {
          if (sql.includes(`?${i + 1}`)) params[`p${i + 1}`] = v === undefined ? null : v;
        });
        return [db.prepare(sql.replace(/\?(\d+)/g, ':p$1')), params];
      };
      const stmt = {
        bind: (...a) => ((args = a), stmt),
        run: async () => { const [s, p] = exec(); return s.run(p); },
        first: async () => { const [s, p] = exec(); return s.get(p) ?? null; },
        all: async () => { const [s, p] = exec(); return { results: s.all(p) }; },
      };
      return stmt;
    },
    batch: async (stmts) => Promise.all(stmts.map((s) => s.run())),
  };
}

function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(SCHEMA);
  const env = { DB: d1(db), ALLOWED_ORIGINS: ORIGIN, DASHBOARD_KEY: 'test-key' };
  const pending = [];
  const ctx = { waitUntil: (p) => pending.push(p) };
  const errors = [];

  // Send a beacon exactly like the site does, then wait for the background write.
  async function beacon(body, { ua = HUMAN_UA, cf = HOME_CF } = {}) {
    const req = new Request('https://telemetry.test/collect', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { Origin: ORIGIN, 'User-Agent': ua, 'Content-Type': 'text/plain;charset=UTF-8' },
    });
    Object.defineProperty(req, 'cf', { value: cf });
    const realError = console.error;
    console.error = (...a) => errors.push(a.join(' '));
    try {
      const res = await worker.fetch(req, env, ctx);
      await Promise.all(pending.splice(0));
      return res;
    } finally {
      console.error = realError;
    }
  }

  async function stats() {
    const res = await worker.fetch(new Request('https://telemetry.test/api/stats?key=test-key'), env, ctx);
    assert.equal(res.status, 200);
    return res.json();
  }

  return { db, env, ctx, errors, beacon, stats };
}

const pageview = (over = {}) => ({
  type: 'pageview',
  visitorId: 'v-human',
  isNewVisitor: true,
  sessionId: 's1',
  isNewSession: true,
  viewId: 'pv-1',
  hwHash: 'hw1',
  path: '/',
  title: 'Home',
  theme: 'light',
  ...over,
});

test('a pageview beacon stores the visitor and the pageview with edge geo data', async () => {
  const t = setup();
  const res = await t.beacon(pageview());
  assert.equal(res.status, 204);
  assert.deepEqual(t.errors, [], 'handleCollect logged an error');

  const v = t.db.prepare('SELECT * FROM visitors WHERE visitor_id = ?').get('v-human');
  assert.ok(v, 'visitor row was not written');
  assert.equal(v.city, 'Islamabad');
  assert.equal(v.isp, 'PTCL');
  assert.equal(v.is_bot, 0);

  const p = t.db.prepare('SELECT * FROM pageviews WHERE view_id = ?').get('pv-1');
  assert.ok(p, 'pageview row was not written');
  assert.equal(p.path, '/');
  assert.equal(p.country, 'PK');
});

test('heartbeats update read time and scroll, and save click events', async () => {
  const t = setup();
  await t.beacon(pageview());
  await t.beacon({
    type: 'heartbeat',
    visitorId: 'v-human',
    sessionId: 's1',
    viewId: 'pv-1',
    path: '/',
    activeSec: 12,
    scrollPct: 40,
    sections: ['work'],
    theme: 'light',
    events: [{ type: 'nav', target: 'Work', path: '/', meta: { href: '/work/' } }],
  });
  assert.deepEqual(t.errors, []);

  const p = t.db.prepare('SELECT active_sec, max_scroll_pct FROM pageviews WHERE view_id = ?').get('pv-1');
  assert.equal(p.active_sec, 12);
  assert.equal(p.max_scroll_pct, 40);
  assert.equal(t.db.prepare('SELECT total_active_sec FROM visitors').get().total_active_sec, 12);
  assert.equal(t.db.prepare('SELECT COUNT(*) AS n FROM events').get().n, 1);
});

test('a returning visitor adds a pageview without adding a unique visitor', async () => {
  const t = setup();
  await t.beacon(pageview());
  await t.beacon(pageview({ viewId: 'pv-2', isNewVisitor: false, isNewSession: true, path: '/about/' }));

  const s = await t.stats();
  assert.equal(s.totals.unique_visitors, 1);
  assert.equal(s.totals.total_pageviews, 2);
  assert.equal(s.visitors[0].visit_count, 2);
  assert.equal(s.visitors[0].pageviews.length, 2);
});

test('headline stats exclude bots and reconstructed rows, but the visitor list shows them', async () => {
  const t = setup();
  await t.beacon(pageview());
  await t.beacon(pageview({ visitorId: 'v-crawler', viewId: 'pv-bot', hwHash: 'hw-bot' }), {
    cf: { ...HOME_CF, asOrganization: 'Microsoft Corporation' },
  });
  await t.beacon(pageview({ visitorId: 'v-headless', viewId: 'pv-wd', hwHash: 'hw-wd', webdriver: true }));
  t.db.exec(`
    INSERT INTO visitors (visitor_id, first_seen, last_seen, reconstructed)
      VALUES ('v-recon', '2026-11-01T00:00:00Z', '2026-11-01T00:00:00Z', 1);
    INSERT INTO pageviews (view_id, visitor_id, session_id, created_at, updated_at, path, reconstructed)
      VALUES ('pv-recon', 'v-recon', 'reconstructed', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
              strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), '/notes/', 1);
  `);

  const bots = t.db.prepare('SELECT visitor_id FROM visitors WHERE is_bot = 1 ORDER BY visitor_id').all();
  assert.deepEqual(bots.map((b) => b.visitor_id), ['v-crawler', 'v-headless']);

  const s = await t.stats();
  assert.equal(s.totals.unique_visitors, 1);
  assert.equal(s.totals.total_pageviews, 1);
  assert.deepEqual(s.topPages.map((p) => p.path), ['/']);
  assert.equal(s.visitors.length, 4);
});

test('stats require the dashboard key', async () => {
  const t = setup();
  const res = await worker.fetch(new Request('https://telemetry.test/api/stats?key=wrong'), t.env, t.ctx);
  assert.equal(res.status, 401);
});

test('the dashboard page script is valid JavaScript', async () => {
  const t = setup();
  const html = await (await worker.fetch(new Request('https://telemetry.test/'), t.env, t.ctx)).text();
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.ok(scripts.length > 0, 'no inline script found');
  for (const js of scripts) new Function(js);
});
