/**
 * Content collections — typed schemas for the site's recurring content.
 * Strategy reference: §Q (Content Schemas).
 *
 * Each case study is a Markdown file in src/content/work/ with frontmatter
 * validated against the schema below. Adding a new case study = adding one
 * Markdown file; no page redesign needed (strategy §19).
 */
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const work = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    // 'industry' = production work, 'research' = shipped research,
    // 'experiment' = self-directed study.
    kind: z.enum(['industry', 'research', 'experiment']),
    // Lower weight = shown first / larger. Teradata=1, SignChatter=2, Experiments=3.
    weight: z.number(),
    // One-sentence summary shown on cards and the work index.
    summary: z.string(),
    // Technologies, shown as a quiet stack line.
    stack: z.array(z.string()),
    // External links (GitHub, paper, dataset, demos).
    links: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
    // True for Teradata: content stays at safe abstraction, no client names.
    confidential: z.boolean().default(false),
    // Featured items appear on the homepage "Selected work" section.
    featured: z.boolean().default(false),
  }),
});

// Notes: occasional technical writing (strategy §D). Sparse by design — no
// tags, no RSS promise, no date-pressure UI. `draft: true` hides a note.
const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { work, notes };
