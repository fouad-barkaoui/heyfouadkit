# Deploying Barkaoui's Kit

Everything is wired and verified. The one step left has to run from **your own
Windows machine**, because it needs a browser sign-in to Vercel that a sandbox
can't do for you. It takes about two minutes.

---

Already done for you on this machine:

- every source file is in place and `npm install` has run
- `.env.production` and `.env.local` carry the Supabase URL and publishable key
- `npx tsc -b` is clean and `npx vite build` produces `dist/`
- one stale file from an earlier version was moved to `_to_delete\` — you can
  delete that folder whenever you like

---

## 1. Deploy

Open **PowerShell** and run these three lines:

```powershell
cd "$HOME\Desktop\project on the way\nexus"
npx vercel login
npx vercel --prod
```

- `npx vercel login` opens your browser once. Pick **Continue with GitHub** (or
  email) and come back to the terminal.
- `npx vercel --prod` asks a few questions. Press **Enter** for every one — the
  defaults are correct, and `vercel.json` already carries the framework, the
  build command, the output directory and the SPA rewrite.

When it finishes it prints a line like:

```
✅  Production: https://nexus-lovat-gamma-60.vercel.app [2s]
```

That URL is permanent and public. Vercel's Hobby plan doesn't sleep, so the app
stays reachable without you touching it again.

To ship a change later, edit the code and run `npx vercel --prod` again.

### Renaming the URL to say "Barkaoui's Kit"

The live URL (`nexus-lovat-gamma-60.vercel.app`) is just the Vercel **project
name** slugified, so renaming the project renames the URL — no redeploy, no
lost history, no broken links from the old one right away (Vercel keeps it
redirecting for a while).

In the [Vercel dashboard](https://vercel.com/dashboard): open the project →
**Settings → General → Project Name** → change it to something like
`barkaouis-kit` (Vercel will slugify it) → **Save**. Your new URL becomes
`https://barkaouis-kit.vercel.app` (or similar — Vercel appends a suffix if
that exact slug is taken). Everything else — the GitHub link, environment
variables, deploy history, any custom domain — carries over untouched.

(This has to happen from your own Vercel account — the project isn't visible
from the Vercel connection available in this sandbox, so it can't be renamed
from here.)

---

## 2. Sign in

Your account already exists in the Supabase project, with the email confirmed —
no verification mail to chase:

- **Email:** `lmorfouad3@gmail.com`
- **Password:** given to you in chat

Open the app, click **Account** at the bottom of the sidebar, sign in, then use
**Change password** in that same panel to set your own. Do that first.

---

## 3. Two new things: the sign-in screen and sticky notes

### A redesigned sign-in / sign-up screen

Signing in or creating an account no longer opens a small dark popup — it's now
its own light "desk" scene: a centred card with scattered decorative notes
around it. On a laptop or desktop it floats centred over the app (same as
before); on a phone or tablet it fills the whole screen edge to edge, same
decoration. Email/password sign-in, sign-up, password reset and **Continue
with Google** all live there.

**Google sign-in needs one thing from you**: in the Supabase dashboard, open
**Authentication → Providers → Google** and enable it (you'll need a Google
OAuth client ID/secret — Supabase's own docs walk through creating one in two
minutes). Until that's on, the Google button will show a clear error instead
of silently failing; email/password sign-in works either way.

### Sticky notes, floating over the whole app

There's now a small round button in the bottom-right corner, on every screen,
in every module — it adds a sticky note. Notes can be dragged anywhere across
the full width of the app and stay right where you left them no matter which
section you switch to; each one can be edited in place or deleted with the ×
in its corner. Like everything else, creating one requires an account —
dragging or deleting a note you already made doesn't.

**One extra step for sticky notes to back up to the cloud**: they're a new
table (`sticky_notes`) that didn't exist in the schema you already applied.
Re-run `supabase/schema.sql` in the Supabase SQL editor — it's fully
re-runnable and safe, it will only add what's missing. Until you do, sticky
notes still work perfectly on-device; they just won't back up or sync across
devices yet.

### A new logo, and a redesigned sidebar

