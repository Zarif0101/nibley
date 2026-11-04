// Renders the 3D Nibley turnaround + mood shots to renders/ and exports nibley.glb.
// Dev tool only (not part of the app). Needs Playwright and a local three@0.170.0:
//   npm i --no-save three@0.170.0 && node design/mascot-3d/render.js          (add --loops for the app's mood loops)
// THREE_DIR overrides where three is found. The page's CDN imports are served from that folder.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const HERE = __dirname;
const THREE_DIR = process.env.THREE_DIR || path.join(HERE, '..', '..', 'node_modules', 'three');
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
const OUT = path.join(HERE, 'renders');
const VIEWS = [['full-front', 0], ['3q-right', 45], ['right', 90], ['3q-back-right', 135], ['back', 180], ['3q-back-left', 225], ['left', 270], ['3q-left', 315]];
const MOODS = ['happy', 'listening', 'thinking', 'speaking', 'confused', 'excited', 'error'];

// Mood loops for the app's status pill (QUALITY-PLAN T10): one horizontal WebP strip per mood + loops.json.
const LOOP = { frames: 30, T: 2.5, size: 128 };
async function renderLoops(page) {
  const dir = path.join(HERE, '..', '..', 'src', 'overlay', 'mascot3d');
  fs.mkdirSync(dir, { recursive: true });
  const sizes = {};
  for (const state of MOODS) {
    const url = await page.evaluate(async ({ state, LOOP }) => {
      const frames = window.nibley.loopFrames({ state, ...LOOP });
      const cv = document.createElement('canvas'); cv.width = LOOP.size * frames.length; cv.height = LOOP.size;
      const g = cv.getContext('2d');
      for (const [i, src] of frames.entries()) { const im = new Image(); im.src = src; await im.decode(); g.drawImage(im, i * LOOP.size, 0); }
      return cv.toDataURL('image/webp', 0.86);
    }, { state, LOOP });
    const buf = Buffer.from(url.split(',')[1], 'base64');
    fs.writeFileSync(path.join(dir, `${state}.webp`), buf);
    sizes[state] = buf.length;
  }
  fs.writeFileSync(path.join(dir, 'loops.json'), JSON.stringify({ ...LOOP, moods: MOODS }, null, 2) + '\n');
  console.log(`loops: ${MOODS.map((m) => `${m} ${(sizes[m] / 1024).toFixed(0)} KB`).join(', ')}`);
}

(async () => {
  if (!fs.existsSync(path.join(THREE_DIR, 'build', 'three.module.js'))) throw new Error(`three not found in ${THREE_DIR}`);
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  await page.route(`${CDN}**`, (route) => route.fulfill({
    path: path.join(THREE_DIR, route.request().url().slice(CDN.length)),
    contentType: 'text/javascript',
    headers: { 'Access-Control-Allow-Origin': '*' },
  }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/ERR_FAILED/.test(m.text()) && errors.push(m.text()));
  await page.goto(`file://${path.join(HERE, 'nibley-3d.html')}`);
  await page.waitForFunction(() => window.nibley?.ready, null, { timeout: 120e3 }).catch(() => { throw new Error(`page did not load: ${errors.join(' | ')}`); });

  fs.mkdirSync(OUT, { recursive: true });
  const save = (name, url) => fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
  const size = Number(process.env.SIZE || 512);
  if (process.argv.includes('--loops')) { await renderLoops(page); await browser.close(); return; }
  const quick = !!process.env.QUICK;
  for (const [name, yaw] of quick ? VIEWS.filter(([n]) => ['full-front', '3q-right', 'right', 'back', '3q-left'].includes(n)) : VIEWS) save(`view-${name}`, await page.evaluate((o) => window.nibley.snapshot(o), { yaw, size }));
  if (quick) { await browser.close(); return console.log('quick render done'); }
  for (const state of MOODS) save(`mood-${state}`, await page.evaluate((o) => window.nibley.snapshot(o), { state, size }));
  const glb = await page.evaluate(() => window.nibley.glb());
  fs.writeFileSync(path.join(HERE, 'nibley.glb'), Buffer.from(glb, 'base64'));
  await browser.close();
  console.log(`rendered ${VIEWS.length} views + ${MOODS.length} moods to ${OUT}, nibley.glb ${(glb.length * 0.75 / 1024).toFixed(0)} KB`);
  if (errors.length) { console.log('page errors:', errors); process.exitCode = 1; }
})().catch((e) => { console.error(e.message); process.exit(1); });
