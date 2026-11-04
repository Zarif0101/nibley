// One-off: renders the mascot icons to src/overlay/ (tray-16/32, tray-dot-16/32 = error face, app-256).
// Run: npx electron test/make-icons.js
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const mascot = require('../src/overlay/mascot.js');

const OUT = path.join(__dirname, '..', 'src', 'overlay');
const ICONS = [
  ['tray-16', 16, mascot.svg('happy', 16)],
  ['tray-32', 32, mascot.svg('happy', 32)],
  ['tray-dot-16', 16, mascot.svg('error', 16)],
  ['tray-dot-32', 32, mascot.svg('error', 32)],
  ['app-256', 256, `<div style="width:256px;height:256px;border-radius:56px;background:#2F8BFF;display:grid;place-items:center">${mascot.svg('happy', 184)}</div>`],
];

app.whenReady().then(async () => {
  // One window reused: a second offscreen window after destroy() fails to load in Electron 44 (seen here).
  const w = new BrowserWindow({ width: 256, height: 256, show: false, transparent: true, frame: false, webPreferences: { offscreen: true } });
  for (const [name, px, html] of ICONS) {
    const tmp = path.join(OUT, '_icon.html');
    fs.writeFileSync(tmp, `<body style="margin:0;background:transparent">${html}</body>`);
    await w.loadFile(tmp);
    fs.rmSync(tmp);
    await new Promise((r) => setTimeout(r, 200));
    const img = await w.webContents.capturePage({ x: 0, y: 0, width: px, height: px });
    fs.writeFileSync(path.join(OUT, `${name}.png`), img.resize({ width: px, height: px }).toPNG());
  }
  app.quit();
});
