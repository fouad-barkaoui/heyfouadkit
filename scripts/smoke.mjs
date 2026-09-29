/**
 * End-to-end smoke pass against the production build.
 * Boots `vite preview`, drives real CRUD flows in Chromium on a desktop and a
 * mobile viewport, and fails on any console or page error.
 *
 * Runs in two passes because creating anything now requires an account:
 *   1. A local-only build (no cloud project) — the auth gate is a no-op here,
 *      so this is where the full CRUD/theme/layout suite runs, unchanged.
 *   2. The real cloud-configured build, signed out — verifies browsing is
 *      free but every "New …" trigger redirects to sign-in instead of
 *      creating anything, without needing real network access to Supabase.
 *
 *   node scripts/smoke.mjs
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const CHROME_CANDIDATES = [
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
];
const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));
const launchOpts = executablePath
  ? { executablePath, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }
  : {};

// Google Fonts is unreachable from this sandbox; the font stack falls back cleanly.
const ignorable = (text) =>
  /favicon|ERR_INTERNET_DISCONNECTED|ERR_TUNNEL_CONNECTION_FAILED|fonts\.googleapis|fonts\.gstatic|Download the React DevTools/i.test(
    text,
  );

/* Fixtures for the attachment flow — a real 1x1 PNG and a text file. */
const FIXTURES = join(tmpdir(), 'heyfouad-smoke');
mkdirSync(FIXTURES, { recursive: true });
const PNG_PATH = join(FIXTURES, 'diagram.png');
const TXT_PATH = join(FIXTURES, 'notes.txt');
writeFileSync(
  PNG_PATH,
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
);
writeFileSync(TXT_PATH, 'ingest pipeline notes\nmultiline codec at the filebeat layer\n');

const BASE = 'http://127.0.0.1:4173';
const checks = [];
const problems = [];

