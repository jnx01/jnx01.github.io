# jnx01.github.io — Personal Website

The personal website of **Jahanzeb Naeem**, AI engineer. A static site built
with Astro, deployed to GitHub Pages.

Live at **https://jnx01.github.io**.

---

## Quick start

```bash
npm install     # install dependencies
npm run dev     # local dev server → http://localhost:4321
npm run build   # production build → dist/
npm run preview # preview the production build locally
```

---

## Documentation

- **`docs/01-how-it-works.md`** — high-level architecture and how the pieces
  fit. Start here if you're new to the project.
- **`docs/02-editing-and-maintenance.md`** — step-by-step recipes for common
  tasks (update the headshot, add a note, change text, deploy).
- **`requirements.txt`** — every dependency and why it's included.
- **`planning/`** — the architecture doc (`ARCHITECTURE.md`) and the working
  log (`WORKING-NOTES.md`) the site was built from.

---

## Tech stack

| Piece | Choice | Why |
|---|---|---|
| Framework | **Astro** | Content-driven static sites; ships near-zero JS; first-class content collections and GitHub Pages support |
| Content | **Markdown / MDX** | Case studies and notes are plain files; MDX lets them embed interactive charts inline |
| Styling | **Vanilla CSS** (custom properties) | The design is bespoke and small — no framework needed; tokens keep it consistent |
| Fonts | **Fontsource variable fonts** | Self-hosted Newsreader / Inter / JetBrains Mono (+ Caveat for the avatar greeting) — no external requests, one file per family |
| Language | **TypeScript** (strict) | Type-safe content schemas and component props |
| Images | **sharp** (bundled with Astro) | Crops/grades/exports the headshot and screenshots to AVIF/WebP/JPEG |
| Analytics | **GoatCounter** | Privacy-friendly, cookie-free visitor stats; one toggle in `src/site.config.ts` |
| Hosting | **GitHub Pages + Actions** | Free static hosting; the workflow builds and deploys on every push to `main` |

## Dependencies

See `requirements.txt` for the annotated list. The short version: `astro` +
official `sitemap` and `mdx` integrations + three Fontsource font packages +
`typescript` (dev). `sharp` comes bundled with Astro and powers the image
pipeline.

## Repository layout

```
src/pages/       one file per page
src/layouts/     shared page shells (Base, CaseStudy)
src/components/  reusable UI (Nav, Footer, Card, Tag, charts…)
src/content/     case studies + notes (Markdown/MDX)
src/styles/      design tokens + base/typography/layout/motion
src/site.config.ts  single source of truth for the resume link, email, social URLs, analytics
public/          static assets served as-is
scripts/         one-off helpers (headshot pipeline, keypoints extraction)
docs/            how-it-works + editing/maintenance guides
planning/        architecture doc + working notes

# Local-only (gitignored, not in the public repo):
assets-source/   original resumes/headshot/photos
.venv-signs/     local Python env for the keypoints script (regenerable)
```

## Design principles

- **Engineered evidence** — every claim is backed by an artifact (a shipped
  product, a repo, a paper, a number).
- **Restraint** — light-first, generous whitespace, one accent color, motion
  that explains rather than decorates. An optional dark theme is available
  from the light-bulb toggle in the nav.
- **Accessible & fast** — semantic HTML, keyboard-navigable, reduced-motion
  support, near-zero JavaScript.

## Deployment

Push to `main` → the GitHub Actions workflow
(`.github/workflows/deploy.yml`) builds the site and deploys it to GitHub
Pages. One-time setup: in the repo, **Settings → Pages → Source → GitHub
Actions**.
