# Architecture & Design Rules

The single reference for how this site is built and why. Everything here was
verified against the actual code on 2026-10-03. If the code and this document
ever disagree, the code is right — fix this file.

For step-by-step recipes (add a note, change the headshot, deploy), see
`docs/02-editing-and-maintenance.md`. For the decision log, see
`planning/WORKING-NOTES.md`.

---

## 1. What this site is

A personal website for Jahanzeb Naeem, AI engineer. A **static site** built
with **Astro**: every page is compiled to plain HTML ahead of time, so there
is no server to run and nothing to hack. It loads fast and hosts free on
GitHub Pages.

**Core concept: "Engineered evidence."** Every claim on the site is backed by
an artifact — a shipped product, a repo, a dataset, a paper, a number. The
site is not a resume rendered as HTML, not a blog, not a personal-brand
vehicle. It is a small, dense, beautifully made portfolio of proof.

**One-sentence identity:** *AI engineer who builds production systems and
runs honest experiments on making them efficient and reliable.*

**Positioning:** high-end AI engineer + emerging researcher. The homepage's
30-second impression should be: "This person ships real AI systems and thinks
about them rigorously."

**Never said:** "cracked", "passionate", "leveraging cutting-edge",
Master's-seeking, guru/influencer framing.

---

## 2. Tech stack

| Piece | Choice | Why |
|---|---|---|
| Framework | **Astro 7** | Content-driven static sites; ships near-zero JS; first-class content collections and GitHub Pages support |
| Content | **Markdown / MDX** | Case studies and notes are plain files; MDX lets them embed interactive figures inline |
| Styling | **Vanilla CSS** (custom properties) | The design is bespoke and small — no framework needed; tokens keep it consistent |
| Fonts | **Fontsource variable fonts** | Self-hosted Newsreader / Inter / JetBrains Mono — no external requests, one file per family |
| Language | **TypeScript** (strict) | Catches bugs early; validates content-collection schemas at build time |
| Analytics | **GoatCounter** (optional) | Privacy-friendly, cookie-free; no consent banner needed |
| Deployment | **GitHub Actions → GitHub Pages** | Official Astro workflow; push to `main` triggers build + deploy |

**No React, no Tailwind, no animation library.** The zero-JS baseline is a
feature. Interactive widgets are vanilla-JS islands inside `.astro`
components.

---

## 3. Repository layout

```
├── astro.config.mjs          # site URL + sitemap + MDX integrations
├── package.json              # dependencies (see requirements.txt for the "why")
├── tsconfig.json             # Astro strict preset
├── requirements.txt          # human-readable dependency explanations
├── .github/workflows/
│   └── deploy.yml            # official Astro GitHub Pages workflow
├── public/                   # files served as-is (images, favicon, robots.txt)
│   └── images/               # headshot, talk photo, og image, signchatter/
├── src/
│   ├── site.config.ts        # values that change: resume link, email, social URLs
│   ├── content.config.ts     # content collection schemas (Zod)
│   ├── content/
│   │   ├── work/             # case studies (MDX): teradata, signchatter, experiments
│   │   └── notes/            # occasional writing (Markdown)
│   ├── layouts/
│   │   ├── Base.astro        # HTML shell: head, nav, footer, reveal script
│   │   └── CaseStudy.astro   # shared shell for case studies
│   ├── components/           # reusable building blocks
│   │   ├── Nav.astro         # top navigation (+ light/dark theme toggle)
│   │   ├── Footer.astro      # footer with contact links
│   │   ├── Card.astro        # case-study teaser card
│   │   ├── Tag.astro         # small mono chip for technologies
│   │   ├── Headshot.astro    # the single professional portrait
│   │   ├── AvatarIntro.astro # one-time cartoon-avatar greeting (first visit)
│   │   ├── PillarDiagram.astro  # research theme → two pillars (SVG)
│   │   ├── RouterBand.astro  # "The Router" ambient visualization
│   │   ├── Laptop.astro      # flat line-art laptop (CSS 3D)
│   │   ├── LaptopScreens.astro  # the 7 screen pictures for the laptop
│   │   └── figures/          # data visualizations (see §9)
│   ├── pages/                # one file per page (URL matches filename)
│   │   ├── index.astro       # homepage (the scroll narrative)
│   │   ├── work/             # index + [...slug].astro (dynamic route)
│   │   ├── research.astro    # research page
│   │   ├── about.astro       # experience, education, awards, person
│   │   ├── notes/            # index + [...slug].astro (dynamic route)
│   │   ├── contact.astro     # contact links
│   │   └── 404.astro         # not-found page
│   ├── styles/
│   │   ├── tokens.css        # design tokens (colors, type, spacing) — THE source of truth
│   │   ├── base.css          # reset + global defaults + .container + .visually-hidden
│   │   ├── typography.css    # webfont loading + .prose (long-form text)
│   │   ├── layout.css        # .section, .grid, .cluster, .stack primitives
│   │   └── motion.css        # reveal-on-scroll system + link-draw
│   └── assets/
│       └── sign-keypoints.json  # real MediaPipe keypoints (one sign, ~tens of KB)
├── scripts/
│   ├── prepare-headshot.mjs  # one-off: crop/grade/export headshot variants
│   └── extract-sign-keypoints.py  # one-off: extract hand keypoints from a video
├── assets-source/            # originals (resumes, photos, videos) — NOT published
├── planning/                 # strategy docs and working notes — NOT published
└── dist/                     # the built site (generated; never edit by hand)
```

