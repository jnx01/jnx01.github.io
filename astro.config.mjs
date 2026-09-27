// Astro configuration.
// Docs: https://docs.astro.build/en/reference/configuration-reference/
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

export default defineConfig({
  // The final public URL of the site (GitHub Pages user site).
  // Astro uses this to build canonical URLs and the sitemap.
  site: 'https://jnx01.github.io',

  integrations: [
    // Generates sitemap-index.xml automatically on every build.
    sitemap(),
    // MDX lets case studies embed interactive components (the experiment
    // figures) inline in the Markdown body.
    mdx(),
  ],
});
