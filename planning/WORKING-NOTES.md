# Working Notes — personal website build

Local-only log (gitignored) of decisions, issues/fixes, and deviations from
the approved strategy. Newest entries at the top.

For the current architecture and design rules, see `planning/ARCHITECTURE.md`.
For step-by-step recipes, see `docs/02-editing-and-maintenance.md`.

---

## Current state (2026-10-03)

The site is complete and deployed. 12 pages, all green. The homepage has the
scroll journey (laptop + dashed path + section tint). All figures use real
data. All ambient loops pause off-screen and respect reduced motion.

**Key facts:**
- Stack: Astro 7 + TypeScript (strict) + vanilla CSS (custom properties) +
  Fontsource variable fonts. No React, no Tailwind, no animation library.
- Content: 3 case studies (MDX), 2 notes (Markdown), all data-driven.
- Motion: ~9 significant moments + 7 ambient loops. Transform/opacity only.
  Everything gated behind `prefers-reduced-motion`. All content available
  without JS.
- Homepage journey: laptop travels through 5 sections (proof → work →
  research → experience → recognition), closes at the end. Squeeze layout
  (58%/42%) only on ≥1100px with JS + motion. Fallbacks: hidden otherwise.
- Deploy: GitHub Actions → GitHub Pages on push to `main`.

---

## 2026-10-03 — Cleanup pass (no redesign, no refactor)

Whole-site sweep after the strategy/docs read-through. Fixes only; nothing
was restructured.

- BUG FIXED (research page CSS): a mangled comment (`}------ */` with no
  opener) left the 900px media query unclosed. The `.exploring-note` rule
  was being dropped by the CSS parser, and everything after it (question
  list, citation, done/exploring entrances) only applied at >= 900px. Looked
  fine on desktop, broken on phones. Restored the missing `}` + comment.
- BUG FIXED: `.visually-hidden` was used in RouterBand but never defined, so
  the screen-reader sentence was visible on /work/experiments. Added the
  standard utility class to base.css.
- BUG FIXED: `.figure-center` was used in signchatter.mdx but never defined,
  so the keypoints gif rendered unstyled. Added the style to typography.css
  (centered, max-height 420px, caption matches .figure-caption).
- index.astro: removed a duplicate `.person-note` rule, the dead
  `.contact-email` rule (email is a button+tooltip now), a redundant `.hero`
  padding re-declaration, two empty `data-count-suffix=""` attributes, and a
  stale hero comment (the warm gradient no longer exists). Merged the two
  stranded `.journey-*` display:none rules.
- Base.astro: the JSON-LD Person schema now uses LINKEDIN_URL / GITHUB_URL
  from site.config.ts instead of hardcoded strings.
- BugGrid: comment and aria-label said "35 squares, rows of 18/17" but the
  grid renders 36 (two rows of 18) for the "35+" claim. Text aligned.
- EndpointGrid: stale comment fixed (all squares pulse once scrolled past,
  not "the last few"); removed a dead reduced-motion rule.
- SignSkeleton + RouterBand: added astro:before-swap teardown (stop the rAF
  loop, disconnect observers, remove listeners). Before this, the skeleton
  loop kept drawing into detached elements after every client-side
  navigation away, and RouterBand piled up a visibilitychange listener per
  visit. Same pattern as index.astro already used.
- BudgetSlider: frontmatter now imports the four shared routing points from
  routing-data.ts and only adds the 100% point, instead of a third full copy
  (the client-side script copy stays — it cannot import at runtime).
- DELETED: figures/TeradataArch.astro — unused, and per the 2026-10-02 note
  it must never be published (confidentiality). Recoverable from git.
- docs/02: case-study filenames updated (all .mdx now).
- Left alone on purpose: Headshot's unused 'small' variant (docs say the
  About page uses a headshot — it doesn't; content decision, not code);
  BudgetSlider's in-script data copy (documented pattern).

Checks: build green (12 pages); verified in the preview that the tooltip,
count-ups, journey laptop, question markers (<900px), citation border, the
hidden RouterBand sentence, and the centered gif all behave as intended.

---

## 2026-10-03 — Seam fix, keypoints files, Safari-engine check

- Seam (hero / stats strip): the hero now rests on `--color-bg`, and the
  strip's tint fades in over 7rem instead of starting with a hard edge.
- `extract-sign-keypoints.py` + `sign-keypoints.json`: kept and committed
  (the figures rescale the data themselves, so they are not affected).
- Safari check: no real phone was available. Used Playwright WebKit (Safari's
  engine) with desktop and iPhone 13 profiles. No JS errors, no sideways
  scroll, phone hides the laptop, `:has()` hover works.
- Fixed: nav lacked `-webkit-backdrop-filter` (see-through on older Safari).
- NOT a site bug (checked): the laptop lid looks like a thin sliver in that
  WebKit build. A 12-line test page with plain `preserve-3d` boxes does the
  same, so the test engine does not support 3D layering. Real Safari does.
  Still worth one look on a real Mac/iPhone-sized Safari window.

---

## 2026-10-03 — Research page: pictures for "Done" and a map for "Questions"

- Why: the page looked empty on desktop (text only, empty right side).
- New `figures/DoneFigure.astro` (kind = hand | routing | bars): a small
  picture beside each "Research I've done" item. Real data only: the
  SignChatter keypoint frame, the routing numbers (`routing-data.ts`), and the
  97% / 73-86% accuracy already written in the text. Draws once on scroll.
- New `figures/QuestionMap.astro`: six dots joined to the Efficiency /
  Reliability hubs; hovering a question lights its dot + lines (CSS `:has()`,
  no script). Desktop only (>= 900px). The question-to-pillar mapping is my
  reading (see the comment at the top of the file); Q4 and Q6 touch both.
- Under 900px: pictures stack under the text; the map is hidden.
- Reduced motion: everything is shown already drawn (checked).

---

## 2026-10-03 — Homepage journey: final audit (Module H of 04)

- Speed: scrolled the whole homepage (5161px tall, 1600px wide) in 40px steps
  while timing each frame: median 8.3ms, worst 9.3ms, 0 frames over 20ms. The
  page-sized trail repaint is cheap enough; no change made.
- Contrast (WCAG ratios): ink 15.4-16.7, muted text 5.9-6.4, accent 5.5-6.0 on
  all three backgrounds (off-white, warm grey, pale indigo). All pass AA (4.5).
  The faint dashed "road ahead" (25% ink) is decoration only (aria-hidden).
- Accessibility: laptop and path are `aria-hidden`, not focusable, and
  `pointer-events: none`; all page text is real HTML in the normal order.
- Weight: new page script 4.5KB raw / 2.0KB gzip; whole index.html 11.6KB gzip
  including the seven laptop screens. Under the 15KB goal.
- Deleted the temporary `src/pages/laptop-test.astro`. Build is 12 pages.
- Left as is: small seam between the off-white hero and the indigo stats strip
  once the hero wash fades (you have seen it and not objected).

---

## 2026-10-03 — Homepage journey: fallbacks, small screens, view transitions (Module G of 04)

- BUG FOUND AND FIXED (whole site): after the first client-side navigation
  (View Transitions) the `js` class on `<html>` was gone, because Astro swaps
  in the new page's `<html>`. Effects: the laptop and the squeezed layout
  disappeared when coming back to the homepage, and the reveal animations
  stopped on every page. Fix: `Base.astro` adds `js` again on
  `astro:after-swap`.
- Focus-tint script now cleans up on `astro:before-swap` and also listens for
  the 1100px line being crossed (resize).
- Checked: no JS (laptop + path hidden, plain page, all content visible);
  reduced motion (laptop/path hidden, full-width layout, no tint, content
  visible); 996px and phone widths (full-width layout, no laptop, no
  sideways scroll, tint still works); resize narrow -> wide -> narrow starts
  and stops the laptop correctly; Home -> About -> Back, Home -> Work -> Home
  keep the laptop working.