---

## 4. Design tokens (the single source of truth)

All visual decisions are defined **once** in `src/styles/tokens.css` as CSS
custom properties. Everything else references these variables. To restyle the
site, edit that file — not individual components.

### Colors

| Token | Value | Used for |
|---|---|---|
| `--color-bg` | `#fafaf8` | warm off-white page background |
| `--color-bg-tint` | `#f3f3ef` | pale warm gray, occasional tinted sections |
| `--color-bg-accent` | `#eef0fb` | pale indigo, used very rarely for rhythm |
| `--color-ink` | `#1a1a18` | near-black body text |
| `--color-ink-muted` | `#5c5c57` | secondary text (dates, captions, metadata) |
| `--color-border` | `#e3e3dd` | hairline borders |
| `--color-accent` | `#4f46e5` | electric indigo — links, focus, diagrams |
| `--color-accent-hover` | `#3d37c9` | darker indigo for link hover (keeps AA contrast) |
| `--color-on-accent` | `#ffffff` | text/icons sitting ON the accent color |

**Dark theme (optional).** The same tokens are redefined under
`[data-theme='dark']` (warm near-black `#161614` background, lighter indigo
accent `#8f88ff` so links keep AA contrast on dark, `--color-on-accent`
flips to the dark `#161614`). The toggle in the nav sets `data-theme` on
`<html>`; the choice is saved in localStorage and applied before first paint
in `Base.astro`. `theme-color` and `color-scheme` stay in sync with the
active theme.

**Rule:** the accent is used SPARINGLY — links, focus rings, diagram strokes,
and a single hero detail. Nothing else.

### Typography

| Token | Font | Used for |
|---|---|---|
| `--font-display` | Newsreader Variable | headlines, hero statement |
| `--font-body` | Inter Variable | body text, UI |
| `--font-mono` | JetBrains Mono Variable | data, endpoints, code-ish details, metadata labels |

Type scale: 1.333 modular ("perfect fourth"). Hero display clamps up to
`--text-hero` (4.5rem / 72px) on desktop.

### Spacing

4px-based scale: `--space-1` (4px) through `--space-24` (96px). Components
pick from these steps instead of inventing arbitrary pixel values.

### Layout

- `--content-max: 1200px` — widest any page content may get
- `--measure: 68ch` — ideal line length for reading

### Shape & depth

- `--radius-sm: 4px`, `--radius-md: 8px` — small corner radii
- `--shadow-soft` — rare, soft shadow (used on card hover)

### Motion

