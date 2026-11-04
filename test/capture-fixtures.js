// One-off: captures real YouTube frames at 1366x768 as test fixtures, with DOM boxes of player parts.
// Run: npx electron test/capture-fixtures.js [names...]
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const OUT = path.join(__dirname, 'fixtures');
const SHOTS = [
  { name: 'lecture', id: 'J7DzL2_Na80', t: 600 },   // MIT 18.06 Strang, lecture 1 (chalkboard)
  { name: 'diagram', id: 'aircAruvnKk', t: 300 },   // 3Blue1Brown, neural network diagram
  { name: 'player', id: 'fNk_zzaMoSs', t: 120, hover: true },    // 3Blue1Brown, vectors (player controls test)
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const s of SHOTS.filter((x) => !process.argv[2] || process.argv.includes(x.name))) {
    console.log('loading', s.name);
    const w = new BrowserWindow({ width: 1366, height: 768, show: false, webPreferences: { offscreen: true } });
    w.webContents.setAudioMuted(true);
    // YouTube redirects once (themeRefresh), so loadURL may reject or hang: don't wait on it.
    await Promise.race([w.loadURL(`https://www.youtube.com/watch?v=${s.id}&t=${s.t}s`).catch(() => {}), sleep(20000)]);
    await sleep(4000);
    const info = await w.webContents.executeJavaScript(`(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      for (let i = 0; i < 60; i++) {
        const v = document.querySelector('video');
        const ad = document.querySelector('.ad-showing');
        for (const b of document.querySelectorAll('button, .ytp-skip-ad-button')) if (/^(skip|no thanks)/i.test(b.textContent.trim())) b.click();
        if (v && v.readyState >= 2 && !ad) {
          v.currentTime = ${s.t}; v.pause(); await sleep(2500);
          const box = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; };
          return { title: document.title, video: box('video'), cc: box('.ytp-subtitles-button'), settings: box('.ytp-settings-button'), play: box('.ytp-play-button'), full: box('.ytp-fullscreen-button') };
        }
        await sleep(1000);
      }
      return { error: 'video never ready', title: document.title };
    })()`);
    if (s.hover) { w.webContents.sendInputEvent({ type: 'mouseMove', x: 450, y: 500 }); await sleep(300); w.webContents.sendInputEvent({ type: 'mouseMove', x: 455, y: 505 }); }
    await sleep(500);
    const img = await w.webContents.capturePage();
    fs.writeFileSync(path.join(OUT, `${s.name}.png`), img.toPNG());
    console.log(s.name, JSON.stringify({ ...info, size: img.getSize() }));
    w.destroy();
  }
  app.quit();
});
