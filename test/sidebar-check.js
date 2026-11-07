// Floating sidebar check (docs/NEXT-ROUND.md phase 2, floating since 2026-11-08), in the real app with the fake platform.
// Each open way 5/5 (edge tab click, Win+Shift+` event, voice, tray click), click-away closes it, Esc closes it, the
// width is saved, settings change from the sidebar, the edge tab stays out of screenshots, idle CPU and RAM.
// Run: npx electron test/sidebar-check.js     Saves test/out/sidebar-open.png
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-side-'));
fs.mkdirSync(path.join(TMP, 'vault', 'nibley'), { recursive: true });
const SET = path.join(TMP, 'settings.json');
fs.writeFileSync(SET, JSON.stringify({ vaultPath: path.join(TMP, 'vault'), mode: 'ask', pendingQuestion: null, ear: false }));
process.env.NIBLEY_FAKE = '1';
process.env.NIBLEY_SETTINGS = SET;

const { app, BrowserWindow } = require('electron');
const main = require('../src/main');
const platform = require('../src/platform');

const results = [];
const check = (name, pass, detail = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isOpen = () => main.sidebar.isOpen();

async function ways() {
  const tabClick = () => main.sidebar.tab.webContents.executeJavaScript(`document.getElementById('b').click()`);
  const WAYS = {
    'edge tab': tabClick,
    'Win+Shift+`': async () => platform.emitPtt('sidebar'),
    voice: async () => main.handleText(isOpen() ? 'close sidebar' : 'open sidebar', 0),
    tray: async () => main.tray.emit('click'),
  };
  for (const [name, act] of Object.entries(WAYS)) {
    let ok = 0;
    for (let i = 0; i < 5; i++) {
      await act(); await sleep(450);
      const opened = isOpen();
      await act(); await sleep(450);
      if (opened && !isOpen()) ok++;
    }
    check(`${name} opens and closes`, ok === 5, `${ok}/5`);
  }
}

async function run() {
  await main.ready;
  await sleep(1500);
  check('edge tab shows at the right edge', main.sidebar.tab.isVisible(), JSON.stringify(main.sidebar.tab.getBounds()));
  await ways();

  // Click away: another window takes focus
  main.sidebar.open('test');
  await sleep(400);
  const other = new BrowserWindow({ width: 300, height: 200, x: 100, y: 100, show: false });
  other.show(); other.focus();
  await sleep(500);
  check('click away closes it', !isOpen());
  other.destroy();

  // Esc inside the sidebar
  main.sidebar.open('test');
  await sleep(400);
  main.sidebar.win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
  await sleep(400);
  check('Esc closes it', !isOpen());

  // Width: drag result is kept and saved
  main.sidebar.open('test');
  await sleep(400);
  const b = main.sidebar.win.getBounds();
  main.sidebar.win.setBounds({ ...b, x: b.x - 80, width: b.width + 80 });
  await sleep(700);
  const saved = JSON.parse(fs.readFileSync(SET, 'utf8')).sidebarWidth;
  const nb = main.sidebar.win.getBounds(), tb = main.sidebar.tab.getBounds();
  check('width saved to settings', saved === b.width + 80, `saved ${saved}`);
  check('stays pinned right, tab on its left edge', nb.x + nb.width === b.x + b.width && tb.x + tb.width === nb.x, `side ${JSON.stringify(nb)} tab x ${tb.x}`);

  // Settings from the sidebar
  const r = await main.sidebar.win.webContents.executeJavaScript(`require('electron').ipcRenderer.invoke('settings:set', 'mode', 'auto')`);
  check('setting changed from the sidebar is saved', r.mode === 'auto' && JSON.parse(fs.readFileSync(SET, 'utf8')).mode === 'auto');
  const bad = await main.sidebar.win.webContents.executeJavaScript(`require('electron').ipcRenderer.invoke('settings:set', 'model', 'gpt')`);
  check('unknown values are refused', bad.model !== 'gpt');
  fs.writeFileSync(path.join(__dirname, 'out', 'sidebar-open.png'), (await main.sidebar.win.webContents.capturePage()).toPNG());
  main.sidebar.win.webContents.executeJavaScript(`document.getElementById('t-lessons').click()`);
  await sleep(400);
  const empty = await main.sidebar.win.webContents.executeJavaScript(`document.getElementById('list').textContent`);
  check('Lessons tab lists lessons (empty state here)', /No lessons yet/.test(empty), empty.slice(0, 40));

  // Edge tab never in the screenshot
  let tabSeen = null;
  const hide = main.sidebar.hideTab;
  main.sidebar.close('test');
  await sleep(300);
  const shot = main.captureClean();
  await sleep(30);
  tabSeen = main.sidebar.tab.isVisible();
  await shot;
  check('edge tab hidden during the screenshot', tabSeen === false && main.sidebar.tab.isVisible(), `during ${tabSeen}`);
  void hide;

  // Idle cost: sidebar closed, 10 s
  await sleep(2000);
  const m0 = app.getAppMetrics();
  await sleep(10000);
  const m = app.getAppMetrics();
  const cpu = m.reduce((s, p) => s + p.cpu.percentCPUUsage, 0), ram = Math.round(m.reduce((s, p) => s + p.memory.workingSetSize, 0) / 1024);
  check('idle CPU under 5%', cpu < 5, `${cpu.toFixed(1)}% over ${m.length} processes`);
  console.log(`RAM (working set, all processes): ${ram} MB; before idle ${Math.round(m0.reduce((s, p) => s + p.memory.workingSetSize, 0) / 1024)} MB`);

  console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
  fs.rmSync(TMP, { recursive: true, force: true });
  app.quit();
}
run().catch((e) => { console.error('SIDEBAR CHECK CRASH', e); app.quit(); });