- `--duration-fast: 150ms`, `--duration-base: 300ms`, `--duration-slow: 600ms`
- `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)` — gentle, settles softly

---

## 5. Information architecture

```
/                    Home — the scroll narrative (hero → proof → work → research → experience → recognition → person+contact)
/work                Case study index (3 flagship pieces, weighted)
/work/teradata       Case study: production AI at Teradata
/work/signchatter    Case study: SignChatter
/work/experiments    Case study: 4 self-directed experiments
/research            Research page: theme, pillars, done vs. exploring, publication
/about               Experience timeline, education, awards, toolbox, the person
/notes               Occasional writing index (2 published notes)
/notes/<slug>        Individual note pages
/contact             Email / LinkedIn / GitHub / Resume — no form
/404                 Not-found page
```

**Nav:** minimal top bar — `Work · Research · About · Notes · Contact`. No
hamburger on desktop; the items are short enough to fit even on small phones
(≥360px). Home is reachable via the name/wordmark.

**Footer:** email (obfuscated, not a link), LinkedIn, GitHub. Present on
every page.

---

## 6. Content collections

Two collections, defined in `src/content.config.ts` with Zod schemas.

### Work (`src/content/work/*.mdx`)

```ts
{
  title: string,
  kind: 'industry' | 'research' | 'experiment',
  weight: number,        // lower = shown first (Teradata=1, SignChatter=2, Experiments=3)
  summary: string,       // one sentence, shown on cards
  stack: string[],       // technologies, shown as a quiet line
  links: { label, url }[],  // external links (GitHub, paper, dataset)
  confidential: boolean, // true for Teradata: safe abstraction, no client names
  featured: boolean,     // appears on homepage "Selected work" (all 3 are featured)
}
```

**Note:** `featured` is defined in the schema but not currently consumed by
any page — the homepage hardcodes its three cards. It exists as a forward
reference for a future data-driven homepage.

### Notes (`src/content/notes/*.md`)

```ts
{
  title: string,
  date: Date,
  summary: string,
  draft: boolean,  // true = hidden from index and no route built
}
```

Sparse by design: no tags, no RSS promise, no date-pressure UI. Adding a note
= one Markdown file with `draft: false`.

---

## 7. Page-by-page content rules

### Home (`/`)

Six movements, in order:

