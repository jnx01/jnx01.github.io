# Editing & Maintaining the Site

Step-by-step recipes for the common tasks. Each one assumes you're in the
project folder in a terminal.

**First time setup:**

```bash
npm install     # install dependencies (once)
npm run dev     # start a local preview at http://localhost:4321
```

Make your edits, then check them in the browser. When happy:

```bash
npm run build   # produce the production site in dist/
```

---

## 1. Change text on the homepage (or any page)

The homepage is `src/pages/index.astro`. Other top-level pages are
`about.astro`, `research.astro`, `contact.astro`, `notes/index.astro`.

1. Open the file.
2. Find the text you want to change (it's plain HTML-like markup).
3. Edit the words between the tags.
4. Save, and the dev server reloads automatically.

Example — to change the hero statement, find:

```astro
<h1 class="hero-statement" data-reveal>
  I build and evaluate AI systems that have to work outside the notebook.
</h1>
```

and edit the sentence.

---

## 2. Update the headshot

The original photo lives at `assets-source/headshot.png`. The web-ready
versions are generated from it.

1. Replace `assets-source/headshot.png` with your new photo (keep the same
   filename).
2. Run the pipeline to regenerate the cropped/graded web versions:

   ```bash
   node scripts/prepare-headshot.mjs
   ```

3. Rebuild: `npm run build`.

That's it — the homepage hero updates automatically. (The About page uses the
talk photo instead — see the next section.)

---

## 2b. Update the talk photo

The talk photo (homepage "The person" section + About page) was prepared by
hand — there is no script for it. The original is `assets-source/talk.jpeg`;
the web versions are `public/images/talk-1000.*` and `talk-2000.*`
(AVIF/WebP/JPEG, 1000w and 2000w).

To replace it: crop/brighten the new photo to a 3:2 landscape, export the six
files with the same names into `public/images/`, and rebuild.

---

## 3. Add a note

Notes are Markdown files in `src/content/notes/`.

1. Create a new file, e.g. `src/content/notes/my-note.md`.
2. Start it with frontmatter (the metadata between the `---` lines):

   ```markdown
   ---
   title: "My note title"
   date: 2026-10-01
   summary: "One sentence about the note."
   draft: false
   ---

   Write the note here in Markdown.
   ```

3. Set `draft: true` to keep it hidden while you work; flip to `false` to
   publish.
4. Rebuild. The note appears on `/notes/` and at `/notes/my-note/`.

---

## 4. Add or edit a case study

Case studies are Markdown/MDX files in `src/content/work/`.

1. To **edit** one, open `teradata.mdx`, `signchatter.mdx`, or
   `experiments.mdx` and change the text.
2. To **add** a new one, create a new `.mdx` file with frontmatter:

   ```markdown
   ---
   title: "My project"
   kind: research            # industry | research | experiment
   weight: 4                 # lower = shown first
   summary: "One sentence."
   stack: ["Python", "PyTorch"]
   links:
     - label: "GitHub"
       url: "https://github.com/…"
   confidential: false
   featured: false
   ---

   ## Context
   Write the case study here.
   ```

3. Rebuild. It appears on `/work/` and at `/work/<filename>/` automatically.

---

## 4b. Add a figure to a case study