- Note: the browser window here reports sizes at 2x, so "996 CSS px" was
  tested by setting the viewport to 498.
- Not changed on purpose: the tint stays on for screens under 1100px (it is a
  motion-allowed effect that needs no laptop).

---

## 2026-10-03 — Homepage journey: tint timing, name screen at the end, laptop parks upright

- Stats strip (`data-tint-early`) now turns indigo as soon as scrollY > 4 (wide
  screens only), because that is when the laptop starts turning. Needed a
  scroll listener; it is removed on every re-setup (view transitions).
- Recognition screen is the name again. Screen layer 6 is now a copy of layer 0
  (a plain number lerp from 5 to 0 would have flashed screens 4, 3, 2, 1).
  The old dark layer was removed.
- No more fade-out at the end. After Recognition's middle the lid closes and
  the laptop turns upright (same pose as the start), page-anchored inside the
  Recognition section, so it scrolls away with the page. `data-journey-end`
  and the end-section maths were removed.

---

## 2026-10-03 — Homepage journey: start point changed

- Laptop's start pose (closed, upright, page-anchored) is now parked on the
  left, beside the four stats, instead of at the headshot. No hero maths left.
- Hero background is now flat `--color-bg-accent` (pale indigo), a trial. The
  proof strip turns the same shade when in focus, so there is no seam. To undo:
  set `.hero` background back to `var(--color-bg-tint)`.

---

## 2026-10-02 — Homepage journey: real screens on the laptop (Module F of 04)

**What:** new `src/components/LaptopScreens.astro` holds 7 still pictures, all
copies of things that are real and already on the site: 0 name, 1 Teradata
(40 endpoint squares), 2 SignChatter (a real MediaPipe hand frame), 3
Experiments (routing chart), 4 Research (two pillars), 5 Experience (4 roles),
6 dark. They are stacked; the journey script adds a `screen` number to the pose
and sets each picture's `opacity` = `1 - |screen - i|` (cross-fade, opacity
only). Selected work now has 3 stops (one per card, `data-journey-stop`).

**Deviations:**
- Teradata screen uses the EndpointGrid idea (40 squares + caption), NOT
  TeradataArch: TeradataArch is not published on /work/teradata, so it must
  not appear anywhere (confidentiality rule).
- Routing numbers moved into `figures/routing-data.ts`; `RoutingCurve.astro`
  imports them so both charts share one source. The full chart looks the same.
- Hand is scaled to its own bounding box (in the video the hand is tiny).
  It is a still frame, not a loop (static = cheaper, and no off-screen logic).

**Bug fixed:** SVG text drew in the wrong place (drifted down, cut off) when
the laptop is tilted in 3D. Fix: `text-rendering: geometricPrecision` on the
screen SVGs. Do not remove it.

---

## 2026-10-02 — Homepage journey: dashed path + trail (Module E of 04)

**What:** an `<svg class="journey-path">` (page-sized, absolute, z-index 1 like
the laptop) holds two copies of the route: a faint dashed one (the road ahead)
and a solid accent one (the trail). The trail uses `pathLength="1"` and a
moving `stroke-dashoffset`, so it reveals as you scroll. Hero text got
`z-index: 2` so the path never draws over the headline.

**Deviation (simpler than the strategy):** strategy 04 said to find the laptop
on the path with `getPointAtLength`. Instead, the route is BUILT from the
laptop's own maths: for every scroll position (every 12px) I ask "where is the
laptop on the page?" and join the dots. So the laptop is on the line by
construction, with no lookup, and the trail length is a number from a small
table. The engine was split into `poseAt()` (maths), `buildRoute()`, `render()`.

**Other changes:** hero laptop made smaller (scale 0.6) so it only touches the
headshot's corner; the first stop can't arrive before 25% of a screen of
scrolling (very tall windows skipped the hero pose).

**Seen while testing:** on a tall window the S-curve between stages crosses the
content column (behind the text, 25% opacity) — e.g. behind the proof numbers.
Cards hide it (they have a background). To judge on a normal laptop screen.
The browser tool's tab crashed once right after a dev-server reload; a fresh
tab worked, and nothing in the code loops (checked), so treated as tool noise.

**Checks:** build OK; path hidden at 996px and with reduced motion (empty `d`);
trail offset runs 1 -> ~0.09 from top to end of page.

---

## 2026-10-02 — Homepage journey: laptop in the hero + the journey (Module D of 04)

**What:** `index.astro` now holds one fixed laptop (`.journey-laptop`, z-index
1) and a scroll engine script. Waypoint table: hero (closed, upright, by the
headshot corner) -> proof (left stage, opens) -> work (right, biggest) ->
research (left) -> experience (right) -> recognition (left) -> person (lid
closes, fades out). Each section has a short "hold" so the laptop rests while
you read. Blend between waypoints uses smoothstep; the lid opens late and
closes early. Screen shows the site wordmark (the name, as in the nav) for now.

**Layering trick:** section backgrounds have no z-index, the laptop is z-index
1, and the sections' `.container` got z-index 2. So the laptop is above the
backgrounds but below all text and cards.

**Deviations / decisions:**
- Used the full name "Jahanzeb Naeem" on the screen (the real nav wordmark)
  instead of "JN" from strategy 04, because the site has no "JN" mark.
- All six stops are in the table already; the three work-card stops and the
  real screens are Module F. Dashed path is Module E.
- Hero x is pushed right of the headline's end so the laptop never covers the
  headline (first try covered the full stop of "notebook.").
- Added `data-journey-end` on the person section (marks the closing stop).

**Checks:** build OK; with reduced motion and at 996px the laptop is
`display: none` and never started; client-side navigation away and back
re-starts it. Visually checked top, proof and work stops.

---

## 2026-10-02 — Homepage journey: squeeze + alternate layout (Module C of 04)

**What:** sections 2-6 got `data-content="left|right"` (Proof right, Work left,
Research right, Experience left, Recognition right). On screens >= 1100px with
JS on and motion allowed, the section container becomes a 58fr/42fr grid and
all children sit in the content column. Proof strip -> 2x2; the `.grid` blocks
(work cards, research pillars) -> one column. Hero and "The person" unchanged.

**Checks:** at ~1546px the content columns are 668px wide, left/right as
planned, no overflow. At 996px (iframe test) and with reduced motion the
containers stay `block` = today's layout. Build OK.

**Note:** the empty ~42% is deliberate (laptop stage, Module D onward). The
browser tool's viewport emulation is unreliable (reported 2000px after being
set to 1000px), so narrow-width checks were done inside an iframe instead.

---

## 2026-10-02 — Homepage journey: section focus tint (Module B of 04)

**What:** homepage sections 2-7 get `data-tint-section`. A small script marks
the one section holding the middle line of the screen with `.is-in-focus`; a
`::before` layer in pale indigo fades its opacity 0 -> 1 (600ms). Only one
section is tinted at a time. Hero is left out (user decision).

**Reduced motion / no JS:** styles only apply under `.js` + no-preference
motion, so those visitors keep the old fixed bands. Checked with emulated
reduced motion: bands are the same as before, no `.is-in-focus` ever set.

**Known effect:** at page load the hero is warm-grey and the proof strip is
off-white, so a faint seam shows between them (before, they matched). Accepted;
can be revisited with the indigo-fade hero idea.

**Checks:** build OK (13 pages), no horizontal overflow at narrow width,
exactly one section focused at each scroll position tested.

---

## 2026-10-02 — Homepage journey: decision to squeeze + alternate (Module A of 04)

**Problem (from Module A):** page margins are only 40-170px on normal laptop
screens, so a laptop can't live in the gutters.

**User's idea (adopted):** squeeze each section's content to ~58% width and
alternate sides (left / right / left ...), freeing ~40% per section as the
laptop's stage — the CherryFizz rhythm.

