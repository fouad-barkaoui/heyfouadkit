# Kanz — Spatial Workspace

A single-screen personal workspace: notebook, task engine, article & PDF hub, course
repository, document storage, analytics, universal search and a curated vault — all on
one spatial canvas with a WebGL field behind it.

Built for **FOUAD BARKAOUI**.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
```

That is the whole setup. The app runs **offline by default** against `localStorage`
and starts completely empty — nothing is preinstalled, so the first thing you see is
a blank workspace ready to build. "Reset this device" in the account panel clears it
back to that same blank state; your cloud copy, if you have one, is untouched.

**Browsing is always free; creating is not.** Anyone can open every module, look
around and see the empty states with no account at all. The moment they try to
create or upload anything — a note, task, article, course, document or badge — they
are dropped into the sign-in panel instead, once a cloud project is configured (see
[Data layer](#data-layer)). Without a cloud project, there is nothing to sign into,
so the gate is a no-op and everything works locally as before.

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check, then production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc -b` across both project references |
| `npm run lint` | oxlint over `src` |
| `npm run test` | Vitest unit + component suite |
| `npm run smoke` | Build, then drive the real UI in Chromium (desktop + mobile) |
| `npm run verify` | All four gates in sequence |

---

## Design system — Linear "midnight precision instrument"

Darkness is the substrate, not a theme. Elevation comes from hairline borders and
inner shadows rather than ambient drop shadows, and exactly one chromatic accent
signals action.

| Role | Token | Value |
|---|---|---|
| Page canvas | `--color-void` | `#08090a` |
| Card surface | `--color-carbon` | `#0f1011` |
| Elevated panel | `--color-obsidian` | `#161718` |
| Hairline border | `--color-graphite` | `#23252a` |
| Body text | `--color-mist` | `#d0d6e0` |
| Muted text | `--color-fog` / `--color-ash` | `#8a8f98` / `#62666d` |
| Primary action | `--color-acid` | `#e4f222` |

Rules the codebase holds to:

- **Weights cap at 590.** Nothing is bold; hierarchy comes from size and tracking.
- **Three radii only** — 6px controls, 12px cards, 9999px pills.
- **Acid lime is one button per view.** Never decoration, never a secondary action.
- **No gradients on chrome.** The only gradient is the atmospheric floor behind the
  WebGL field.
- **Tracking is tight** — −0.022em at display sizes, −0.011em in UI text.
- Inter (variable) for everything; JetBrains Mono for record IDs, shortcuts and
  technical metadata only.

Tokens live in `src/styles/index.css` under `@theme`, so Tailwind utilities
(`text-mist`, `bg-carbon`, `border-graphite`) resolve straight to them.

### Light / dark / system

Dark is the native default, but every surface, border and text token above is
overridden for light mode — a person's explicit choice (`data-theme="light"`) or
their OS preference when they haven't chosen. The switch lives at the bottom of the
module rail on every device (a cycling icon button when the rail is collapsed, a
three-way segmented control when it's expanded, and the same control again in the
mobile drawer), persists to `localStorage`, and repaints the whole app instantly —
including the WebGL field, whose additive particle glow switches to ordinary
blending so it doesn't wash out over a light page.

---

## Layout — the three-pane shell

```
┌────────┬──────────────┬──────────────────────────────────┐
│  rail  │   context    │            content               │
│ (nav)  │    panel     │        (detail / board)          │
└────────┴──────────────┴──────────────────────────────────┘
```

- **Rail** — grouped module navigation (Workspace / Library / Insight) with an
  acid marker on the active row. Collapses to a 60px icon rail with tooltips.
- **Context panel** — per-module list, search, filters and folder tree.
- **Content** — the record, board or dashboard.

On phones the two panes collapse into one stack: the panel is the list view, the
content is the detail view, with a back affordance between them and a drawer for
navigation. Modules never auto-open a record on a narrow screen.

---

## Motion

Animation is structural, not decorative. Everything shares one easing family.

| Where | What happens |
|---|---|
| Module switch | Pane lifts in from below with the blur clearing (`ViewTransition`) |
| WebGL field | Particles **re-form** into that module's shape — sphere, helix, grid, torus, lattice, spiral, ring — dispersing at the midpoint of the morph, and the tint crossfades |
| Lists & grids | GSAP stagger on mount and on every filter change (`useStagger`) |
| Kanban | GSAP **Flip** — cards travel to their new column instead of teleporting |
| Task completion | Particle burst fired from the checkbox that was ticked |
| Timeline | The connector rail draws downward; nodes settle in behind it |
| Rings & bars | Arcs sweep and bars grow from zero on value change |
| Counters | Stat tiles count up to their value |