Figures (charts, grids, diagrams) are components in `src/components/figures/`.
Because they are components, the case study file must be `.mdx` (plain `.md`
can't import components).

1. In the case study's frontmatter area (top of the file), import the figure:

   ```mdx
   import RoutingCurve from '../../components/figures/RoutingCurve.astro';
   ```

2. Drop it into the body where it belongs: `<RoutingCurve />`
3. Rebuild.

**Every number in a figure must be real** — traceable to a repo artifact.
The data lives as constants at the top of the figure's file, with a comment
citing the source repo.

---

## 4c. Update the routing chart data

The budgeted-model-routing numbers appear in three places (the full chart on
`/work/experiments`, the small copy on the homepage laptop screen, and the
small chart on `/research`). They all read from ONE file:
`src/components/figures/routing-data.ts`. Edit the numbers there and all
three charts update on the next build.

(The interactive budget slider has its own copy inside its client-side
script — it can't import at runtime. If you change the routing data, update
the slider's script copy too; the comment in the file marks it.)

---

## 5. Change colors, fonts, or spacing

All design tokens live in `src/styles/tokens.css`.

1. Open that file.
2. Edit the variable you want — e.g. `--color-accent: #4f46e5;` changes the
   indigo accent everywhere it's used.
3. Save. The whole site updates consistently.

**Dark theme:** the same variables are defined a second time under
`[data-theme='dark']` in the same file. If you change a light-theme color,
check whether the dark-theme version needs a matching tweak. Test both themes
with the light-bulb toggle in the nav.

---

## 6. Update contact links, the resume link, or the footer

**The resume link, email address, and social URLs live in ONE place:**
`src/site.config.ts`. To update the resume (or any of these), edit the value
there and rebuild — every page picks it up automatically:

```ts
export const RESUME_URL = 'https://…your-new-link…';
```

Other contact spots:
- Contact page layout: `src/pages/contact.astro`.
- Footer (on every page): `src/components/Footer.astro`.
- Top navigation items: `src/components/Nav.astro` (the `items` list).

**Analytics** also live in `src/site.config.ts`: to turn visitor tracking off,
set `ANALYTICS.ENABLED` to `false` and rebuild — no tracking script loads.

---

## 6b. The homepage journey (the scroll laptop)

The homepage has a scroll-driven laptop that travels down the page on wide
screens (≥1100px, JS on, motion allowed). It is self-contained in
`src/pages/index.astro` (the engine script + styles) plus two components:
`src/components/Laptop.astro` (the drawing) and
`src/components/LaptopScreens.astro` (the screen pictures).

- **To change what a screen shows:** edit `LaptopScreens.astro`. Rule: every
  screen must be a small copy of something real that is already on the site.
- **To change the journey (timing, poses, stops):** edit the `LOOKS` table
  and the waypoint code in `index.astro`'s journey script — the comments
  explain each step in plain language.
- **To disable it entirely:** the laptop, path, and section tint are already
  gated behind `(min-width: 1100px) and (prefers-reduced-motion: no-preference)`
  plus the `js` class. To turn it off for everyone, remove the
  `data-journey-laptop` / `data-journey-path` markup and the two `<script>`
  blocks (focus tint + journey engine) from `index.astro` — the page falls
  back to the plain layout automatically.

---

## 7. Deploy (publish) the site

The site deploys to GitHub Pages automatically via the workflow in
`.github/workflows/deploy.yml`.

**One-time setup:**

1. Push this repository to GitHub as `jnx01/jnx01.github.io`.
2. In the repo on GitHub: **Settings → Pages → Source → GitHub Actions**.

**Every update after that:**

```bash
git add -A
git commit -m "Describe your change"
git push origin main
```

Pushing to `main` triggers the workflow, which builds the site and publishes
it to `https://jnx01.github.io`. No manual build step needed.

---

## 8. Regenerate the social preview image (optional)

The link-preview image is `public/images/og.jpg`. If you change the headshot
and want the social card to match, re-run the og-image step (see
`scripts/` or ask for the command) and rebuild.

---

## Troubleshooting

- **A change isn't showing up:** make sure you saved the file, and that the
  dev server is running (`npm run dev`). For production, always `npm run build`.
  If you're using `npm run preview`, remember it serves the LAST build and does
  NOT rebuild on change — and an old preview server can keep running on a port
  even after you rebuild. If the page looks stale or is missing recent work,
  stop the old server (`npx astro preview stop`), rebuild, and start it again.
- **Build fails:** read the error message — it names the file and line. Most
  often it's a typo in a frontmatter block (missing quote or colon).
- **A note/case study isn't appearing:** check that `draft: false` and that
  the frontmatter matches the required fields exactly.
- **An `import` in a case study renders as literal text:** the file is `.md`,
  not `.mdx`. Rename it to `.mdx` (only MDX files can import components), then
  restart the dev server (it caches aggressively).
- **Animations or the laptop break after clicking an internal link:** the site
  uses view transitions, which swap the page's DOM. Any new script you add must
  initialize on `astro:page-load` (not just on first load) and clean up on
  `astro:before-swap` — copy the pattern from an existing script in
  `Base.astro` or `index.astro`.