function check(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  process.stdout.write(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}\n`);
  if (!ok) problems.push(name);
}

async function waitForServer(url, timeoutMs = 40000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

/* Every fresh browser profile sees the "We keep your data on this device"
 * cookie-consent modal once, before anything else is clickable (it blocks
 * outside interaction by design). Accepting matches how a real visitor who
 * intends to use the app would proceed, and lets storage-dependent checks
 * (persistence across reload, etc.) behave the way they would for them. */
async function dismissCookieConsent(pg) {
  const accept = pg.getByRole('button', { name: 'Accept and Continue', exact: true });
  await accept.click({ timeout: 5000 }).catch(() => {});
  // The sheet confirms with a checkmark before it closes.
  await pg.locator('.consent-card').waitFor({ state: 'detached', timeout: 4000 }).catch(() => {});
}


/* The rail groups modules into collapsible families (Plan, Library, …).
 * Click a module by name, opening its family first when it's folded away. */
async function nav(pg, label) {
  const rail = pg.locator('nav[aria-label="Modules"]').first();
  const direct = rail.getByRole('button', { name: label, exact: true });
  if ((await direct.count()) && (await direct.first().isVisible())) return direct.first().click();
  const gid = await pg.evaluate(
    (l) =>
      [...document.querySelectorAll('[data-nav-group]')].find((e) => (e.dataset.contains || '').split('|').includes(l))
        ?.dataset.navGroup,
    label,
  );
  if (gid) {
    await rail.locator(`[data-nav-group="${gid}"]`).click();
    await pg.waitForTimeout(250);
  }
  return direct.first().click();
}

/* Build local-only (no cloud project) so the auth gate is a no-op for the
 * full CRUD/theme/layout suite below — exactly how this suite always ran. */
console.log('Building local-only bundle (no cloud project) for the main smoke pass…');
execFileSync('npx', ['vite', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
});

// Spawn the local `vite` binary directly (not through `npx`) so killing this
// process actually kills the server — `npx` can leave the real server as an
// orphaned grandchild that keeps the port bound across crashed runs.
const VITE_BIN = join('node_modules', '.bin', 'vite');
const preview = spawn(
  VITE_BIN,
  ['preview', '--port', '4173', '--host', '127.0.0.1', '--strictPort'],
  { stdio: 'ignore' },
);

process.on('exit', () => preview.kill());

if (!(await waitForServer(BASE))) {
  console.error('preview server did not start');
  preview.kill();
  process.exit(1);
}

const browser = await chromium.launch(launchOpts);

const consoleErrors = [];
async function newPage(context) {
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const where = msg.location()?.url;
      consoleErrors.push(where && /Failed to load resource/.test(msg.text()) ? `${msg.text()} (${where})` : msg.text());
    }
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
  return page;
}

/* ── Desktop pass ────────────────────────────────────────────────────────── */
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await newPage(desktop);

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('nav[aria-label="Modules"]', { timeout: 15000 });
check('shell renders with module rail', true);
await dismissCookieConsent(page);

/* Default landing is Home; check the empty state on the module that actually
 * shows one. Fresh workspace: nothing is preinstalled, so this must start empty. */
await nav(page, 'Notebook');
await page.waitForTimeout(500);
check(
  'starts empty: no preinstalled demo data',
  await page.locator('text=The notebook is empty.').first().isVisible().catch(() => false),
);
check(
  'search bar: no macOS-only ⌘K hint shown',
  (await page.locator('kbd', { hasText: '⌘K' }).count()) === 0,
);

const MODULES = [
  ['Notebook', 'Notebook'],
  ['Tasks', 'Tasks'],
  ['Articles & Media', 'Articles & Media'],
  ['Course Hub', 'Course Hub'],
  ['Docs Storage', 'Docs Storage'],
  ['Analytics', 'Analytics'],
  ['Vault', 'Vault'],
];

for (const [navLabel, heading] of MODULES) {
  await nav(page, navLabel);
  await page.waitForTimeout(700);
  const visible = await page
    .locator('h1, h2')
    .filter({ hasText: heading })
    .first()
    .isVisible()
    .catch(() => false);
  check(`module opens: ${navLabel}`, visible);
}

/* WebGL field actually mounted */
await nav(page, 'Notebook');
await page.waitForTimeout(800);
check('webgl canvas is present', (await page.locator('canvas').count()) > 0);

/* — Theme toggle: light / dark / system, in both rail states — */
const readTheme = () => page.evaluate(() => document.documentElement.dataset.theme ?? 'system');
const readBgAvg = () =>
  page.evaluate(() => {
    const m = getComputedStyle(document.body).backgroundColor.match(/\d+/g) ?? ['0', '0', '0'];
    return (Number(m[0]) + Number(m[1]) + Number(m[2])) / 3;
  });

/* The rail starts expanded at this width — that's the 3-way segmented group. */
check('theme: expanded rail shows the segmented light/dark/system control', await page.getByRole('group', { name: 'Theme' }).isVisible());

await page.getByRole('button', { name: 'Collapse navigation' }).click();
await page.waitForTimeout(300);
const themeButton = page.locator('button[aria-label^="Theme:"]').first();
check('theme: collapsed rail shows the cycling toggle button', await themeButton.isVisible());

const beforeClick = await readTheme();
await themeButton.click();
// The theme wipes in with a view transition, so give it a moment to commit.
await page.waitForFunction((b) => document.documentElement.dataset.theme !== b, beforeClick, { timeout: 2000 }).catch(() => {});
check('theme: clicking the toggle changes the theme', (await readTheme()) !== beforeClick);

for (let i = 0; i < 3 && (await readTheme()) !== 'light'; i++) {
  await themeButton.click();
  await page.waitForTimeout(900);
}
check('theme: can cycle to light mode', (await readTheme()) === 'light');
check('theme: light mode actually repaints the page background', (await readBgAvg()) > 200, `avg ${await readBgAvg()}`);

for (let i = 0; i < 3 && (await readTheme()) !== 'dark'; i++) {
  await themeButton.click();
  await page.waitForTimeout(900);
}
check('theme: can cycle back to dark mode', (await readTheme()) === 'dark');
check('theme: dark mode repaints the page background back', (await readBgAvg()) < 40, `avg ${await readBgAvg()}`);

await page.getByRole('button', { name: 'Expand navigation' }).click();
await page.waitForTimeout(300);

/* — Notebook CRUD — */
await page.getByRole('button', { name: 'New note', exact: true }).first().click();
await page.waitForTimeout(400);
const titleField = page.getByLabel('Note title');
await titleField.fill('Smoke test note');
await page.waitForTimeout(500);
check(
  'notebook: new note appears in the panel once titled',
  await page.locator('text=Smoke test note').first().isVisible(),
);

await page.getByLabel('Add tag').first().fill('smoke');
await page.getByLabel('Add tag').first().press('Enter');
await page.waitForTimeout(300);
check('notebook: tag added', await page.locator('text=#smoke').first().isVisible());

/* star it — this is what the vault check below relies on finding.
 * Scoped to the content header: the panel row has its own same-labelled
 * button that only reveals on hover, which would otherwise win the match. */
await page.locator('header').getByRole('button', { name: 'Add to vault' }).click();
await page.waitForTimeout(300);
check(
  'notebook: starred into the vault',
  await page.locator('header').getByRole('button', { name: 'Remove from vault' }).isVisible(),
);

/* draft safety: an untouched new note must not persist */
const notesBefore = await page.locator('[data-stagger]').count();
await page.getByRole('button', { name: 'New note', exact: true }).first().click();
await page.waitForTimeout(300);
await nav(page, 'Notebook');
await page.waitForTimeout(600);
const notesAfter = await page.locator('[data-stagger]').count();
check('notebook: empty draft is not persisted', notesAfter <= notesBefore, `${notesBefore} → ${notesAfter}`);

/* — Tasks CRUD + views — */
await nav(page, 'Tasks');
await page.waitForTimeout(700);
await page.getByRole('button', { name: 'New task', exact: true }).first().click();
await page.waitForTimeout(400);
await page.getByLabel('Title').fill('Smoke test task');
await page.getByRole('button', { name: 'Create task' }).click();
await page.waitForTimeout(600);
check('tasks: created', await page.locator('text=Smoke test task').first().isVisible());

/* validation guard: a blank task is refused */
await page.getByRole('button', { name: 'New task', exact: true }).first().click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Create task' }).click();
await page.waitForTimeout(300);
check('tasks: blank title rejected', await page.locator('text=A title is required.').isVisible());
await page.getByRole('button', { name: 'Cancel' }).click();
await page.waitForTimeout(300);

for (const view of ['Board', 'Matrix', 'Timeline', 'List']) {
  await page.getByRole('button', { name: view, exact: true }).click();
  await page.waitForTimeout(600);
  check(`tasks: ${view} view renders`, await page.locator('main').isVisible());
}

/* completing a task moves the counter */
await page.locator('[role="checkbox"]').first().click();
await page.waitForTimeout(600);
check('tasks: checkbox toggles without error', true);

/* — Courses: badge creator — */
await nav(page, 'Course Hub');
await page.waitForTimeout(700);
await page.getByRole('button', { name: 'Badge', exact: true }).click();
await page.waitForTimeout(400);
await page.getByLabel('Name').fill('Smoke badge');
await page.getByRole('button', { name: 'Create badge' }).click();
await page.waitForTimeout(600);
check('courses: badge created', await page.locator('text=Smoke badge').first().isVisible());

await page.getByRole('button', { name: 'New course', exact: true }).first().click();
await page.waitForTimeout(400);
await page.getByLabel('Title').fill('Smoke course');
await page.getByLabel('Link').fill('not-a-url');
await page.getByRole('button', { name: 'Add course' }).click();
await page.waitForTimeout(300);
check(
  'courses: invalid url rejected',
  await page.locator('text=does not look like an http(s) URL').isVisible(),
);
await page.getByLabel('Link').fill('https://example.com');
await page.getByRole('button', { name: 'Add course' }).click();
await page.waitForTimeout(600);
check('courses: created', await page.locator('text=Smoke course').first().isVisible());

/* — Docs: folder tree + table — */
await nav(page, 'Docs Storage');
await page.waitForTimeout(700);

/* the workspace starts empty, so a document has to exist before the table does */
await page.getByRole('button', { name: 'New document', exact: true }).first().click();
await page.waitForTimeout(400);
await page.getByLabel('Document title').fill('Smoke doc');
await page.waitForTimeout(500);
check('docs: created', await page.locator('text=Smoke doc').first().isVisible());
await page.getByRole('button', { name: 'Save', exact: true }).click();
await page.waitForTimeout(500);

check('docs: folder cards render', await page.locator('text=Folders').first().isVisible());
check('docs: file table renders', (await page.locator('table').count()) > 0);
await page.getByRole('button', { name: /^badges$/i }).click();
await page.waitForTimeout(400);
check(
  'docs: badge namespace is isolated from courses',
  !(await page.locator('aside').locator('text=Smoke badge').isVisible().catch(() => false)),
);

/* — Vault — */
await nav(page, 'Vault');
await page.waitForTimeout(700);
check('vault: curated cards render', (await page.locator('article').count()) > 0);

/* — Command palette — */
await page.keyboard.press('Control+k');
await page.waitForTimeout(400);
const palette = page.getByPlaceholder('Search notes, tasks, articles, courses, docs…');
check('search: palette opens on ⌘K', await palette.isVisible());
await palette.fill('smoke');
await page.waitForTimeout(500);
check('search: finds records across modules', (await page.locator('[data-index]').count()) > 0);
await page.keyboard.press('Enter');
await page.waitForTimeout(700);
check('search: enter navigates to the record', await page.locator('main').isVisible());

/* — Attachments: upload while composing, then preview — */
await nav(page, 'Notebook');
await page.waitForTimeout(800);
await page.locator('text=Smoke test note').first().click();
await page.waitForTimeout(500);
check('attachments: panel is present in the composer', await page.locator('text=Drop files here, or browse').isVisible());

await page.locator('input[type="file"][multiple]').first().setInputFiles([PNG_PATH, TXT_PATH]);
await page.waitForTimeout(900);
check('attachments: both files attached', (await page.locator('figure button[aria-label^="Preview"]').count()) >= 2);
check('attachments: image thumbnail rendered', (await page.locator('figure img').count()) >= 1);

await page.locator('button[aria-label="Preview diagram.png"]').first().click();
await page.waitForTimeout(700);
check('attachments: image preview opens', await page.locator('[role="dialog"] img').first().isVisible());
await page.getByRole('button', { name: 'Close' }).first().click();
await page.waitForTimeout(400);

await page.locator('button[aria-label="Preview notes.txt"]').first().click();
await page.waitForTimeout(900);
check(
  'attachments: text file previews inline',
  await page.locator('[role="dialog"] pre').first().isVisible().catch(() => false),
);
await page.getByRole('button', { name: 'Close' }).first().click();
await page.waitForTimeout(400);

/* — Account & backup panel: this pass has no cloud project at all — */
await page.getByRole('button', { name: 'Account' }).first().click();
await page.waitForTimeout(600);
check(
  'account: unconfigured build says so instead of showing sign-in fields',
  await page.locator('text=This build has no cloud project configured').isVisible(),
);
await page.getByRole('button', { name: 'Close' }).first().click();
await page.waitForTimeout(400);

/* — Analytics charts — */
await nav(page, 'Analytics');
await page.waitForTimeout(900);
check('analytics: charts render', (await page.locator('figure').count()) >= 4);
await page.getByRole('button', { name: 'Table' }).first().click();
await page.waitForTimeout(400);
check('analytics: table view available for a11y', (await page.locator('figure table').count()) > 0);

await page.screenshot({ path: 'screenshots/desktop-analytics.png' });
await nav(page, 'Notebook');
await page.waitForTimeout(900);
await page.screenshot({ path: 'screenshots/desktop-notebook.png' });
await nav(page, 'Docs Storage');
await page.waitForTimeout(900);
await page.screenshot({ path: 'screenshots/desktop-docs.png' });
await nav(page, 'Tasks');
await page.waitForTimeout(500);
await page.getByRole('button', { name: 'Board', exact: true }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: 'screenshots/desktop-board.png' });

/* — Profile picture: pick → crop → save, then it shows on the account row — */
await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
await page.waitForTimeout(500);
await page.locator('input[type=file][accept^="image"]').first().setInputFiles(PNG_PATH);
await page.waitForTimeout(500);
check('avatar: cropper opens for a picked image', await page.locator('.avatar-crop-frame').isVisible());
await page.getByRole('button', { name: 'Save picture' }).click();
await page.waitForTimeout(900);
check('avatar: saved on this device', await page.locator('text=Picture saved on this device.').isVisible());
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
check(
  'avatar: account row shows the picture',
  (await page.locator('nav[aria-label="Modules"] .avatar img').count()) > 0,
);

/* — SaveIt: save a link, see its card, open its preview — */
await nav(page, 'SaveIt');
await page.waitForTimeout(700);
check('saveit: empty state invites a first link', await page.locator('text=Your internet, kept.').isVisible());
await page.getByLabel('Link to save').fill('https://www.youtube.com/watch?v=aircAruvnKk');
await page.getByRole('button', { name: 'Save', exact: true }).click();
await page.waitForTimeout(900);
check('saveit: link saved as a card', (await page.locator('[data-link-id]').count()) === 1);
check('saveit: YouTube detected as a video', await page.locator('.save-card .save-kind', { hasText: 'Video' }).isVisible());
await page.getByLabel('Link to save').fill('github.com/mrdoob/three.js');
await page.keyboard.press('Enter');
await page.waitForTimeout(900);
check('saveit: bare domains are accepted', (await page.locator('[data-link-id]').count()) === 2);
await page.getByLabel('Link to save').fill('https://github.com/mrdoob/three.js');
await page.keyboard.press('Enter');
await page.waitForTimeout(700);
check('saveit: duplicates are not saved twice', (await page.locator('[data-link-id]').count()) === 2);
await page.locator('.save-card-inner').first().click();
await page.waitForTimeout(700);
check('saveit: preview opens with notes and tags', await page.getByLabel('Your note').isVisible());
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.getByRole('radio', { name: 'Constellation' }).click();
await page.waitForTimeout(1800);
check('saveit: constellation renders a 3D canvas', (await page.locator('.save-space canvas').count()) === 1);
await page.getByRole('radio', { name: 'Grid' }).click();
await page.waitForTimeout(300);

/* — Rail: modules are grouped into a few families, not one tall list — */
{
  const heads = await page.locator('nav[aria-label="Modules"] [data-nav-group]').count();
  check('rail: modules grouped into families', heads === 4, `${heads} groups`);
  const open = await page.locator('nav[aria-label="Modules"] [data-nav-group][aria-expanded="true"]').count();
  check('rail: only one family open at a time', open <= 1, `${open} open`);
}

/* — Habits & Goals: habit, check-in, streak grid, goal steps → Tasks — */
await nav(page, 'Habits & Goals');
await page.waitForTimeout(800);
check('habits: empty state shows', await page.locator('text=Small things, every day.').isVisible());
await page.getByRole('button', { name: 'New habit' }).first().click();
await page.waitForTimeout(300);
await page.getByLabel('Habit', { exact: true }).fill('Smoke habit');
await page.getByRole('button', { name: 'Create habit', exact: true }).click();
await page.waitForTimeout(700);
check('habits: habit card appears', await page.locator('.hb-card', { hasText: 'Smoke habit' }).isVisible());
await page.getByRole('button', { name: 'Mark Smoke habit done today' }).click();
await page.waitForTimeout(500);
check(
  'habits: checking in marks today done',
  (await page.getByRole('button', { name: 'Undo Smoke habit today' }).getAttribute('aria-pressed')) === 'true',
);
check('habits: yearly grid records the check-in', (await page.locator('.hb-year .hb-cell[data-l="4"]').count()) >= 1);
await page.getByRole('tab', { name: 'Goals' }).click();
await page.waitForTimeout(500);
check('goals: empty state shows', await page.locator('text=Big goals, small steps.').isVisible());
await page.getByRole('button', { name: 'New goal' }).first().click();
await page.waitForTimeout(300);
await page.getByLabel('Goal', { exact: true }).fill('Smoke goal');
await page.locator('#gl-steps').fill('First smoke step\nSecond smoke step');
await page.getByRole('button', { name: 'Create goal', exact: true }).click();
await page.waitForTimeout(700);
check('goals: goal with its steps appears', await page.locator('.gl-card', { hasText: 'Second smoke step' }).isVisible());
await page.getByRole('button', { name: 'Send 2 steps to Tasks' }).click();
await page.waitForTimeout(600);
check('goals: steps are linked to Tasks', (await page.locator('.gl-chip.is-linked').count()) === 2);
await nav(page, 'Tasks');
await page.waitForTimeout(800);
check('goals: steps show up in Tasks', await page.locator('text=First smoke step').first().isVisible());

/* — Offline: the service worker caches the app so it opens with no network — */
{
  const swReady = await page
    .evaluate(() =>
      Promise.race([
        navigator.serviceWorker.ready.then(() => true),
        new Promise((r) => setTimeout(() => r(false), 12000)),
      ]),
    )
    .catch(() => false);
  check('offline: service worker is installed', swReady === true);
  await page.waitForTimeout(1500);
  const cached = await page.evaluate(async () => {
    let n = 0;
    for (const k of await caches.keys()) n += (await (await caches.open(k)).keys()).length;
    return n;
  });
  check('offline: app shell is cached', cached > 20, `${cached} files`);
  await desktop.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('nav[aria-label="Modules"]', { timeout: 15000 }).catch(() => {});
  check('offline: app opens with no network', await page.locator('nav[aria-label="Modules"]').first().isVisible());
  check('offline: status pill says so', await page.locator('.offline-pill', { hasText: 'Offline' }).isVisible());
  await nav(page, 'Habits & Goals');
  await page.waitForTimeout(700);
  check('offline: local data is still there', await page.locator('.hb-card', { hasText: 'Smoke habit' }).isVisible());
  await desktop.setOffline(false);
  await page.waitForTimeout(400);
}

/* — Persistence across reload — */
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await nav(page, 'Notebook');
await page.waitForTimeout(800);
check('persistence: records survive a reload', await page.locator('text=Smoke test note').first().isVisible());
check('theme: preference persists across reload', (await readTheme()) === 'dark');
check('avatar: picture persists across reload', (await page.locator('nav[aria-label="Modules"] .avatar img').count()) > 0);

/* — Installable: the manifest and icons actually resolve — */
const manifestOk = await page.evaluate(async () => {
  const link = document.querySelector('link[rel="manifest"]');
  if (!link) return false;
  const res = await fetch(link.getAttribute('href'));
  if (!res.ok) return false;
  const manifest = await res.json();
  const icon = await fetch(manifest.icons?.[0]?.src ?? '/nope.png');
  return icon.ok && manifest.name?.length > 0;
});
check('pwa: manifest and icons resolve', manifestOk);

/* — Collapsed rail keeps every destination on a short (125% zoom) screen — */
{
  const zctx = await browser.newContext({ viewport: { width: 1536, height: 760 } });
  const zpage = await newPage(zctx);
  await zpage.goto(BASE, { waitUntil: 'networkidle' });
  await zpage.waitForTimeout(900);
  await dismissCookieConsent(zpage);
  await zpage.getByRole('button', { name: 'Collapse navigation' }).click();
  await zpage.waitForTimeout(500);
  const fit = await zpage.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Modules"]');
    const sc = nav?.querySelector('.rail-scroll');
    const last = [...(nav?.querySelectorAll('button') ?? [])].find((b) => b.getAttribute('aria-label') === 'Insight');
    const r = last?.getBoundingClientRect();
    return { overflow: sc ? sc.scrollHeight - sc.clientHeight : -1, lastVisible: !!r && r.bottom <= window.innerHeight && r.height > 0 };
  });
  check('rail: collapsed rail fits every destination without scrolling', fit.overflow <= 1 && fit.lastVisible, JSON.stringify(fit));
  check('rail: no library logo block at the top', (await zpage.locator('.rail-head, .brand-mark').count()) === 0);
  check('sticky notes: feature removed', (await zpage.locator('[aria-label*="sticky" i]').count()) === 0);
  await zctx.close();
}

/* — Reading-progress pill appears on a long note and its index jumps — */
{
  const sctx = await browser.newContext({ viewport: { width: 1440, height: 800 } });
  const spage = await newPage(sctx);
  await spage.goto(BASE, { waitUntil: 'networkidle' });
  await spage.waitForTimeout(900);
  await dismissCookieConsent(spage);
  await nav(spage, 'Notebook');
  await spage.waitForTimeout(500);
  await spage.getByRole('button', { name: 'New note', exact: true }).first().click();
  await spage.waitForTimeout(400);
  await spage.getByLabel('Note title').fill('Long read');
  await spage.waitForTimeout(200);
  await spage.locator('.tiptap').first().click();
  const para = 'Interaction design is the craft of defining how people engage with an interface, considering behaviour, feedback and outcomes. ';
  for (const h of ['Alpha section', 'Beta section', 'Gamma section']) {
    await spage.keyboard.type('## ' + h);
    await spage.keyboard.press('Enter');
    for (let i = 0; i < 4; i++) {
      await spage.keyboard.insertText(para + para);
      await spage.keyboard.press('Enter');
    }
  }
  await spage.waitForTimeout(600);
  await spage.evaluate(() => {
    const el = [...document.querySelectorAll('main .scroll-y')].find((e) => e.scrollHeight > e.clientHeight + 64);
    if (el) el.scrollTop = 0.3 * (el.scrollHeight - el.clientHeight);
  });
  await spage.waitForTimeout(700);
  await spage.screenshot({ path: 'screenshots/scroll-pill.png' });
  check('scroll pill: appears after scrolling', await spage.locator('.scroll-index[data-visible="true"]').first().isVisible().catch(() => false));
  const pctText = await spage.locator('.scroll-index-pct').first().textContent().catch(() => '');
  check('scroll pill: shows a live percentage', /^\d{1,3}%$/.test((pctText ?? '').trim()), pctText ?? '');
  await spage.getByRole('button', { name: 'Page index' }).first().click();
  await spage.waitForTimeout(400);
  check('scroll pill: index lists the headings', (await spage.getByRole('menuitem', { name: /Gamma section/ }).count()) === 1);
  await spage.getByRole('menuitem', { name: /Gamma section/ }).click();
  await spage.waitForTimeout(1300);
  check('scroll pill: index jumps to the section', ((await spage.locator('.scroll-index-current').first().textContent().catch(() => '')) ?? '').includes('Gamma'));
  await sctx.close();
}

/* — No horizontal overflow on desktop — */
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
check('layout: no horizontal page overflow (desktop)', !overflow);

await desktop.close();

/* ── Tablet pass ─────────────────────────────────────────────────────────── */
const tablet = await browser.newContext({
  viewport: { width: 834, height: 1112 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const tpage = await newPage(tablet);
await tpage.goto(BASE, { waitUntil: 'networkidle' });
await tpage.waitForTimeout(1300);
await dismissCookieConsent(tpage);
check('tablet: three-pane shell fits', await tpage.locator('nav[aria-label="Modules"]').first().isVisible());
/* collapsed rail on a tablet: the document modules live in the "Library" flyout */
await tpage.getByRole('button', { name: 'Library', exact: true }).click();
await tpage.waitForTimeout(400);
check('tablet: library flyout lists its modules', await tpage.getByRole('menuitem', { name: 'Docs Storage' }).isVisible());
await tpage.getByRole('menuitem', { name: 'Docs Storage' }).click();
await tpage.waitForTimeout(900);

/* this context has its own empty workspace — a document has to exist for the table to appear */
await tpage.getByRole('button', { name: 'New document', exact: true }).first().click();
await tpage.waitForTimeout(400);
await tpage.getByLabel('Document title').fill('Tablet smoke doc');
await tpage.waitForTimeout(500);
await tpage.getByRole('button', { name: 'Save', exact: true }).click();
await tpage.waitForTimeout(500);
check('tablet: content pane renders', await tpage.locator('table').first().isVisible());
const tOverflow = await tpage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
check('layout: no horizontal page overflow (tablet)', !tOverflow);
await tpage.screenshot({ path: 'screenshots/tablet-docs.png' });
await tablet.close();

/* ── Mobile pass ─────────────────────────────────────────────────────────── */
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const mpage = await newPage(mobile);
await mpage.goto(BASE, { waitUntil: 'networkidle' });
await mpage.waitForTimeout(1200);
await dismissCookieConsent(mpage);

check('mobile: rail is hidden', !(await mpage.locator('nav[aria-label="Modules"]').first().isVisible()));
await mpage.getByRole('button', { name: 'Open navigation' }).first().click();
await mpage.waitForTimeout(600);
const drawer = mpage.locator('[role="dialog"] nav[aria-label="Modules"]');
check('mobile: drawer opens', await drawer.isVisible());
await drawer.getByRole('button', { name: 'Course Hub', exact: true }).click();
await mpage.waitForTimeout(900);
check('mobile: drawer closes after navigating', !(await drawer.isVisible().catch(() => false)));
check(
  'mobile: hamburger reports its expanded state',
  (await mpage.getByRole('button', { name: 'Open navigation' }).first().getAttribute('aria-expanded')) === 'false',
);
check(
  'mobile: navigated to the chosen module',
  await mpage.getByRole('heading', { name: 'Course Hub' }).first().isVisible(),
);

await mpage.getByRole('button', { name: 'Open navigation' }).first().click();
await mpage.waitForTimeout(500);
check(
  'mobile: account is reachable from the drawer',
  await mpage.getByRole('button', { name: 'Account' }).first().isVisible(),
);
check(
  'mobile: theme switcher is reachable from the drawer',
  await mpage.getByRole('group', { name: 'Theme' }).isVisible(),
);
await mpage.keyboard.press('Escape');
await mpage.waitForTimeout(400);

/* — Phones: a dialog's Create/Save button must be on screen, even short — */
{
  for (const [w, h] of [[390, 664], [375, 420]]) {
    await mpage.setViewportSize({ width: w, height: h });
    await mpage.goto(`${BASE}/#/habits`, { waitUntil: 'domcontentloaded' });
    await mpage.waitForTimeout(900);
    await mpage.getByRole('button', { name: 'New habit' }).first().click();
    await mpage.waitForTimeout(500);
    const box = await mpage.getByRole('button', { name: 'Create habit', exact: true }).boundingBox();
    check(`mobile: dialog Create button is on screen (${w}x${h})`, !!box && box.y >= 0 && box.y + box.height <= h, JSON.stringify(box));
    await mpage.keyboard.press('Escape');
    await mpage.waitForTimeout(300);
  }
  await mpage.setViewportSize({ width: 390, height: 844 });
  await mpage.goto(`${BASE}/#/notebook`, { waitUntil: 'domcontentloaded' });
  await mpage.waitForTimeout(800);
  await mpage.getByRole('button', { name: 'New note' }).first().click();
  await mpage.waitForTimeout(500);
  check('mobile: editors show a Save button', await mpage.getByRole('button', { name: 'Save', exact: true }).isVisible());
  await mpage.goto(`${BASE}/#/home`, { waitUntil: 'domcontentloaded' });
  await mpage.waitForTimeout(600);
}

