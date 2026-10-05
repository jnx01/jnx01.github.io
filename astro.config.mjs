// Astro configuration.
// Docs: https://docs.astro.build/en/reference/configuration-reference/
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { satteri } from '@astrojs/markdown-satteri';
import { defineHastPlugin } from 'satteri';

// Markdown plugin: every link inside Markdown/MDX content (notes, case
// studies) that points to another site opens in a new tab.
// rel="noopener noreferrer" is the security baseline for target="_blank".
const externalLinksNewTab = defineHastPlugin({
  name: 'external-links-new-tab',
  element: {
    filter: ['a'], // only run on <a> tags
    visit(node, ctx) {
      const href = node.properties.href;
      // Internal links start with "/" or "#"; external ones start with "http".
      if (typeof href === 'string' && href.startsWith('http')) {
        ctx.setProperty(node, 'target', '_blank');
        ctx.setProperty(node, 'rel', 'noopener noreferrer');
      }
    },
  },
});

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

  markdown: {
    processor: satteri({
      hastPlugins: [externalLinksNewTab],
    }),
  },
});