The old logo mark (a stroke shaped like an arrow, left over from the "Nexus"
name) is gone — replaced with an abstract four-petal mark that has no letter
in it, used consistently as the in-app logo chip, the browser tab icon, and
the home-screen icon on phones/tablets.

The sidebar itself was redesigned to match the reference look you sent: the
active section is now a bright, lifted chip (white in dark mode, near-black
in light mode) instead of a faint highlight, rows sit a bit further apart,
and the logo now sits in a rounded lime chip at the top.

### Sticky notes, redesigned

The notes themselves went from flat colored squares to a more premium look:
soft gradient backgrounds per color, a subtle glass sheen, a small pin badge,
a glassy delete button that appears on hover, a gentle lift-and-glow on
hover, and a "just now / 2m ago" timestamp in the corner. All the underlying
behavior — drag anywhere, edit in place, delete, persist across sections —
is unchanged.

---

## 4. What the cloud gives you

The app is **local-first**: it works fully offline, and every visitor gets their
own workspace on their own device. Signing in adds a private cloud copy on top.

| Control | Where | What it does |
|---|---|---|
| **Back up now** | Account panel | Pushes this device's workspace to Supabase |
| **Restore from cloud** | Account panel | Replaces this device with the cloud copy |
| **Back up automatically** | Account panel | Pushes a few seconds after you stop typing |
| **Reset this device** | Account panel | Clears everything on this device; the cloud copy is untouched |

Sign in on your phone, hit **Restore from cloud**, and the same workspace is
there. That is the backup/restore path.

The app now starts **completely empty** for every new sign-in — nothing is
preinstalled. The first time you actually sign in or create an account, you'll
see a short welcome screen, then a one-time screen laying out the cloud rules
(your data is private, and cloud storage is capped at 250 MB total, 50 MB per
file — shown live in the Account panel). Your account also shows a **username**
instead of your email everywhere in the UI; set or change it from the Account
panel any time.

### Browsing is free; creating is not

Anyone can open the app and look around every module — the rail, the empty
states, the layout, sticky notes included — with no account at all. The moment
they try to create or upload anything (a note, task, article, course,
document, badge, sticky note, or a file), they're dropped straight into the
sign-in screen instead of getting a blank composer. Once they're signed in,
everything works exactly as before.

### Where files go

Uploading a file requires an account, same as any other creation. Once
signed in, files up to 50 MB go to the private `nexus-media` bucket, up to
250 MB total per account, and the app reads them back through short-lived
signed URLs.

Nothing in the bucket is world-readable. Objects live under your user id, and a
storage policy checks that prefix against `auth.uid()` on every request.

### Light, dark, or match the system

The theme switch sits at the bottom of the module rail on every device — a
small cycling button when the rail is collapsed, a three-way light/dark/system
control when it's expanded, and the same control again in the mobile drawer.
The choice is remembered per device. (The sign-in screen itself is always
light, by design, regardless of this setting — same as the reference look it's
built from.)

---

## 5. Why shipping the key in the bundle is safe

`.env.production` holds the Supabase URL and the **publishable** key. Both are
meant to be public — they are in every client bundle of every Supabase app.
What actually protects the data is row-level security in the database:

```sql
create policy "own rows select" on public.notes
  for select to authenticated using ((select auth.uid()) = user_id);
```

Every one of the eight tables has that policy for select/insert/update/delete,
and `anon` has no policy at all. A stranger with the key and the URL can reach
exactly nothing.

The full schema — tables, enums, indexes, policies, triggers, storage rules — is
in `supabase/schema.sql`. It is re-runnable any time, including now, to pick up
the new `sticky_notes` table (see section 3 above).

---

## 6. Checks that run before a deploy

```powershell
npm run verify     # typecheck + lint + unit tests + browser pass
```

- `tsc -b` — strict, `noUncheckedIndexedAccess` on
- `oxlint src`
- `vitest` — 58 unit and component tests
- `scripts/smoke.mjs` — 83 checks in headless Chromium, in two passes: a
  local-only build for the full CRUD/theme/layout/sticky-notes suite on
  desktop / tablet / phone viewports, and the real cloud-configured build
  (signed out) to verify every "New …" action — sticky notes included —
  redirects to sign-in — both ending on **0 console errors**

Current status: all four green.
