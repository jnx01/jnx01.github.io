# Visitor Analytics & Dashboard (Cloudflare Worker + D1)

A lightweight, cookie-free, first-party analytics service and visual dashboard built on **Cloudflare Workers** and **Cloudflare D1** (SQLite).

## Overview
- **`POST /collect`**: Receives pageview and interaction beacons from the site.
- **`GET /`**: Serves a password-protected dashboard summarizing traffic, engagement, and visitor sessions.
- **`GET /api/stats`**: JSON endpoint backing the dashboard (requires `DASHBOARD_KEY`).

---

## Setup & Deployment Commands

Run these commands inside the `telemetry/` directory:

```bash
cd telemetry
```

### Step 1: Log in to Cloudflare
```bash
npx wrangler login
```
*(This opens a browser tab to sign into or create your free Cloudflare account.)*

### Step 2: Create the free D1 SQLite database
```bash
npx wrangler d1 create site-telemetry-db
```
Copy the `database_id` UUID printed in the terminal and paste it into `telemetry/wrangler.toml` where it says `REPLACE_WITH_YOUR_D1_DATABASE_ID`.

### Step 3: Initialize the database tables
```bash
npx wrangler d1 execute site-telemetry-db --remote --file=./schema.sql
```

### Step 4: Set your private dashboard password
```bash
npx wrangler secret put DASHBOARD_KEY
```
*(Type any strong password when prompted. You will use this to view the visual dashboard.)*

### Step 5: Deploy the Worker
```bash
npx wrangler deploy
```
Wrangler will print your live Worker URL, for example:
`https://site-telemetry.<your-subdomain>.workers.dev`

### Step 6: Connect your Astro site
Open `src/site.config.ts` and paste your Worker's `/collect` URL into `TELEMETRY_ENDPOINT`:
```ts
export const ANALYTICS = {
  TELEMETRY_ENDPOINT: 'https://site-telemetry.<your-subdomain>.workers.dev/collect',
  GOATCOUNTER_ENABLED: false,
  GOATCOUNTER_CODE: 'jnx01',
};
```

Open `https://site-telemetry.<your-subdomain>.workers.dev` in your browser, enter your `DASHBOARD_KEY`, and watch live visits roll in!