1. **Hero** — editorial statement ("I build and evaluate AI systems that have
   to work outside the notebook."), name, one-line role, headshot, and an
   action row: a primary "See My Work" button (to `/work/`) plus Email,
   LinkedIn, GitHub, and Resume text links. (On the first visit of a session
   a cartoon avatar waves hello in the portrait frame, then the real photo
   pops in.)
2. **Proof strip** — 4 quantified facts (3+ enterprise AI systems, 2 AI agent
   APIs, 4× performance awards, 1 peer-reviewed paper). Numbers count up on
   scroll. Below: a wordmark row of 5 orgs (Teradata, Bahria University,
   Arbisoft, Springer, Google Developers).
3. **Selected work** — 3 flagship cards, weighted: Teradata (7 cols),
   SignChatter (5 cols), Experiments (full width). Each links to its case
   study.
4. **Research teaser** — the theme sentence + the two pillars (Efficiency,
   Reliability) as minimal text. Link to `/research`.
5. **Experience** — one-line-per-role compressed timeline (Teradata 2023—,
   Bahria RA 2022–23, SignChatter 2022–24, Arbisoft 2022). The current role
   has a pulsing "now" dot.
6. **Recognition** — 6 signal-bearing awards in a 2-column grid.
7. **The person** — 2–3 sentences of humanity (writing, mentoring,
   books/movies/hiking) and the talk photo. (The contact links live in the
   hero and the footer, so this section stays quiet.)

### Work (`/work` + subpages)

Case studies, not project cards. Structure per case study: Context → What I
owned → Evaluation & outcomes → Links. The three flagships:

1. **Teradata** (`industry`, weight 1, confidential) — production AI across
   several enterprise systems. API layer of a Text-to-SQL agent (~40 REST
   endpoints, two FastAPI services), agentic skills with LLM-graded CI,
   schema-mapping evaluation, VectorStore/RAG pipeline, 60-test CI, 35+
   critical bugs, AWS + on-prem deployments, pre-GA customer onboarding,
   mentoring. Client reference: "one of the world's largest banks"
   (abstracted). No external links (confidential).
2. **SignChatter** (`research`, weight 2) — research that shipped. ASL + PSL
   (confirmed). WLPSL dataset built from scratch (31 classes, 248 videos, 12
   participants), published on Kaggle. MediaPipe keypoints → RNN/BRNN/LSTM/GRU
   comparison → deployed Android app + website with speech output. Springer
   chapter (ICCIS 2024). Links: GitHub, Springer, Kaggle, full thesis.
3. **Experiments** (`experiment`, weight 3) — 4 self-directed studies under
   one research program: budgeted model routing (efficiency), RAG corruption
   (reliability), budgeted evaluation (a nuanced negative result), pushback
   resistance (reliability at a price). Links to all 4 repos.

**Historical projects:** none of the 2023 coursework repos appear on the
site. They remain on GitHub untouched. No archive page — absence is cleaner
than a graveyard.

### Research (`/research`)

- Theme: *Making AI systems efficient and reliable enough to deploy in the
  real world.* Healthcare appears once, as a motivating high-stakes domain.
- Two pillars, each framed as a concrete question:
  - **Efficiency:** "How can we get useful AI behavior while spending less
    compute, latency, and cost?"
  - **Reliability:** "How do AI systems behave when evidence, models, or
    tasks degrade — and how would we know?"
- **"Research I've done"** (3 items, each with a small figure):
  SignChatter (peer-reviewed), the 4 experiments, RA work (crowd-threat
  97%, video popularity 73–86%). The RA item includes an honest manuscripts
  note: "written up as manuscripts and submitted to conferences; they weren't
  accepted, and we later set them aside."
- **"Questions I'm sitting with"** (6 open questions, no claims). A
  question-to-pillar map (QuestionMap) shows which pillar each question
  touches, on wide screens only.
- **Publication:** full Springer citation + link + full thesis link.

### About (`/about`)

- **Experience timeline** (4 entries, most recent first): Teradata (with
  progression line showing 2 promotions), Bahria RA, SignChatter, Arbisoft
  Fellow.
- **Education:** Bahria University (BS CS, 2019–2023, CGPA 3.83/4,
  Valedictorian), Cambridge O & A Levels.
- **Awards:** 5 signal-bearing items (4× Teradata Performance Award, GenAI
  Research Group, FYP winner + incubation shortlist, Rector's Honor List 3× +
  Merit Scholarship 5×, Arbisoft Fellowship 1 of 3).
- **Toolbox:** 4 groups (AI engineering, ML, retrieval & data, development),
  one line each, plain text. No skill bars, no logo wall.
- **Certifications:** one quiet line — Teradata PE AgenticAI, Enterprise
  Vector Store, HuggingFace AI Agents, Google–Kaggle GenAI Intensive.
- **The person:** writing (6+ years, international clients), GDSC/BCS
  leadership (one line), books, Islamabad/Margalla Hills. Talk photo as
  evidence.

### Notes (`/notes`)

2 published notes: "Routing to a smaller model beats random — even on a
tight budget" (2026-09-26) and "Thinking longer appears to halve sycophantic
caving — at 3× the tokens" (2026-09-29). Sparse index, newest first.

### Contact (`/contact`)

4 large rows: Email (plain text, obfuscated, not a link), LinkedIn, GitHub,
Resume (PDF). No form — GitHub Pages is static hosting.

---

## 8. Motion system

**Principle: motion explains or reveals; it never decorates.** (Bent once —
see §10.)

**Budget:** ~9 significant motion moments site-wide, plus 7 gentle ambient
loops (see below).

### The 9 moments

| # | Moment | Page | What it does |
|---|--------|------|-------------|
| 1 | Hero entrance + portrait parallax | `/` | Statement lines reveal in sequence; portrait drifts 6% slower than scroll |
| 2 | Proof-strip count-up | `/` | Numbers count from 0 to their value over ~1.4s when scrolled into view |
| 3 | Research pillar diagram draws itself | `/research` | SVG strokes draw on scroll (stroke-dashoffset) |
| 4 | Experiment figures animate | `/work/experiments` | Routing curve draws, corruption bars grow, flip-rate bars grow, thinking-cost bars grow |
| 5 | Page transitions | all | Fast cross-fade + slight rise (180ms out, 220ms in) via Astro ClientRouter |
| 6 | Hero statement underline | `/` | Hand-drawn accent stroke under "outside the notebook", draws once then redraws every 12s |
| 7 | Budget-routing slider | `/work/experiments` | Interactive: drag to move a marker along the real measured curve |
| 8 | RAG corruption dial | `/work/experiments` | Interactive: 4-state segmented control animates a mini pipeline |
| 9 | SignChatter skeleton loop | `/work/signchatter` | Real MediaPipe keypoints animate a hand signing "smart" |

### The 7 ambient loops

| Loop | Page | Duration | Gate |
|------|------|----------|------|
| Hero underline redraw | `/` | 12s | always (CSS only) |
| Scroll cue shimmer | `/` | 3.8s | always (CSS only) |
| Timeline "now" pulse | `/` | 2.4s | always (CSS only) |
| Endpoint grid pulse | `/work/teradata` | 2s | only when scrolled past |
| Pillar diagram pulse | `/research` | 4s | always (CSS only) |
| Router band dot stream | `/work/experiments` | ~7s | only when on screen + tab visible |
| Sign skeleton animation | `/work/signchatter` | real-time | only when on screen + tab visible |

**Rules for any ambient loop:** pauses when off-screen (IntersectionObserver),
pauses when the tab is hidden, and collapses to a static frame under
`prefers-reduced-motion`.

### The reveal system

The workhorse. Add `data-reveal` to any element; the observer in
`Base.astro` adds `.is-revealed` when it enters the viewport (once — no
looping). Optional modifiers:

- `data-reveal="fade"` — opacity only (for images, where movement would be
  distracting)
- `data-reveal-delay="1..4"` — small stagger (90ms per step) for grouped items

**Note:** `data-reveal-delay="5"` is used in two places (contact page,
research page) but has no CSS rule — it behaves as no delay. The work/notes
index pages cap delays at 4 via `Math.min(i, 4)`.

### Hard rules

- **Transform and opacity only** for anything that animates. No layout
  thrashing.
- **Everything gated behind `prefers-reduced-motion: no-preference`.** Users
  who ask for less motion get a fully static site.
- **All content fully available without JS.** Elements only start hidden when
  the `js` class is present on `<html>` (added by an inline script in
  `Base.astro` before first paint).
- **No scroll-jacking.** Native scroll always. Nothing blocks or snaps the
  scroll.

---

## 9. Figures (data visualizations)

All figures live in `src/components/figures/`. Every figure follows the same
pattern:

- **Real data only.** Every number is traceable to a repo artifact. Data
  lives as constants at the top of the file with a comment citing the source
  repo.
- **Inline SVG** (or HTML for bar charts), styled with the site palette.
- **Scroll-triggered draw** (stroke-dashoffset for lines, scaleX for bars),
  once, when the figure enters the viewport.
- **Static fallback** for reduced motion / no JS: the figure is simply shown,
  already drawn.
- **Accessibility:** `role="img"` with a `<title>` and `<desc>` (or
  `aria-label`) that conveys the same information as the visual.

### Shared data

`src/components/figures/routing-data.ts` holds the real numbers behind the
budgeted-model-routing chart. It is imported by `RoutingCurve.astro` (the
full chart on `/work/experiments`), `LaptopScreens.astro` (the small copy on
the homepage laptop), and `BudgetSlider.astro` (the interactive widget).
Change a number there and all three charts change.

### The figures

| Figure | Page | What it shows |
|--------|------|---------------|
| `RoutingCurve` | `/work/experiments` | Accuracy vs budget: smart router vs random (line chart) |
| `BudgetSlider` | `/work/experiments` | Interactive: drag a budget slider, see accuracy + time |
| `CorruptionBars` | `/work/experiments` | Answer F1 by evidence condition (4 horizontal bars) |
| `CorruptionDial` | `/work/experiments` | Interactive: 4-state control animates a mini pipeline |
| `FlipRateBars` | `/work/experiments` | Pushback outcomes: thinking off vs on (paired bars) |
| `ThinkingCost` | `/work/experiments` | Price of thinking: tokens + seconds (paired bars) |
| `EndpointGrid` | `/work/teradata` | 40 REST endpoints as 40 squares filling in |
| `BugGrid` | `/work/teradata` | 35+ critical bugs as 36 squares turning green |
| `ScopeArc` | `/about` | The two promotions as widening scope (1/2/3 blocks) |
| `DoneFigure` | `/research` | Small picture beside each "done" item (hand/routing/bars) |
| `QuestionMap` | `/research` | 6 questions joined to the pillars they touch |

### Interactive widgets

`BudgetSlider` and `CorruptionDial` are vanilla-JS islands inside `.astro`
components. They use native HTML controls (`<input type="range">`,
`<input type="radio">`) so they are fully keyboard-operable. The readout is
`aria-live` so screen readers hear the numbers change. The static figure
above each widget is the fallback; the widget adds interactivity, it never
replaces the data.

**Honesty rule:** between measured data points, values are linearly
interpolated and the UI says so in a caption. No invented precision.

---

## 10. The homepage journey (the rule that was bent)

**The deal:** the homepage has a scroll-linked laptop that moves, tilts, and
opens for beauty. This breaks the "motion never decorates" rule — and the
user chose to accept that for the homepage only. Other pages are untouched.

**What is still required:** whatever is shown *on the laptop screen* must be
a real artifact that already exists on the site. The motion may be decorative;
the content may not be.

### How it works

1. **The squeeze + alternate layout.** On screens ≥1100px with JS on and
   motion allowed, each section's content is squeezed into ~58% of the width
   and alternates sides (left / right / left…). The empty ~42% is the
   laptop's stage. In every other case (reduced motion, no JS, tablet, phone)
   the sections stay full width — nobody sees an empty half with no laptop.

2. **The laptop.** A flat line-art laptop in CSS 3D (no library, no images).
   Four CSS variables drive every pose: `--open` (lid 0–1), `--elev` (camera
   height), `--spin` (turntable), `--s` (size / near-far). It is a fixed,
   click-through (`pointer-events: none`) layer at z-index 1: above section
   backgrounds, below section content (z-index 2).

3. **The journey.** A scroll engine measures where each section is, builds a
   table of "waypoints" (one per section), and blends between them on scroll
   (smoothstep). Only `transform` and `opacity` change. The laptop starts
   closed and upright beside the proof strip, opens and travels through the
   sections, and closes again at Recognition (parking upright, then scrolling
   away with the page).

4. **The dashed path.** An SVG path behind the content shows the laptop's
   route: faint dashed ahead, solid accent trail behind. The trail uses
   `pathLength="1"` and a moving `stroke-dashoffset`.

5. **The screens.** 7 still pictures, all copies of real things already on
   the site: the name (wordmark), Teradata's 40-endpoint grid, a real
   SignChatter hand frame, the routing curve, the two-pillar diagram, the
   experience timeline, and the name again (for the closing fade). They
   cross-fade as the laptop moves.

6. **The section focus tint.** The section crossing the middle of the screen
   fades to pale indigo; the others stay warm off-white. Only one section is
   tinted at a time. The hero is excluded (it keeps its own look). The proof
   strip tints early (as soon as the visitor scrolls at all) because that is
   when the laptop starts to turn.

### The hero

- **Background:** with JS on, warm off-white (`--color-bg`). Without JS, warm
  grey (`--color-bg-tint`). On every load the hero starts pale indigo
  (`--color-bg-accent`) and fades to the resting color over ~1.4s after a
  1.8s delay (the "welcome wash"). Reduced motion: no wash.
- **Texture:** a faint grain layer (SVG feTurbulence noise, inlined as a
  background, 4% opacity).
- **Layout:** full viewport height (minus the sticky nav), content centered
  vertically. Text ~2/3 left, portrait ~1/3 right on desktop; stacked on
  mobile.
- **Parallax:** the portrait drifts 6% slower than the text as you scroll.
  Disabled on touch devices and with reduced motion.

### Fallbacks

- **Reduced motion / no JS / <1100px:** the laptop, the dashed path, and the
  tint fade are all hidden. The page is exactly the same page it was before
  the journey was added.
- **Before the script runs:** the laptop is hidden (`opacity: 0`) so it never
  flashes in the wrong place.
- **View transitions:** the script re-initializes on `astro:page-load` and
  cleans up on `astro:before-swap`.

---

## 11. View transitions

Astro's `ClientRouter` enables client-side navigation: internal links swap
the page content with a fast cross-fade + slight rise instead of a full
browser reload. Browsers without support fall back to normal navigation.

**The `js` class problem:** view transitions swap in the new page's `<html>`
element, which does not have the `js` class (it is only added by the inline
script in `Base.astro`). Without the class, reveal animations and the laptop
layout stop working after the first client-side navigation. Fix: `Base.astro`
re-adds the class on `astro:after-swap`.

**Cleanup pattern:** any script that adds listeners or observers must clean
up on `astro:before-swap` (so nothing keeps watching a page that is gone) and
re-initialize on `astro:page-load` (which fires on first load AND after every
swap). Scripts that follow this pattern: the reveal observer, the count-up
script, the focus-tint script, the journey laptop engine, the RouterBand, and
the theme toggle.

**One-shot figures** (BugGrid, EndpointGrid, ScopeArc, CorruptionDial,
BudgetSlider) do not need cleanup: they have no loops and their observers
self-disconnect after firing. EndpointGrid's `ioPast` observer (which toggles
the pulse when scrolled past) never disconnects, but it is harmless — it
watches a detached element after navigation and does nothing.