**Guardrail I added:** the squeeze applies only on >= 1100px screens with
motion allowed and JS on (CSS media queries + the existing `.js` class). In
every other case sections stay full width as today, so nobody sees an empty
half with no laptop in it. Strategy 04 updated: new "Module C — alternating
layout" inserted before the laptop; later modules renumbered (now A-H).

---

## 2026-10-02 — Homepage journey: laptop drawn + measured (Module A of 04)

**Module:** A of 04-modification-strategy.

**Measurements (important finding)**
- Content container is max 1200px, centered. Side gutter = (viewport - 1200)/2:
  1280 -> 40px, 1440 -> 120px, 1536 -> 168px, 1728 -> 264px, 1920 -> 360px.
- Almost every homepage section fills the full container width (cards grid,
  proof strip, timeline, recognition grid). Hero: headline ~680px on the
  left, portrait ~426px on the right.
- So the "laptop lives in the gutters" plan from the strategy only has real
  room on big monitors (>= ~1700px). On a typical laptop screen the gutter
  is 40-170px — too small to show a readable screen. Needs a decision
  before Module C (options listed in the chat report).

**Implementation**
- src/components/Laptop.astro: flat line-art laptop in CSS 3D (no library,
  no images). Drawn as a plan view (base + hinged lid), then the camera is
  tilted. Four CSS variables drive every pose: --open (lid 0..1), --elev
  (camera height), --spin (turntable), --s (size / near-far). Default slot =
  the screen. Verified poses: closed upright (hero), closed landscape,
  half open, open front, open 3/4, near/far.
- src/pages/laptop-test.astro: TEMPORARY sliders + presets page at
  /laptop-test/. Deliberately NOT committed. Delete in Module G.

**Issues found + fixed (2)**
1. Lid opened the wrong way (hung below the base). Cause: CSS rotateX sign;
   the free edge must rotate toward +z, so it needs a positive angle.
2. Shut lid looked like a blank white card. Fix: soft diagonal sheen + a
   dark hinge band along the hinge edge so it reads as a laptop.

**Validation:** build green (13 pages incl. the test page). Commit eaeb7aa
(component only).

---

## 2026-10-02 — Flip card removed; homepage scroll animation planned (04)

**User request:** (1) remove the flip card's back side, its rotation, and
keep the headshot with a thin-line border. (2) Add a CherryFizz-style
scroll animation to the homepage (laptop that travels as you scroll),
knowingly bending the "motion never decorates" rule for the homepage only.

**Done**
- Hero portrait is now plain `<Headshot />` (it already has the soft matte
  with a hairline border). Deleted FlipCard.astro, scripts/prepare-flipshot.mjs
  and public/images/flipshot-* (recoverable from git). Build green, 12 pages.
  Commit 2009d5e.
- Wrote planning/04-modification-strategy.md (DRAFT): laptop (L1), dashed
  path the laptop rides (P1), section focus tint (T1). Amends 02 §G and
  03 §2 for `/` only. Screens on the laptop must show real artifacts only.

**Decisions (user)**
- Ideas 1 + 2 + 4 chosen. Keep the headshot; laptop appears as you scroll;
  maybe a closed upright laptop beside the headshot. Screens: real artifacts
  only (OK). Flat line-art laptop is fine (realistic is a nice-to-have).

