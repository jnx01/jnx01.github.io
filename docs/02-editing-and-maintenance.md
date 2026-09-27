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

That's it — the hero and About page update automatically.

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

1. To **edit** one, open `teradata.md`, `signchatter.md`, or
   `experiments.mdx` and change the text.
2. To **add** a new one, create a new `.md` file with frontmatter:

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

## 5. Change colors, fonts, or spacing

All design tokens live in `src/styles/tokens.css`.

1. Open that file.
2. Edit the variable you want — e.g. `--color-accent: #4f46e5;` changes the
   indigo accent everywhere it's used.
3. Save. The whole site updates consistently.

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
- **Build fails:** read the error message — it names the file and line. Most
  often it's a typo in a frontmatter block (missing quote or colon).
- **A note/case study isn't appearing:** check that `draft: false` and that
  the frontmatter matches the required fields exactly.
