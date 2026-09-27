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

// ---- Analytics (GoatCounter) -------------------------------------------------
// Privacy-friendly, cookie-free visitor analytics. No personal data collected.
// To enable: sign up free at goatcounter.com, pick your site code (the
// subdomain, e.g. 'jnx01'), set it below, and flip ENABLED to true.
// To disable: flip ENABLED to false and rebuild — no tracking script loads.
export const ANALYTICS = {
  ENABLED: true,
  // Your GoatCounter site code (the part before .goatcounter.com).
  GOATCOUNTER_CODE: 'jnx01',
};