const mOverflow = await mpage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
check('layout: no horizontal page overflow (mobile)', !mOverflow);
await mpage.screenshot({ path: 'screenshots/mobile-courses.png' });

await mobile.close();
await browser.close();
preview.kill();

const realErrors = consoleErrors.filter((e) => !ignorable(e));
check(`console: 0 errors (${realErrors.length} seen)`, realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

/* ── Cloud-configured pass: signed out, nothing can be created ──────────── */
console.log('\nBuilding cloud-configured bundle for the auth-gate pass…');
execFileSync('npx', ['vite', 'build', '--outDir', 'dist-cloud'], { stdio: 'inherit' });

const CLOUD_BASE = 'http://127.0.0.1:4174';
const cloudPreview = spawn(
  VITE_BIN,
  ['preview', '--outDir', 'dist-cloud', '--port', '4174', '--host', '127.0.0.1', '--strictPort'],
  { stdio: 'ignore' },
);
process.on('exit', () => cloudPreview.kill());

if (!(await waitForServer(CLOUD_BASE))) {
  check('auth-gate pass: cloud preview server starts', false);
} else {
  const cloudBrowser = await chromium.launch(launchOpts);
  const cloudErrors = [];
  const cctx = await cloudBrowser.newContext({ viewport: { width: 1440, height: 900 } });
  const cpage = await cctx.newPage();
  cpage.on('console', (msg) => {
    if (msg.type() === 'error') cloudErrors.push(msg.text());
  });
  cpage.on('pageerror', (err) => cloudErrors.push(`pageerror: ${err.message}`));

  await cpage.goto(CLOUD_BASE, { waitUntil: 'networkidle' });
  await cpage.waitForSelector('nav[aria-label="Modules"]', { timeout: 15000 });
  await dismissCookieConsent(cpage);
  await nav(cpage, 'Notebook');
  await cpage.waitForTimeout(500);
  check(
    'auth-gate: signed out, the cloud build still browses freely',
    await cpage.locator('text=The notebook is empty.').first().isVisible().catch(() => false),
  );

  const gated = async (navLabel, triggerName) => {
    if (navLabel) {
      await nav(cpage, navLabel);
      await cpage.waitForTimeout(500);
    }
    await cpage.getByRole('button', { name: triggerName, exact: true }).first().click();
    await cpage.waitForTimeout(500);
    check(`auth-gate: "${triggerName}" redirects to sign-in`, await cpage.getByLabel('Email').isVisible().catch(() => false));
    await cpage.keyboard.press('Escape');
    await cpage.waitForTimeout(300);
  };

  await gated(null, 'New note');
  await gated('Tasks', 'New task');
  await gated('Articles & Media', 'Write an article');
  await gated(null, 'Upload a file');
  await gated('Course Hub', 'New course');
  await gated('Docs Storage', 'New document');

  /* The same panel, opened directly, is a real sign-in/sign-up form here — a
   * cloud project is actually configured in this pass. */
  await cpage.getByRole('button', { name: 'Account' }).first().click();
  await cpage.waitForTimeout(600);
  check('account: panel opens with sign-in fields', await cpage.getByLabel('Email').isVisible());
  check('account: password field present', await cpage.getByLabel('Password', { exact: true }).isVisible());
  await cpage.getByRole('button', { name: 'Create one', exact: true }).first().click();
  await cpage.waitForTimeout(300);
  check('account: can switch to sign-up', await cpage.getByLabel('Password', { exact: true }).isVisible());
  check('account: full name field present on sign-up', await cpage.getByLabel('Full Name').isVisible());
  await cpage.getByRole('button', { name: 'Continue browsing' }).first().click();
  await cpage.waitForTimeout(400);

  const cloudRealErrors = cloudErrors.filter((e) => !ignorable(e));
  check(
    `auth-gate pass: console 0 errors (${cloudRealErrors.length} seen)`,
    cloudRealErrors.length === 0,
    cloudRealErrors.slice(0, 3).join(' | '),
  );

  await cctx.close();
  await cloudBrowser.close();
}
cloudPreview.kill();

/* Leave `dist/` as the real deployable build, not the local-only test build. */
console.log('\nRebuilding dist/ with the real cloud config for deployment…');
execFileSync('npx', ['vite', 'build'], { stdio: 'inherit' });

/* ── Report ──────────────────────────────────────────────────────────────── */
const passed = checks.filter((c) => c.ok).length;
console.log(`\n${passed}/${checks.length} checks passed`);
if (problems.length > 0) {
  console.log(`failed: ${problems.join(', ')}`);
  process.exit(1);
}
