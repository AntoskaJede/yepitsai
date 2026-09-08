import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const EXT = process.argv[2];
const OUT = process.argv[3];
const VIDEO = 'https://www.youtube.com/watch?v=5vwbbLB3Uww';
fs.mkdirSync(OUT, { recursive: true });

const ctx = await chromium.launchPersistentContext(path.join(OUT, 'profile'), {
  channel: 'chromium',
  headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--lang=en-US', '--hide-scrollbars'],
  viewport: { width: 880, height: 800 },
  deviceScaleFactor: 1,
  locale: 'en-US',
});
let sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker', { timeout: 20000 });
const extId = new URL(sw.url()).host;
console.log('extension id', extId);

// 1) YouTube page with injected button
const yt = await ctx.newPage();
yt.on('console', m => { if (/YepIts/.test(m.text())) console.log('page console:', m.text()); });
await yt.goto(VIDEO, { waitUntil: 'domcontentloaded', timeout: 60000 });
// Consent wall (EU): pick the privacy-preserving option.
const reject = yt.locator('button:has-text("Reject all"), tp-yt-paper-button:has-text("Reject all"), [aria-label*="Reject"]').first();
if (await reject.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false)) {
  await reject.click();
  await yt.waitForTimeout(3000);
  console.log('consent rejected');
} else {
  console.log('no consent dialog seen');
}
await yt.waitForLoadState('domcontentloaded');
await yt.waitForSelector('#yepits-btn-container', { state: 'visible', timeout: 60000 }).then(() => console.log('button visible')).catch(() => console.log('button not found'));
// Ads are random and seeking breaks the player in headless mode; for a stable
// store screenshot, cover the player with the video's own poster frame.
await yt.evaluate((id) => {
  const player = document.querySelector('#player, #player-container, ytd-player');
  if (!player) return;
  const v = document.querySelector('video'); if (v) v.pause();
  const r = player.getBoundingClientRect();
  const img = document.createElement('img');
  img.src = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  Object.assign(img.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', objectFit: 'cover', zIndex: 2147483646, background: '#000' });
  document.body.appendChild(img);
}, new URL(VIDEO).searchParams.get('v'));
await yt.waitForTimeout(2500);
console.log('container:', await yt.evaluate(() => { const c = document.getElementById('yepits-btn-container'); if (!c) return 'absent'; const r = c.getBoundingClientRect(); return [c.parentElement?.id, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }));
await yt.mouse.move(4, 4);
await yt.waitForTimeout(600);
await yt.screenshot({ path: path.join(OUT, 'yt.png') });
console.log('yt.png');

// 2) Side panel states
const panel = await ctx.newPage();
await panel.setViewportSize({ width: 400, height: 800 });
await panel.goto(`chrome-extension://${extId}/sidepanel.html`);
await panel.waitForTimeout(1500);
await panel.evaluate((url) => { currentVideoUrl = url; document.getElementById('emptyState').style.display = 'none'; summarizeBtn.style.display = ''; updateVideoInfo(); }, VIDEO);
await panel.waitForTimeout(2000);
await panel.screenshot({ path: path.join(OUT, 'panel-ready.png') });
await panel.evaluate(() => {
  summarizeBtn.style.display = 'none'; loadingState.style.display = '';
  document.querySelectorAll('.progress-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step1').classList.add('active'); document.getElementById('step2').classList.add('active');
});
await panel.waitForTimeout(400);
await panel.screenshot({ path: path.join(OUT, 'panel-loading.png') });
await panel.evaluate(() => { loadingState.style.display = 'none'; summarizeBtn.style.display = ''; });
await panel.evaluate(() => summarizeCurrentVideo());
await panel.waitForSelector('#resultState', { state: 'visible', timeout: 90000 });
await panel.waitForTimeout(800);
await panel.screenshot({ path: path.join(OUT, 'panel-result.png') });
await panel.evaluate(() => window.scrollTo(0, 700));
await panel.waitForTimeout(400);
await panel.screenshot({ path: path.join(OUT, 'panel-result-scrolled.png') });
await panel.evaluate(() => { window.scrollTo(0, 0); resultState.style.display = 'none'; limitState.style.display = ''; document.getElementById('limitSignin').style.display = ''; applyUsage({ remaining: 0, limit: 3 }); });
await panel.waitForTimeout(300);
await panel.screenshot({ path: path.join(OUT, 'panel-limit.png') });
await panel.evaluate(() => { limitState.style.display = 'none'; showAuthView(); });
await panel.waitForTimeout(300);
await panel.screenshot({ path: path.join(OUT, 'panel-auth.png') });
console.log('panel shots done');
await ctx.close();
