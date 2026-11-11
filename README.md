# Kanz

A private workspace for tasks, habits, notes, saved links, articles, courses and
documents. English and Arabic (right-to-left), light and dark, installable as a PWA,
and usable offline.

Live at https://kanz-workspace.vercel.app. Built by Fouad Barkaoui.

## Run it

```bash
npm install
cp .env.example .env    # optional, see "Cloud" below
npm run dev             # http://localhost:5173
```

With no `.env` the app runs entirely in the browser (localStorage) and starts empty.

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check, then production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | oxlint over `src` |
| `npm run test` | Vitest unit and component tests |
| `npm run smoke` | Build, then drive the UI in a browser at phone, tablet and desktop widths |
| `npm run verify` | All of the above in sequence |

`npm run smoke` needs a browser for Playwright: either `npx playwright install chromium`
once, or set `PW_CHANNEL=chrome` to use an installed Chrome.

## Stack

React 18, TypeScript (strict), Vite 6, Tailwind CSS 4, Radix UI primitives, TipTap
(notes), pdf.js (PDF preview), three.js (SaveIt's optional 3D link map), Supabase
(auth, Postgres, storage, realtime). Deployed on Vercel; `api/unfurl.ts` is the one
serverless function (link previews for SaveIt).

## Layout

```
api/                 Vercel serverless functions
public/              Icons, manifest, robots, sitemap
scripts/             smoke test, service worker template
src/
  components/
    shell/           Top bar, search palette, sign-in screen, account menu
    onboarding/      Storage notice and cloud terms
    ui/ charts/ ...  Shared building blocks
  modules/           One folder per page (home, todo, saveit, settings, ...)
  state/             React context stores (auth, workspace, team, theme, language, UI)
  data/              Local repository, cloud sync, offline outbox, attachments
  i18n/              English and Arabic strings, one file per area
  lib/               Types, access rules, search, reminders, utilities
  styles/            Design tokens (index.css) and per-area stylesheets
supabase/
  schema.sql         Full schema, policies and functions
  migrations/        Dated changes applied to the live project
```

Navigation is defined in `src/modules/registry.ts`: Home, four sections (Plan, Library,
Workspace, Insight) and the pages in the menu (News, Contact, Settings). The top bar
shows the sections as pills from 1100px up and folds them into the menu below that.

## Design

Neutral surfaces with hairline borders, Geist and Geist Mono (self-hosted), and a
near-white primary action that inverts in light mode. Status colours (green, red,
teal, violet) are the only chroma. All tokens live at the top of
`src/styles/index.css` under `@theme`, so Tailwind utilities such as `text-paper`,
`bg-carbon` and `border-graphite` resolve to them.

## Cloud

Copy `.env.example` to `.env` and fill in the two Supabase values (the project URL
and the publishable anon key; never a service-role key). On Vercel the same names
are set under Project Settings, Environment Variables.

- Anyone can browse every page without an account. Creating or saving opens the
  sign-in screen (Google, or email and password).
- Every record belongs to a team. Row-level security checks team membership and role
  on each request; attachments live in a private bucket behind signed URLs.
- The app is local-first: changes made offline queue in an outbox and sync when the
  connection returns. The service worker caches the app shell for offline use.
- The admin account is listed in `src/lib/access.ts`.

To set up a new Supabase project, run `supabase/schema.sql` in the SQL editor.