---

## 12. Accessibility

- **WCAG 2.2 AA target.** Contrast ratios verified for the light theme: ink
  15.4–16.7, muted text 5.9–6.4, accent 5.5–6.0 on all three backgrounds
  (off-white, warm grey, pale indigo). All pass AA (4.5). The dark theme uses
  adjusted tokens (lighter indigo accent `#8f88ff`, off-white ink `#e9e9e3`)
  chosen to keep AA contrast on the dark backgrounds.
- **Focus-visible styles:** a clearly visible focus ring (2px accent outline,
  3px offset) for keyboard users.
- **Skip link:** keyboard users can jump straight past the nav to the content.
- **Semantic HTML:** `dl/dt/dd` for the proof strip, `ol` for timelines,
  `figure/figcaption` for figures, `blockquote` for the citation.
- **Screen readers:** every figure has `role="img"` with a `<title>` and
  `<desc>` (or `aria-label`). The RouterBand has a `.visually-hidden`
  paragraph that conveys the same information in one sentence. The laptop and
  journey path are `aria-hidden` (pure decoration).
- **Keyboard:** all interactive widgets use native HTML controls (range
  slider, radio group) so they are fully keyboard-operable. The email tooltip
  opens on focus and closes on Escape.
- **Reduced motion:** every animation is gated behind
  `prefers-reduced-motion: no-preference`. The global rule in `base.css`
  neutralizes all durations as a second layer. All content is fully visible
  without JS.