`prefers-reduced-motion` is honoured throughout: transitions collapse, the field
stops rotating and snaps between shapes, and the completion burst does not fire.

---

## Modules

| Module | What it does |
|---|---|
| **Notebook** | TipTap rich text, tags, day-grouped list, autosave. A new note is only written once it actually has a title, body or tag — clicking "New" never leaves empty records behind. |
| **Pro To-Do** | Four views: day-grouped **List**, drag-and-drop **Board**, Eisenhower **Matrix** (importance from priority, urgency from the due date), and **Timeline**. Priority weights, recurrence, overdue detection, completion ring. |
| **Articles & Media** | Write articles in place, or upload PDFs and images. Inline pdf.js viewer with page navigation, zoom and full-text search that reports which pages matched. A4 print preview with a real `@media print` stylesheet. |
| **Course Hub** | Link repository with progress tracking and a badge filter matrix. Badge creator: name, hex colour, icon. |
| **Docs Storage** | Knowledge-base browser — folder tree, folder cards, file table. Its badge namespace is **isolated** from the Course Hub's, so neither list fills with the other's tags. |
| **Analytics** | Stat tiles, an 18-week activity heatmap, a 30-day trend, library composition, course progress and tag distribution. |
| **Universal Search** | `⌘K` / `Ctrl+K` across every collection, with type filters, keyboard navigation and deep links into the owning module. |
| **Vault** | Everything starred anywhere, with corner ribbons by type and one-click return to the source record. |

Every module supports full create / read / update / delete.

---

## Data layer

The repository pattern in `src/data/` means components never know which backend is
live:

```
getRepository()  →  LocalRepository      (default, localStorage)
                 →  SupabaseRepository   (when both env vars are set)
```

To switch to Supabase:

1. Run `supabase/schema.sql` in your project's SQL editor. It creates the six
   tables, the enums, the indexes, per-user row-level-security policies, the
   `updated_at` triggers and the `nexus-media` storage bucket.
2. Copy `.env.example` to `.env` and fill both values.
3. Restart the dev server. No component changes.

Field names are camelCase throughout the app; the Supabase adapter converts to and
from snake_case at the edge.

### Record safety

Two failure modes are designed out rather than patched:

- **Legacy records.** Everything read from storage passes through
  `src/data/normalize.ts`, which fills missing fields and rejects invalid enum
  values. A record written by an older version can never blank the workspace.
- **Render failures.** A React `ErrorBoundary` wraps both the app and each module,
  so one bad record breaks one pane, not the session.

---

## Charts

Chart colour is computed, not eyeballed. The three-slot categorical palette
(`#6366f1`, `#12a3b0`, `#dd6a4e`) was validated against the `#0f1011` surface for
lightness band, chroma floor, colour-vision-deficiency separation (worst pair
ΔE 14.7 protan), normal-vision separation and ≥3:1 contrast — under all-pairs, not
just adjacent pairs. Magnitude charts use a single hue because they compare size,
not identity; the heatmap uses a one-hue sequential ramp. Every chart carries direct
value labels, a hover layer and a **table view**, so nothing is ever encoded by
colour alone.

---

## Verification

The build ships green on four gates:

- `tsc -b` — TypeScript strict, `noUncheckedIndexedAccess` on, 0 errors
- `oxlint src` — 0 warnings, 0 errors
- `vitest` — 39 unit and component tests
- `scripts/smoke.mjs` — 39 checks in real Chromium against the production build:
  every module opens, the WebGL canvas mounts, CRUD flows for notes / tasks /
  courses / docs, validation guards, all four task views, the badge namespace
  isolation, command-palette search and navigation, chart and table rendering,
  persistence across a reload, the mobile drawer, and no horizontal overflow on
  either viewport — with **0 console errors**.

Run all of it with `npm run verify`.

---

## Stack

React 18 · TypeScript (strict) · Vite 6 · Tailwind CSS 4 · Radix UI · Three.js +
@react-three/fiber · GSAP (with Flip) · TipTap · pdf.js · Supabase · Vitest ·
Playwright

Every module and the WebGL field are code-split, so a session only downloads the
panes it opens.