**Open:** none. Decided later the same day: closed laptop stands in the hero
(option A, upright, overlapping the headshot frame's bottom-left corner);
laptop scales up/down for a near/far depth effect; hero excluded from the
indigo tint for now; reduced motion + no JS = laptop, path and tint all
hidden. Strategy 04 is ready; waiting on the user's "go ahead" for Module A.

---

## 2026-10-02 — Spectacle strategy: audit pass (Module H of 03)

**Module:** H of 03-modification-strategy — full audit before ship.

**Performance**
- Production build: 12 pages, 8.4 MB total. The bulk is the keypoints gif
  (6.1 MB) — acceptable for a single case-study page, and it lazy-loads.
- JS: one 16 KB bundle (ClientRouter). Everything else is inline scripts
  or CSS. Zero-JS baseline preserved.
- CSS: 4 files, all custom properties, no framework.

**Accessibility**
- All 9 pages audited: no missing alt text, no empty links/buttons, no
  unlabeled inputs (one issue found + fixed: corruption dial radios now
  have aria-labels).
- Reduced motion: zero CSS animations running on any page (verified
  programmatically across all 5 animated pages).
- All interactive widgets (budget slider, corruption dial) are native
  controls, keyboard-operable, with aria-live readouts.

**Mobile**
- All 9 pages at 360px: no horizontal overflow.

**Issues found + fixed (1):**
- Corruption dial radios missing aria-labels (screen readers would hear
  "radio button, not labeled"). Fixed.

**Status:** all 8 modules complete. Ready to ship.

---

## 2026-10-02 — Spectacle strategy: T1 scrollytelling architecture (Module G of 03)

**Module:** G of 03-modification-strategy — sticky architecture diagram on
/work/teradata that highlights each component as you scroll.

**Implementation**
- New component: src/components/figures/TeradataArch.astro. Five abstracted
  layers (client -> API layer -> agentic skills -> retrieval -> evaluation),
  drawn from copy that already exists on the page. The diagram sits sticky
  on the left while the steps scroll on the right; IntersectionObserver
  highlights the active node (accent stroke + tint) and its step (accent
  border). No scroll-jacking — native scroll always.
- src/content/work/teradata.md renamed to .mdx (required for the component
  import) and the diagram placed after the Context section.

**Validation**
- Build green (12 pages).
- Scrolling to the "skills" step highlights the skills node.
- Reduced motion: diagram present, sticky still works (it's layout, not
  animation).
- Mobile 360px: no overflow, diagram stacks on top (position: static).

---

## 2026-10-02 — Spectacle strategy: S1 hand-skeleton (Module F of 03)

**Module:** F of 03-modification-strategy — animated hand skeleton on
/work/signchatter, drawn from REAL MediaPipe keypoints.

**Data pipeline**
- scripts/extract-sign-keypoints.py rewritten for the MediaPipe Tasks API
  (the legacy `mp.solutions` API was removed in mediapipe 1.x). The
  HandLandmarker model is downloaded once to assets-source/models/.
  MEDIAPIPE_DISABLE_GPU=1 is set to avoid a Metal crash on macOS.
- Ran on assets-source/smart.mp4 (the "smart" sign — ہوشیار): 45 frames,
  45 with a visible hand, 24.5 KB JSON at src/assets/sign-keypoints.json.
  Also tested important.mp4 (45/45 frames) — smart.mp4 chosen as the
  primary (the word is the site's thesis made literal).

**Implementation**
- New component: src/components/figures/SignSkeleton.astro. SVG lines +
  circles drawn from the real keypoints, animated through the frames on a
  ~3s loop. Pauses off-screen / hidden tab. Reduced motion / no JS: a
  static middle-frame pose with the caption.
- src/content/work/signchatter.md renamed to .mdx (required for component
  imports) and the component placed right after the MediaPipe extraction
  paragraph.

**Issues found + fixed (2):**
1. The `.md` file didn't process the `import` — it rendered as literal
   text. Fix: renamed to `.mdx`.
2. After the rename, the dev server served a stale cached version. Fix:
   full restart (`astro dev stop` + `npm run dev`).

**Validation**
- Build green (12 pages).
- Skeleton animates (bone x1 sampled: 124.48 -> 126.72).
- Reduced motion: static pose present, no animation.
- Mobile 360px: no overflow.

---

## 2026-10-02 — Spectacle strategy: E2 corruption dial (Module E of 03)

**Module:** E of 03-modification-strategy — interactive four-state control
for the RAG corruption experiment on /work/experiments.

**Implementation**
- New component: src/components/figures/CorruptionDial.astro. A real
  radiogroup (Clean / Remove 1 / Remove All / Contaminated) drives: (a) a
  mini pipeline diagram (question -> 10-paragraph corpus -> BM25 top-4 ->
  model -> answer F1) where the 2 supporting paragraphs visibly vanish or
  get swapped for look-alikes, (b) the REAL F1 readout (0.649 / 0.440 /
  0.337 / 0.314), (c) the REAL example failure quote (Ender's Game / The
  Bone People, correct answer 1985; under Remove 1 the model abstained:
  "I cannot answer the question based on the provided evidence.").
  Keyboard-operable radiogroup, aria-live quote, static CorruptionBars
  stays as the fallback.

**Validation**
- Build green (12 pages).
- Contaminated state reads F1 0.314 with the correct quote.
- Keyboard: arrow keys move through the radiogroup and update the F1.
- Reduced motion: widget fully functional (it's a control, not an
  animation).
- Mobile 360px: no overflow, pipeline wraps cleanly.

---

## 2026-10-02 — Spectacle strategy: E1 budget slider + router band re-home (Module D of 03)

**Module:** D of 03-modification-strategy — interactive budget slider on
/work/experiments, and the RouterBand re-homed from the homepage to the
routing section where it belongs.

**Implementation**
- New component: src/components/figures/BudgetSlider.astro. A native
  <input type="range"> (0–100%) drives: (a) a marker riding the REAL
  measured router curve, (b) a live readout (router / random / always-small
  accuracy + estimated time), (c) a mini split bar showing the small/big
  model share. All values are linearly interpolated between the five
  measured budgets (10/25/50/75/100%) and the four measured timings
  (0/25/50/100%); the caption says so. aria-live readout, keyboard-operable.
- src/content/work/experiments.mdx: RouterBand placed at the top of the
  routing section (its real home, next to its own data); BudgetSlider
  placed after the static RoutingCurve with a "Try it yourself" intro. The
  static curve stays as the fallback.

**Validation**
- Build green (12 pages).
- Slider at 50% reads router 36.4% / random 33.5% / 17.7s — matches the
  real measured values exactly.
- Keyboard: arrow keys move the slider and update the readout.
- Reduced motion: widget fully functional (it's a control, not an
  animation); RouterBand shows its static frame.
- Mobile 360px: no overflow, widget stacks cleanly.

---

## 2026-10-02 — Spectacle strategy: four ambient loops added (A+B+D homepage, C research)

**User request:** one more looping animation bigger than the scroll shimmer.
User approved all four proposed moments.

**Added:**
- **A — Portrait breath (homepage).** The hero headshot slowly scales
  1.00 -> 1.015 -> 1.00 on a 6s ease-in-out loop. Transform-only, reduced-
  motion gated.
- **B — Underline re-draw (homepage).** After the initial draw, the stroke
  under "outside the notebook" wipes and redraws every 12s (a second
  keyframe animation layered on the first: hold drawn ~88% of the cycle,
  wipe, redraw).
- **D — "Now" marker (homepage).** A small accent dot on the current
  Teradata timeline role with a soft expanding ring pulsing every 2.4s.
  Reduced motion: solid dot, no ring.
- **C — Pillar pulse (/research).** A dot of accent light travels down each
  connector of the pillar diagram on a 4s loop (second dot staggered 2s so
  the pillars are fed alternately). offset-path on the connector curves.

**Issues found + fixed (2):**
1. Same Astro scoping bug as the hero underline: `.js .pulse` never matched
   because `.js` lives on <html> (no scope attribute). Fix: dropped the
   `.js` gate; the dots sit at opacity 0 unless the animation runs, so the
   no-JS guarantee holds without the gate.
2. Reduced-motion leak: the pulse dots were visible (opacity 1) under
   reduced motion because the base rule had no opacity. Fix: `.pulse` is
   opacity 0 by default; only the no-preference media query animates it.

**Validation**
- Build green (12 pages).
- Homepage: portrait-breath, both underline animations, and
  timeline-now-pulse all confirmed running.
- /research: pillar-pulse confirmed moving (offset-distance sampled over
  time), staggered second dot.
- Reduced motion (emulated): all four off; underline drawn, now-dot solid,
  pulse dots hidden, portrait static.

---

## 2026-10-02 — Spectacle strategy: four homepage moments added (A+B+C+D), glow removed

**User request:** 1–2 more homepage animations; remove the breathing glow
("unnoticeable"). User approved all four proposed moments.

**Removed:** the .hero::after breathing glow (Module C, Option 3 part 2) —
it wasn't earning its render cycles.

**Added (all work with existing elements, no new content blocks):**
- **A — Proof-strip count-up.** Each number counts 0 -> value over ~600ms
  (ease-out) when scrolled into view, once. data-count-to/data-count-suffix
  on the <dd>; script in Base.astro next to the reveal observer. Counters
  are set to 0 at setup (not at reveal) so the count is visible instead of
  flashing the final value. Reduced motion / no JS: final values are in the
  HTML, shown as-is.
- **B — Wordmark drift.** Each org in the wordmark row gets its own
  data-reveal with a stagger (delays 1–4) so they settle in sequence like
  credits. The lede fades separately.
- **C — Card deal.** The three flagship cards now deal in weight order:
  Teradata (no delay) -> SignChatter (delay 2) -> Experiments (delay 3).
- **D — Scroll-cue shimmer.** A soft accent pulse travels down the scroll
  line every ~3.2s (a ::before gradient line sliding over the static
  ::after line). The one ambient loop on the homepage. Reduced motion: off.

**Issue found + fixed (1):** the count-up appeared to jump straight to the
final value because the counter only started at reveal time — an element
already in view at load counted before anyone could see it. Fix: zero the
counters when the observer is set up.

**Validation**
- Build green (12 pages).
- Count verified live: 4× sampled mid-count as 2× -> 3× -> 4×.
- Reduced motion (emulated): final values shown, no counting, no shimmer.
- Mobile 360px: no overflow, values correct.

---

## 2026-10-02 — Spectacle strategy: band off homepage, hero choreography instead (Module C of 03)

**User feedback:** the RouterBand + caption felt "random and forced" on the
homepage — a demo dropped between editorial sections. Correct call: the
homepage's motion should elevate what's already there, not add a content
block. The band itself is good and will be re-homed to /work/experiments in
Module D (where it belongs, next to the real data).

**Deviation from 03-modification-strategy (approved by user):** H2 is no
longer the router band on the homepage. It is now "Option 3" — two
decorative-but-restrained layers working with existing hero elements only:

1. **Entrance choreography.** The hero statement sets line by line (three
   soft staggers via the existing data-reveal system, 90ms apart), then the
   hand-drawn underline draws (retimed to 950ms, right after line 3 lands),
   then byline + scroll cue follow. Same elements, same timing budget —
   choreographed instead of simultaneous.
2. **Breathing hero field.** A very soft accent-tinted radial glow
   (5.5% opacity) behind the statement drifts and brightens/dims on a 16s
   ease-in-out loop (transform + opacity only). Sits behind the existing
   grain layer. Deliberately below conscious notice.

**Implementation**
- src/pages/index.astro: statement split into three .hero-line spans
  (display:block) with data-reveal delays 0/1/2; underline delay 750→950ms;
  new .hero::after glow layer + hero-breathe keyframes; RouterBand import,
  section markup, and styles removed.
- src/components/RouterBand.astro kept in repo (unused until Module D).

**Validation**
- Build green (12 pages).
- Desktop: lines reveal in sequence, stroke draws at ~950ms and stays,
  glow animation running (hero-breathe).
- Reduced motion (emulated): all lines fully visible immediately, stroke
  present with no animation, glow animation off.
- Mobile 360px: no overflow, lines stack cleanly.

---

## 2026-10-02 — Spectacle strategy: H1 hero underline (Module B of 03)

**Module:** B of 03-modification-strategy — hand-drawn stroke under "outside
the notebook" in the hero statement.

**Implementation**
- src/pages/index.astro: thesis phrase wrapped in .hero-underline with an
  inline SVG path (slightly wavy, round caps, accent color). Draws itself
  left-to-right once, 700ms, starting 750ms after load (just as the
  statement's reveal finishes). No JS needed — pure CSS animation.

**Issues found + fixed (2):**
1. The `.js` class gate never matched: Astro scopes styles with attribute
   selectors, and `.js` lives on <html> which has no scope attribute, so
   `.js .hero-underline-stroke path` matched nothing. Fix: dropped the gate
   and used `animation-fill-mode: backwards` instead (hidden during the
   delay, no flash). No-JS guarantee preserved: the stroke is never
   permanently hidden, it just plays immediately.
2. Stroke vanished after drawing: fill mode `backwards` alone reverts to the
   pre-animation (hidden) state when the animation ends. Fix: `both`.

**Validation**
- Build green (12 pages).
- Verified in browser: stroke hidden at load, draws ~750ms in, ends at
  dashoffset 0 and STAYS drawn.
- Reduced motion (emulated): stroke simply visible, no animation.
- Mobile 360px: no horizontal overflow; phrase stays on one line.

---

## 2026-10-02 — Spectacle strategy: data prep (Module A of 03)

**Module:** A of 03-modification-strategy — verify data, prep assets.

**Data verification (against the repos' REPORT.md files, 2026-10-02):**
- budgeted_model_routing: strategy §4 table matches exactly (10/25/50/75/100%
  budgets; router beats random at every budget; 27.9% always-small baseline).
  Bonus number found: router@50% timing = 17.7s (useful for the E1 slider's
  time readout interpolation).
- rag_corruption_test: strategy §4 matches exactly (F1 0.649/0.440/0.337/0.314;
  recall 0.712 Clean, 0.800 Remove 1; EM 0.562/0.362/0.288/0.275; Ender's Game
  abstention example confirmed verbatim).
- No fabricated numbers anywhere; nothing needed correcting.

**Implementation**
- New script: scripts/extract-sign-keypoints.py — one-off MediaPipe Hands
  extraction from one WLPSL sample video -> compact JSON at
  src/assets/sign-keypoints.json (15 fps sampling, 0..1 normalized points,
  3-decimal rounding, provenance fields). Cannot run until the user picks
  the sign/video (Module F input).

**Validation**
- `npm run build` green, 12 pages.

**Waiting on user (not blocking until Module F):** which sign/word to
animate + the sample video file.

---

## 2026-10-02 — Spectacle strategy approved: "Spectacle, honestly"

**User request:** after comparing against a spectacle-heavy peer site
(awaisbinadil.dev), add stronger visual storytelling + a few "holy shit"
moments — while keeping the light Apple/Verge aesthetic and avoiding that
site's failure modes (decorative animation, music, dark theme, gimmick copy).

**Decisions (approved by user):**
- Governing principle: spectacle must be EVIDENCE, ANIMATED. Every new moment
  visualizes real work with real repo data; nothing decorative.
- Six moments approved: H1 hero underline ("outside the notebook"), H2 "The
  Router" ambient band on the homepage (real routing data, 75/25 dot split),
  E1 budget slider widget, E2 RAG corruption 4-state control, S1 SignChatter
  hand-skeleton loop (real MediaPipe keypoints), T1 Teradata scrollytelling.
- 02-strategy §G amended: motion budget ~5 → ~9; two gentle ambient loops
  permitted (router band, skeleton) with pause-off-screen + reduced-motion
  static frames.
- Data verified against repos: routing table (27.9 baseline; router beats
  random at every budget; 12.2s/14.2s/26.4s timings) and corruption F1
  (0.649 → 0.440 → 0.337 → 0.314) — recorded in 03-modification-strategy §4.
- Process: new numbered strategy file per modification round
  (planning/03-modification-strategy.md) + two reusable prompts
  (Modification Planning, Modification Implementation). 02-strategy.md kept
  as untouched history.

**Open input needed (Module F only):** user picks which sign/word to animate
and points to the sample WLPSL video for keypoint extraction.

**Status:** planning complete, no code yet. Next: Module A (data prep) on
user's "go ahead".

---

## 2026-09-29 — Fourth experiment added: hold-the-line (pushback resistance)

**User request:** add the new hold-the-line experiment (sycophancy under
pushback; reuses Aamir & Bin Adil 2026 behavioral protocol, extends it with
Qwen3 thinking ON/OFF + a Qwen3-4B size follow-up) to the website.

**Decisions (approved by user):**
- Placement: 4th section on /work/experiments (keeps the 3-flagship homepage
  weighting and the "one research program" framing, strategy §H).
- Two new figures: headline outcomes (flip/hold/abandon, thinking OFF vs ON)
  + cost (tokens/latency). Both use REAL data from the repo's REPORT.md.
- Added a second Note writeup (strategy allows 1–2 at launch).

**Implementation**
- New components: src/components/figures/FlipRateBars.astro and
  ThinkingCost.astro — same grow-on-scroll bar pattern as CorruptionBars,
  with a legend (off = muted ink, on = accent) and full aria-labels.
- src/content/work/experiments.mdx: new section "4. Pushback resistance —
  reliability, at a price" (question → method → finding → limitations,
  source paper credited); intro + closing rewritten for four studies;
  frontmatter summary/stack/links updated (added hold-the-line repo, MLX,
  TriviaQA).
- src/pages/index.astro: experiments card "3 studies" → "4 studies".
- src/pages/research.astro: "Four experiments" done-item, Reliability pillar
  note mentions pushback resistance, added a 6th "Questions I'm sitting
  with" item (does the test-time-reasoning gain hold at scale).
- New note: src/content/notes/hold-the-line.md (hedged title — the result's
  CI includes zero, so the copy says "appears to", matching the honest-
  results brand).

**Validation**
- `npm run build` succeeds; 12 pages built (new: /notes/hold-the-line/).
- Visually verified in preview: new section + both charts render with the
  real numbers; notes index shows both notes newest-first; homepage card
  and research page copy updated.

---

## 2026-09-28 — GoatCounter analytics

**User request:** visitor analytics, but no self-hosting and no payment.

**Decision:** GoatCounter free hosted tier — privacy-friendly, cookie-free, no
personal data, no consent banner needed. (Note: "who visited" is aggregate
only — counts, pages, countries, referrers, devices. No names/identities;
that's a hard technical + legal line.)

**Implementation**
- Added an ANALYTICS block to src/site.config.ts: ENABLED flag +
  GOATCOUNTER_CODE ('jnx01'). Single toggle to turn tracking on/off.
- The tracking script loads in Base.astro (every page) only when ENABLED is
  true. Async, never blocks the page.
- Trade-off noted: this adds one third-party script, a small justified
  exception to the "no third-party services" performance stance (§18).

**Setup required (user):** sign up free at goatcounter.com with site code
'jnx01' so the dashboard matches the data-goatcounter URL.

**Validation**
- Build succeeds; script present on all 11 pages, pointing to
  jnx01.goatcounter.com/count.

---

## 2026-09-27 — Site config (single source of truth)

**User request:** the resume link will keep updating, so it should be editable
in one place.

**Implementation**
- Created src/site.config.ts with shared constants: RESUME_URL, EMAIL_DISPLAY,
  LINKEDIN_URL, GITHUB_URL. Each has a plain-language comment.
- All pages/components now import from it instead of hardcoding: homepage
  (contact row + email tooltip), contact page (all four rows), about page
  (resume link), footer (email + social).
- To update the resume link: edit RESUME_URL in src/site.config.ts and
  rebuild. Documented in docs/02-editing-and-maintenance.md §6.

**Validation**
- Build succeeds; resume link on 3 pages, email display on all 11 (footer is
  global); constants resolve correctly in rendered output.

---

## 2026-09-27 — About page: talk photo replaces headshot

**User request:** replace the headshot at the end of the About page with the
talk photo (the GDG stage photo added earlier).

**Implementation**
- Swapped <Headshot size="small"> for the talk photo (same prepped
  public/images/talk-* assets) with the same caption as the homepage. Removed
  the now-unused Headshot import; added .about-photo styles.
- Note: the headshot is still used in the homepage hero (its primary home).
  The About page now shows the talk photo instead — the two pages no longer
  share the same image, which is fine (strategy §F allowed "reuses the same
  image at smaller size OR omits it"; we now show a different, more
  leadership-flavored image).

**Validation**
- Build succeeds; photo + caption render; no mobile overflow.

---

## 2026-09-26 — Scroll-cue line fix

**Bug:** on refresh, the vertical line below "SCROLL" never appeared.

**Root cause:** the line grows via the CSS rule `.js .scroll-cue.is-revealed::after`,
which needs the `is-revealed` class on the `.scroll-cue` span. But `data-reveal`
was on the wrapping `<p class="hero-scroll">`, so `is-revealed` landed on the
wrapper, not the span — and the line stayed at scaleY(0) forever.

**Fix:** moved `data-reveal="fade"` onto the `.scroll-cue` span itself, so the
class lands where the line-grow CSS expects it. Verified: on fresh load the
line's transform reaches scaleY(1) (matrix(1,0,0,1,0,0)).

---

## 2026-09-26 — Module 0: Foundation

**Decisions**
- Accent color confirmed: electric indigo `#4F46E5`. Used only for links,
  focus rings, diagram strokes, one hero detail (strategy §L).
- Git history kept (planning commits preserved); site builds on top.
- Stack per strategy §O: Astro + TypeScript (strict), vanilla CSS with custom
  properties (no Tailwind), `@astrojs/sitemap`. React islands deferred until
  the Work module actually needs interactive figures — keeping Module 0 lean.
- Webfonts (Newsreader/Inter/JetBrains Mono) deferred to Module 1 (design
  system); tokens currently fall back to system fonts.
- Stub pages created for /work, /research, /about, /notes, /contact so the nav
  has no broken links from day one. Each stub is replaced in its own module.
- Deploy: official Astro GitHub Actions workflow (`.github/workflows/deploy.yml`).
  One-time repo setting needed at launch: Settings → Pages → Source = GitHub Actions.

**Open inputs**
- None blocking. (Headshot asset prep happens in Module 3.)

---

## 2026-09-26 — Module 1: Design system

**Decisions**
- Webfonts via Fontsource variable fonts (Newsreader, Inter, JetBrains Mono):
  self-hosted, one file per family, font-display: swap. No Google Fonts
  requests — better performance/privacy, works offline.
- Newsreader uses its optical-size axis (auto) for display type.
- `.prose` class scopes long-form reading styles (used later by Markdown
  content); links in prose are always underlined (WCAG: color is never the
  only cue in running text).
- Code styling is light "paper" style (tinted background), not a dark theme —
  keeps the light-first identity.
- Layout primitives as plain CSS classes (`.section`, `.grid`, `.cluster`,
  `.stack`) + two components (`Card`, `Tag`). No component library.
- Home page temporarily carries a design-system preview strip; it becomes the
  real "Selected work" section in Module 3.

**Issues found/fixed**
- None this module. (Module 0's mobile nav overflow fix held up.)

---

## 2026-09-26 — Module 2: Motion system

**Decisions**
- No animation library for the global system. One ~20-line
  IntersectionObserver script in Base.astro + motion.css covers the shared
  vocabulary (reveal, stagger, link-draw, scroll cue). Heavier moments
  (SVG draw-on for the pillar diagram, experiment figure animation) arrive
  with their pages in later modules; a library (Motion/GSAP) will only be
  added if those need it.
- Progressive enhancement contract: elements are only hidden pre-reveal when
  `html.js` is present (set by an inline script before first paint). No-JS
  users see the full page; reduced-motion users get opacity 1 with ~0ms
  transitions. Verified both paths in-browser.
- The single entrance gesture is a 16px rise + fade at 600ms ease-out;
  stagger steps are 90ms. One gesture, reused — that's the "coherent" part
  of the motion language.
- Scroll cue grows once and holds (no looping), per strategy §E/§G.

**Validation**
- Normal motion: hero starts at opacity 0 → reveals to 1 (checked live).
- prefers-reduced-motion (emulated): opacity 1 immediately, durations ~0.
- JavaScript disabled (fresh context): no `js` class, all content visible.

---

## 2026-09-26 — Module 3: Homepage

**Decisions**
- Headshot pipeline: `scripts/prepare-headshot.mjs` (uses sharp, already
  bundled with Astro). Crops to 4:5 with face-aware 'attention' positioning,
  gentle warm grade (sat 0.92, bright 1.02, +2% contrast), exports
  AVIF/WebP/JPEG at 600w + 1200w. 2x AVIF is only ~17KB.
- Headshot treatment: soft matte (warm tinted field + hairline border +
  small radius) done in CSS, so the image file stays reusable. No frames,
  no filters beyond the grade.
- Hero: asymmetric 7fr/5fr grid, statement left, portrait right (~1/3 width).
  No CTA buttons; scroll cue is the CTA (strategy §E). Portrait parallax
  deferred — the fade-in reveal already gives polish; scroll parallax can be
  added in the polish pass if it still feels needed (kept motion budget tiny).
- Proof strip: semantic dl/dt/dd with visual order flipped (number first).
  Facts: ~40 endpoints, 2 promotions, 1 paper, 4x awards — all verifiable.
- Selected work weighting: Teradata col-7, SignChatter col-5, Experiments
  full-width below — matches strategy §H weighting.
- Person section: 3 sentences (writing, films, Islamabad/Margalla). No
  lifestyle content beyond that.
- Stub pages added for /work/teradata, /work/signchatter, /work/experiments
  so homepage cards never dead-link; replaced in the Work module.

**Issues found/fixed**
- Missing space before "(FYP → publication)" in timeline — fixed.

**Open inputs**
- Person-section copy (writing/films/Islamabad) is my draft from the audit —
  happy to adjust wording if any line doesn't sound like you.

---

## 2026-09-26 — Module 4: Navigation / shared layout

**Decisions**
- Nav and footer were already built in Module 0 and held up to the audit
  (5 items, no hamburger, aria-current, ≥44px targets, footer contact links).
  So this module was hardening, not rebuilding.
- Page transitions: implemented via Astro's ClientRouter (view transitions) —
  motion moment #5 (fast cross-fade + slight rise, 180/220ms). Browsers
  without support fall back to normal navigation automatically.
- The reveal script now listens to `astro:page-load` (fires on first load AND
  after every client-side swap) so [data-reveal] elements on the new page get
  fresh observers. Without this, reveals would silently break after the first
  client-side navigation.
- Transition animations are gated behind prefers-reduced-motion; reduced-motion
  users get an instant swap (no cross-fade).
- Footer external links kept same-tab (back button works, rel="me" already
  present for identity). No target=_blank — deliberate UX choice.

**Issues found/fixed**
- Astro collapses whitespace between inline text and a following <span>, which
  ate the space before "(FYP → publication)". Fixed with &nbsp; inside the
  span. Verified via the accessibility tree ("research that shipped (FYP…)").

**Validation**
- Client-side nav: title/URL update without full reload; hero reveal re-fires
  after navigating home via view transition.
- Keyboard: first Tab focuses the skip link and makes it visible.

---

## 2026-09-26 — Module 5: Experience (About page)

**Decisions**
- Experience lives on /about as a vertical timeline (strategy §J), most recent
  first. Teradata gets ONE entry with the progression line visible
  (Trainee → Consultant I → Engineer II) rather than three separate cards —
  shows the two promotions as growth, not repetition.
- Narrative paragraphs, not resume bullets. Teradata content kept at safe
  abstraction: no client names, no internal architecture detail, only what
  the resumes already state publicly.
- Awards compressed to the 5 signal-bearing ones (strategy §J); dropped
  ExciteCup and the merit-scholarship count. GDSC/BCS leadership included as
  one line under "The person" (approved by user).
- Education: Bahria (valedictorian, 3.83/4) + Cambridge O&A levels.
- Headshot reused at 'small' size in the person section (strategy §F: one
  headshot site-wide, About reuses it smaller).
- All facts verified against industrial-resume.txt: ~40 endpoints, 60 tests /
  75% coverage, 35+ bugs, 3 mentored, DenseNet3D 97%, 15k videos 73–86%,
  ICCIS Dec 2024 Springer.

**Open inputs**
- The Teradata narrative is my synthesis of the resume bullets into prose.
  Worth a read for tone/accuracy — especially the middle paragraph (agentic
  skills + evaluation), which compresses several resume bullets.

---

## 2026-09-26 — Module 6: Projects (case-study system)

**Decisions**
- Content collections + Zod schema (src/content.config.ts) per strategy §Q.
  Each case study is one Markdown file in src/content/work/; the dynamic route
  src/pages/work/[...slug].astro renders it through the CaseStudy layout.
  Adding a new case study = one Markdown file, no page redesign (§19).
- CaseStudy layout: kicker (kind), title, summary, Tag stack line, links,
  and an automatic confidentiality notice when confidential:true (Teradata).
- /work index reads the collection and sorts by weight (Teradata 1,
  SignChatter 2, Experiments 3), same weighting as the homepage.
- Experiment numbers pulled from the actual repos (via README/REPORT files):
  routing 33.6% vs 30.7% @25% budget; RAG F1 0.649→0.440→0.337→0.314;
  eval disagreement 57.1% vs 30.1% error, strong evaluator 52% vs scouts 32%.
  The negative result is presented as a credibility asset (strategy §H).
- SignChatter screenshots: 4 real app screens resized to 640w WebP+JPG,
  shown as a .figure-strip in the markdown body.

**Open inputs (RESOLVED)**
- SignChatter links updated with the real URLs (user-provided):
  GitHub github.com/jnx01/SignChatter, Springer chapter 10.1007/978-981-95-2212-5_13,
  Kaggle WLPSL dataset. Verified in built output.
- Teradata case study has no external links (confidential) — confirmed correct.

---

## 2026-09-26 — Module 7: Research page

**Decisions**
- /research built per strategy §I: theme sentence (with healthcare mentioned
  ONCE as a motivating high-stakes domain, alongside finance), two pillars as
  concrete questions, done vs. exploring clearly separated, publication block.
- PillarDiagram: inline SVG, theme node branches to Efficiency + Reliability.
  Connectors draw themselves on scroll via stroke-dashoffset (motion moment
  #3). SVG is decorative (role=img + <title>); the same two questions are in
  text beside it, so nothing is conveyed by animation alone. Reduced motion:
  strokes render fully drawn, no animation.
- "Done" = 3 artifacts (SignChatter peer-reviewed, the 3 experiments, RA work)
  each with question→method→finding→links. "Exploring" = 5 open questions
  with an explicit "these are not claims" note. Independent experiments are
  NOT presented as peer-reviewed (content-integrity rule).
- The 5 exploring questions are grounded in the actual experiment findings
  (routing cost-of-being-wrong, RAG degradation detection, LLM-graded metric
  trust, model size vs reliability, disagreement-signal generalization).

**Validation**
- Draw-on animation fires (dashoffset 200→0, is-revealed applied).
- Reduced motion: dashoffset 0 immediately, transition ~0ms.
- No mobile overflow at 375px.

**Open inputs**
- The 5 "questions I'm sitting with" are my phrasing, grounded in your repos.
  Adjust any that don't match what you actually want to explore next.

---

## 2026-09-26 — Research direction refinement + manuscripts

**User input**
- Research pillars refined: Efficiency = SLM capability/efficiency + LLM
  routing ("doing more with less"); Reliability = agent evaluation and
  robustness (retrieval, LLM-as-judge, trustworthy AI, safety/security,
  accuracy). Healthcare = one motivating gesture ("...trusted in high-stakes
  domains like healthcare"), never claimed expertise.
- RA projects at CoE-AI produced manuscripts that were submitted to
  conferences, rejected, and later abandoned. User asked to mention them.

**Decisions**
- Updated /research lede to gesture toward healthcare per the user's framing.
- Updated both pillar notes to the user's exact framing (SLM+routing under
  Efficiency; agent eval/robustness/trust under Reliability).
- Added the manuscripts as ONE honest parenthetical under the RA work item,
  styled muted/italic so it reads as an aside, not a publication claim.
  Wording: "written up as manuscripts and submitted to conferences; they
  weren't accepted, and we later set them aside." This follows strategy §N
  (at most one honest parenthetical) and the content-integrity rule — real
  work, honestly framed, NOT listed as publications.
- Homepage pillar questions already matched; no change needed there.

---

## 2026-09-26 — Certifications line + Module 9: Personal content

**Certifications (user-approved)**
- Added one quiet line at the end of the Toolbox: Teradata PE AgenticAI,
  Enterprise Vector Store, HuggingFace AI Agents, Google–Kaggle GenAI
  Intensive. Muted, full-width, below a hairline — not a wall (strategy §K).

**Module 9 — Personal content (audit + fix)**
- Audited personality against strategy §D/§N: it appears in two places
  (Home "The person", About "Outside of work"). Right amount — but the two
  were near-verbatim duplicates (writing + films + Islamabad/Margalla).
- Fix: differentiated them. Home = compressed two sentences + "More about
  me →" link. About = fuller version (writing detail, GDSC/BCS leadership,
  films, Islamabad). Each now earns its place; no verbatim duplication.
- Personality stays seasoning, not a lifestyle blog — no new sections added.

**Validation**
- Build succeeds; home and about person-notes confirmed distinct.

---

## 2026-09-26 — Module 10: Contact

**Decisions**
- /contact per strategy §D: three large, confident links + one sentence, no
  form. GitHub Pages is static; a form would need a backend for no benefit.
- Email is the primary action (listed first, mentioned in the title).
- Each link is a full-width row: method in display serif, address in mono,
  separated by hairlines. Hover nudges the row right slightly (gated behind
  reduced-motion). Tap targets are 126–156px tall — far above the 44px min.
- rel="me" on LinkedIn/GitHub for identity verification.

**Validation**
- Build succeeds; no mobile overflow; tap targets ≥44px; semantic list.

---

## 2026-09-26 — Final QA (everything except deployment)

**SEO added**
- og image: generated public/images/og.jpg (1200x630) — name in serif,
  tagline, accent rule, headshot right. Wired as og:image + twitter:image
  with width/height. Absolute URL via Astro.site.
- JSON-LD Person schema on every page (name, url, image, jobTitle, worksFor
  Teradata, Islamabad/PK, sameAs LinkedIn+GitHub). Only verifiable facts.
- Already present from earlier: unique title/description per page, canonical
  URLs, sitemap-index.xml, robots.txt, 404.html.

**QA results (all pages)**
- Content: all facts verified against resumes/repos throughout; no invented
  claims; Teradata at safe abstraction; manuscripts honestly framed.
- Links: all internal links across all 10 pages resolve 200. No broken links.
- Console: zero console errors / page errors on all 10 pages.
- SEO: every page has unique title, meta description, canonical, og:image.
  Exactly one h1 per page. JSON-LD present.
- Accessibility: no images missing alt; no broken images; focus outline 2px
  visible on keyboard nav; contrast — ink 16.7:1, muted 6.4:1, accent 6.0:1
  (all exceed WCAG AA 4.5:1). Reduced-motion + no-JS verified in earlier
  modules.
- Performance: total dist 980K; images 356K (headshot AVIF ~17KB); 15 woff2
  fonts 420K (variable, subset); JS shipped 16K (near-zero-JS baseline);
  homepage HTML 18.8KB. Fast.

**Not done (per user instruction)**
- Deployment: GitHub Actions workflow exists (.github/workflows/deploy.yml)
  but not yet pushed live. Remaining at launch: push to jnx01.github.io repo,
  Settings → Pages → Source = GitHub Actions.

---

## 2026-09-26 — Experiment figures (motion moment #4)

**Decisions**
- Added the two approved experiment figures (strategy §G moment #4, §M
  "redraw as styled SVG/web-native charts"). Both use REAL repo data:
  - RoutingCurve: accuracy vs budget, router vs random (10/25/50/75%).
    Accent router line draws itself on scroll (stroke-dashoffset); random is
    a muted dashed baseline. SVG with gridlines, axis labels, legend.
  - CorruptionBars: answer F1 by evidence condition (Clean 0.649 / Remove 1
    0.440 / Remove All 0.337 / Contaminated 0.314). Horizontal bars grow on
    scroll (scaleX), staggered.
- Installed @astrojs/mdx so the experiments case study (now .mdx) can embed
  the figure components inline in the Markdown body. Work collection now
  loads .md + .mdx.
- Both figures are accessible: SVG has role=img + title/desc; bars have an
  aria-label with the numbers; the same figures are in the prose. Reduced
  motion: line fully drawn, bars full width, no animation.

**Validation**
- Build succeeds (11 pages). Both charts render; router line draws
  (dashoffset 600→0). No mobile overflow. Reduced motion: bars transform
  none, line dashoffset 0 immediately.

---

## 2026-10-04 — Taste-skill / Vercel guidelines pass (hero CTA, dark mode, dash purge)

**Decisions**
- Hero: added an action row under the summary — primary button "See my
  resume" (solid accent, white label, 8.6:1 contrast) + Email / LinkedIn /
  GitHub text links. The email-reveal popup moved with them. The "Scroll"
  cue was deleted (taste-skill bans scroll cues; the CTA is more useful).
- Removed the Email / LinkedIn / GitHub / Resume row from the bottom of
  "Outside of work" (now redundant with the hero).
- Removed all five homepage eyebrows ("Selected work", "Research",
  "Experience", "Recognition", "The person"). Headlines carry the sections.
  Subpages keep their kickers.
- Dark mode: optional, toggle in the top-right nav (light-bulb icon; outline
  = light, lit + rays = dark). Theme is applied pre-paint in Base.astro
  (localStorage, else OS preference), re-applied after every view-transition
  swap, and the toggle re-binds on astro:page-load. Dark tokens live in
  tokens.css under [data-theme='dark'] (warm near-black #161614, lighter
  indigo accent #8f88ff for AA contrast). Added --color-on-accent for
  text/icons on the accent color.
- Dash purge: zero visible em-dashes or en-dashes site-wide (verified in the
  built HTML with scripts/styles/comments stripped). Ranges use hyphens
  (2023-present, 73-86%); prose uses commas, colons, semicolons, or
  parentheses. Browser tab title now uses "·" instead of "—".
- Typographic quotes in visible copy (citations, "talk", "think", "scout",
  the CorruptionDial example). Straight apostrophes left as-is.
- Vercel fixes: meta theme-color (kept in sync with the toggle),
  color-scheme light/dark on :root / [data-theme='dark'], scroll-margin-top
  5rem on [id] so anchor jumps clear the sticky nav. Non-breaking spaces
  skipped: no wrappable number+unit text nodes exist (SVG text does not
  wrap; "3.83/4" has no space).

**Issues found**
- src/content/work/teradata.md and signchatter.md were stale untracked
  duplicates shadowing the real .mdx files (glob loader picked .md first).
  The live Teradata page rendered a raw "import TeradataArch ..." line as
  text, and TeradataArch.astro no longer exists. Both .md files deleted;
  case studies render correctly again. SignSkeleton.astro is now dead code
  (only the deleted .md referenced it) — left in place, harmless.
- Edit-tool quirk: changes whose only diff is a non-ASCII character
  (en-dash → hyphen, straight → curly quotes) silently no-op. Workaround:
  change an adjacent ASCII character too, verify, then change it back.

**Validation**
- Build succeeds (12 pages). Homepage, About, Research, case studies checked
  in light + dark. Theme persists across view transitions; toggle works
  before and after swaps. Mobile (390px): nav wraps cleanly, hero CTA row
  fits above the fold.

---

## 2026-10-04 (later) — Case-study restoration + hero CTA change

**What actually happened (correcting the earlier entry)**
- The deleted .md duplicates were NOT the newest versions. The real newest
  work was already in the .mdx files (SignSkeleton import + <SignSkeleton />
  in signchatter.mdx; TeradataArch import + <TeradataArch /> in
  teradata.mdx), and TeradataArch.astro had been restored from git history.
  Nothing was lost. The confusion came from a STALE preview server on
  port 4322 serving an old build (started before the fixes), which made the
  pages look broken/missing figures. Lesson: always restart the preview
  server after rebuilding before judging the output.
- Deleting the .md duplicates was still correct (they shadowed the .mdx
  files and rendered raw import text).

**Verified restored (fresh build, fresh server on 4321)**
- /work/teradata/: scrollytelling architecture diagram (data-scrolly-arch)
  + 40 endpoint squares + 36 bug squares. No raw import text.
- /work/signchatter/: SignSkeleton animated hand figure + keypoints.gif
  (loads, naturalWidth > 0) + 4 app screenshots.

**Hero CTA change (user request)**
- Primary button is now "See My Work" linking to /work/ (was "See my
  resume" linking to the PDF).
- Resume added as a quiet text link after GitHub in the hero link row.

---

## 2026-10-04 (later still) — About page: scope-growth arc diagram

**Decision**
- Added ScopeArc.astro (src/components/figures/): the two Teradata
  promotions drawn as widening scope. Three roles (Trainee Consultant 2023,
  Consultant I 2024, Engineer II 2025), each with a bar of accent blocks
  sized 1 / 2 / 4 (real scope: one service; the API layer of 40 endpoints
  across 2 services; plus agentic skills, evaluation, mentoring). Placed
  between the Experience heading and the timeline.
- Block bars fill in on scroll (IntersectionObserver, staggered), width is
  blocks/max of the column so the 1:2:4 growth is visible (measured 88 /
  176 / 351 px). Reduced motion / no JS: all blocks visible, no animation.
  Caption: "Two promotions in under two years. The scope widened each time."
- Matches the existing figure language (bg-tint panel, hairline border,
  accent blocks, mono caption), same as EndpointGrid / BugGrid.

**Validation**
- Build succeeds (12 pages). 3 stages, 7 blocks, all fill on scroll.
  Verified in light and dark mode.

## 2026-10-05 — External links open in a new tab

**Decision**
- All links that leave the site now use target="_blank" with
  rel="noopener noreferrer" (merged with the existing rel="me" on
  LinkedIn/GitHub links).
- Hand-edited links in .astro files: research.astro (Springer x2, Kaggle,
  Bahria thesis), about.astro (resume), contact.astro (LinkedIn, GitHub,
  resume), index.astro (LinkedIn, GitHub, resume), Footer.astro (LinkedIn,
  GitHub), CaseStudy.astro (frontmatter links).
- Links inside Markdown/MDX bodies (notes, case studies) are handled
  automatically by a small Satteri hast plugin in astro.config.mjs
  (externalLinksNewTab): any <a> whose href starts with "http" gets
  target/rel added at build time.

**Issue / fix**
- First tried rehype-external-links via markdown.rehypePlugins, but Astro 7
  defaults to the Satteri markdown processor and the legacy rehypePlugins
  key fails the build. Switched to Satteri's own plugin API
  (defineHastPlugin from the satteri package) and removed
  rehype-external-links. Added @astrojs/markdown-satteri and satteri as
  direct dependencies.

**Validation**
- Build succeeds (12 pages). Grep of dist/: 47 external links, all with
  target="_blank"; zero external links without it.
