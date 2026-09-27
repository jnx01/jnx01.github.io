# How This Website Works

A high-level tour of the site — what it is, how it's put together, and how the
pieces fit. No prior experience with the tools assumed.

---

## What it is

A personal website for Jahanzeb Naeem, an AI engineer. It's a **static site**:
every page is turned into plain HTML ahead of time, so there's no server to
run and nothing to hack. It loads fast and hosts for free on GitHub Pages.

It's built with **Astro**, a tool that takes components and content files and
compiles them into HTML, CSS, and a tiny bit of JavaScript.

---

## The big picture

```
Content (Markdown)  +  Components (.astro)  +  Styles (CSS)
        │                     │                      │
        └──────────┬──────────┴──────────┬───────────┘
                   ▼                     ▼
              Astro builds the site  →  plain HTML/CSS/JS in dist/
                   │
                   ▼
         GitHub Pages serves dist/ to the world
```

You write content and components; Astro assembles them into finished pages;
GitHub Pages hosts the result. That's the whole loop.

---

## The folder layout

```
├── src/
│   ├── pages/        ← one file per page (the URL matches the filename)
│   ├── layouts/      ← shared page shells (header, footer, SEO tags)
│   ├── components/   ← reusable building blocks (nav, cards, charts…)
│   ├── content/      ← the writing: case studies and notes (Markdown)
│   ├── styles/       ← the design system (colors, fonts, spacing, motion)
│   └── site.config.ts ← one place for values that change: resume link, email, social URLs
├── public/           ← files served as-is (images, favicon, robots.txt)
├── assets-source/    ← originals (resumes, headshot) — NOT published
├── planning/         ← strategy docs and working notes — NOT published
├── scripts/          ← one-off helpers (e.g. preparing the headshot)
└── dist/             ← the built site (generated; never edit by hand)
```

---

## How a page is made

Every page follows the same recipe:

1. **A page file** in `src/pages/` (e.g. `about.astro` becomes `/about/`).
2. It wraps itself in the **Base layout** (`src/layouts/Base.astro`), which
   adds the `<head>` (title, description, social tags), the top navigation,
   the footer, and the reveal-on-scroll script.
3. The page fills the layout with its own content, built from **components**
   (like `Card` or `Tag`) and styled by the shared **design tokens**.

So a page is mostly: "Base layout + some content + a few components."

---

## The two kinds of content

Some content is written directly into a page (the homepage, About). Other
content is **data-driven** so it's easy to add more without touching design:

- **Case studies** live as Markdown files in `src/content/work/`. One file =
  one case study. A single dynamic route (`src/pages/work/[...slug].astro`)
  turns each file into a page at `/work/<name>/`.
- **Notes** work the same way in `src/content/notes/`.

This means adding a new case study or note is just adding one Markdown file —
no new page code needed.

Separately, a few values that appear in many places and change over time — the
resume link, the email address, the social URLs — live in **one file**,
`src/site.config.ts`. Edit the value there and every page picks it up on the
next build.

---

## The design system

All visual decisions are defined **once** in `src/styles/tokens.css` as CSS
variables (colors, font sizes, spacing). Everything else references those
variables, so the whole site stays consistent — and restyling means editing
one file.

- **Colors:** warm off-white background, near-black text, one indigo accent.
- **Fonts:** Newsreader (headlines), Inter (body), JetBrains Mono (data).
- **Motion:** a small shared vocabulary (fade/rise reveals, a self-drawing
  diagram, animated charts), all of it disabled for users who prefer reduced
  motion.

---

## The interactive bits

The site is deliberately light on JavaScript. The few dynamic behaviors:

- **Reveal on scroll** — elements gently fade/rise in as you scroll.
- **Page transitions** — navigating between pages cross-fades instead of a
  hard reload.
- **Animated figures** — the research diagram and experiment charts draw
  themselves when they scroll into view.

All of these are progressive enhancements: with JavaScript off or reduced
motion on, every page still shows its full content.

---

## In one sentence

You write content and components, Astro compiles them into a fast static site,
and GitHub Pages serves it — with the design defined once as tokens and the
recurring content (case studies, notes) driven by simple Markdown files.