- **Tap targets:** nav links and contact rows are ≥44px tall.

---

## 13. SEO & metadata

- **Unique title/description per page** (passed to `Base.astro` as props).
- **Canonical URLs** via `Astro.site` + `Astro.url.pathname`.
- **Open Graph + Twitter cards** with a social preview image (`og.jpg`).
- **JSON-LD Person schema** on every page (name, job title, worksFor,
  address, sameAs links from `site.config.ts`).
- **Sitemap** generated automatically by `@astrojs/sitemap` on every build.
- **Favicon:** `favicon.svg` in `public/`.

---

## 14. Performance

- **Zero-JS baseline:** the site works fully without JavaScript. JS only
  adds enhancements (reveals, count-ups, the laptop, interactive widgets).
- **Fonts:** self-hosted variable fonts via Fontsource. One file per family
  covers all weights. `font-display: swap` shows fallback text instantly.
- **Images:** AVIF → WebP → JPEG fallback via `<picture>`. Explicit
  width/height prevent layout shift. The hero headshot uses
  `fetchpriority="high"` + `loading="eager"` (it is the LCP element);
  below-the-fold images use `loading="lazy"`.
- **Page weight:** the homepage is ~11.6KB gzip (including the 7 laptop
  screens). The journey script is ~4.5KB raw / ~2KB gzip.
