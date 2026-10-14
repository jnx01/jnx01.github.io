/**
 * Site-wide constants — values that appear in more than one place and change
 * over time. Update them here once and they update everywhere.
 *
 * To update the resume link: change RESUME_URL below and rebuild. Every page
 * that links to the resume (homepage, contact, about) picks it up automatically.
 */

// The read-only Google Drive link to the current resume PDF.
export const RESUME_URL =
  'https://drive.google.com/file/d/1w_O62eYCbF0_oNYVTAWY2b8Hq0ABscgW/view?usp=sharing';

// The obfuscated email address shown on the site (not a mailto: link).
export const EMAIL_DISPLAY = 'naeemjahanzeb[at]gmail[dot]com';

// Social profile links.
export const LINKEDIN_URL = 'https://www.linkedin.com/in/jna1';
export const GITHUB_URL = 'https://github.com/jnx01';

// ---- Analytics --------------------------------------------------------------
// 1. First-party Cloudflare Worker + D1 analytics (see telemetry/README.md):
//    Set TELEMETRY_ENDPOINT to your deployed Worker's `/collect` URL.
//    Leave empty ('') to disable.
//
// 2. GoatCounter (legacy aggregate counter):
//    Disabled by default.
export const ANALYTICS = {
  TELEMETRY_ENDPOINT: 'https://site-telemetry.jnx01-github-io.workers.dev/collect',
  GOATCOUNTER_ENABLED: false,
  GOATCOUNTER_CODE: 'jnx01',
};
