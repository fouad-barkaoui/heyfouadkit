// Drives the production build in a real browser at phone, tablet and desktop
// widths. Run with `npm run smoke` (builds first). Exits non-zero on failure.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 4179;
const BASE = `http://localhost:${PORT}`;
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 800 },
  { name: 'tablet', width: 820, height: 1100 },
  { name: 'desktop', width: 1440, height: 900 },
];
const PAGES = ['home', 'todo', 'calendar', 'habits', 'saveit', 'notebook', 'articles', 'courses', 'docs', 'vault', 'team', 'medications', 'salary', 'reporting', 'analytics', 'trash', 'news', 'contact', 'settings'];

const failures = [];
const check = (ok, label) => {
  if (!ok) failures.push(label);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
};

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', shell: true });
await new Promise((r) => setTimeout(r, 2500));

// PW_CHANNEL=chrome uses an installed Chrome instead of Playwright's download.
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await context.addInitScript(() => localStorage.setItem('kanz.cookieConsent.v1', 'accepted'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/net::|Failed to load resource/.test(m.text())) errors.push(m.text());
    });
    const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

    for (const id of PAGES) {
      await page.goto(`${BASE}/#/${id}`);
      await page.waitForSelector('.topbar');
      await page.waitForTimeout(350);
      check(await fits(), `${vp.name}: ${id} fits the screen`);
    }

    // Navigation: section pills on desktop, the menu everywhere else.
    await page.goto(`${BASE}/`);
    if (vp.width >= 1100) {
      await page.click('.tb-nav .tb-navlink:nth-of-type(2)');
      await page.click('.tb-menu .tb-item:first-child');
    } else {
      await page.click('.tb-more');
      await page.click('.tb-menu-sections .tb-item:nth-child(2)');
    }
    await page.waitForTimeout(300);
    check(page.url().endsWith('#/todo'), `${vp.name}: navigation opens Tasks`);

    // Search opens from the bar.
    await page.click('.tb-searchpill');
    check(await page.locator('[role="dialog"] input').first().isVisible(), `${vp.name}: search opens`);
    await page.keyboard.press('Escape');

    // Home: a FAQ answer opens and closes.
    await page.goto(`${BASE}/`);
    const firstQuestion = page.locator('.home-faq-item button').first();
    await firstQuestion.scrollIntoViewIfNeeded();
    await firstQuestion.click();
    check((await firstQuestion.getAttribute('aria-expanded')) === 'true', `${vp.name}: FAQ answer opens`);

    // Settings: every tab renders, language switch flips direction.
    await page.goto(`${BASE}/#/settings`);
    for (const tab of ['workspace', 'security', 'notifications', 'general']) {
      await page.click(`#set-tab-${tab}`);
      check((await page.locator('#set-panel .set-card').count()) > 0, `${vp.name}: settings ${tab} tab renders`);
    }
    await page.selectOption('select[aria-label="Language"]', 'ar');
    check((await page.evaluate(() => document.documentElement.dir)) === 'rtl', `${vp.name}: Arabic switches to right-to-left`);
    check(await fits(), `${vp.name}: right-to-left layout fits the screen`);

    check(errors.length === 0, `${vp.name}: no console errors${errors.length ? ` (${errors[0]})` : ''}`);
    await context.close();
  }
} finally {
  await browser.close();
  server.kill();
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed');