- **No external requests** except GoatCounter analytics (async, non-blocking).

---

## 15. Deployment

- **Repo:** `jnx01/jnx01.github.io` (GitHub Pages user site).
- **Workflow:** `.github/workflows/deploy.yml` — the official Astro GitHub
  Pages workflow. On push to `main`: checkout → install → build → deploy.
- **One-time setup:** Settings → Pages → Source → GitHub Actions.
- **Custom domain later:** buy domain → add CNAME record at DNS → set domain
  in repo Settings → Pages → enforce HTTPS. Update `site:` in
  `astro.config.mjs`.

---

## 16. Content rules (what goes on the site and what does not)

### Always

- Every claim backed by an artifact (repo, dataset, paper, shipped system,
  number).
- Real data only in figures. Interpolated values labeled as interpolated.
- Confidential work (Teradata) at safe abstraction: no client names, no
  internal architecture, nothing that isn't already public.
- Honest about failures: the budgeted-eval negative result is presented
  proudly; the RA manuscripts note says they weren't accepted.

### Never

- No skill bars, no buzzword wall, no certification wall.
- No stock photography, no illustration packs.
- No particle backgrounds, fake AI dashboards, 3D scenes, floating cards,
  cursor effects, marquee text.
- No autoplay music or any audio.
- No boot sequences, fake terminals, fake "system feeds".
- Dark theme is OPTIONAL, not default: the light Apple/Verge aesthetic is the
  default; a light-bulb toggle in the nav switches to a warm dark theme
  (tokens under `[data-theme='dark']` in tokens.css). The choice is saved in
  localStorage and applied before first paint.
- No gimmick copy.
- No contact form (static hosting).
- No mailto: link (email is obfuscated plain text).
- No archive page for old projects (absence is cleaner than a graveyard).

### Removed from the old site

- All 11 old portfolio project pages.
- The certification wall (intro courses diluted the signal).
- "My Story" autobiography.
- "Data Scientist with a knack for GenAI" positioning.
- Wells Fargo name (→ "one of the world's largest banks").
- Phone number.
- Emoji-laden copy.

---

## 17. Conventions for future changes

- **Design tokens:** everything visual comes from `src/styles/tokens.css`.
  Never invent colors, spacing, or type sizes outside it.
- **Comments:** plenty of them, in very simple language. Every nontrivial
  block explains *what* and *why*, and cites the data source it comes from.
- **Data honesty:** every number on screen must be traceable to a repo
  artifact. Interpolated values must be labeled as interpolated.
- **Figures:** follow the existing pattern — inline SVG, real data as
  constants at the top with a comment citing the source repo,
  scroll-triggered draw, static fallback, `role="img"` with a description.
- **Interactive widgets:** vanilla-JS islands inside `.astro` components.
  Native HTML controls. `aria-live` readouts. The static figure is the
  fallback.
- **View transitions:** any script that adds listeners or observers must
  clean up on `astro:before-swap` and re-initialize on `astro:page-load`.
- **Working notes:** after each significant change, append a dated entry to
  `planning/WORKING-NOTES.md` (newest at top): what was requested, decisions,
  implementation summary, validation results, deviations.
