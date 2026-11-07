// Grabs real YouTube lecture frames for the aim test (NEXT-ROUND phase 1 step 6).
// Loads each video's embed player at a set time in a hidden 1600x900 window and saves what it shows.
// Run:  npx electron test/aim-grab.js        Writes test/out/aim-frames/frame-N.png (gitignored).
const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

// [video id, start second]. Lectures from Khan Academy, MIT OCW, Crash Course and Zarif's own HSC ICT class.
const VIDEOS = [
  ['Z9IWg0pcpqo', 120], ['kQCS1AhAnMI', 200], ['bJMUKNbAsTY', 150], ['CuGg-Tf8lPI', 180], ['eB5NVPzBCzM', 240],
  ['iPzRbK3wApI', 900], ['skPOXcVvS5c', 160], ['4YNDB_zSzfE', 300], ['GUfdbyU0MDo', 120], ['dPKvHrD1eS4', 200],
  ['PUGOQ5zJeVk', 1500],
];
const OUT = path.join(__dirname, 'out', 'aim-frames');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1600, height: 900, show: false, useContentSize: true, webPreferences: { offscreen: false, backgroundThrottling: false } });
  win.webContents.setAudioMuted(true);
  for (const [i, [id, t]] of VIDEOS.entries()) {
    // The normal watch page (embeds refuse Electron: errors 152/153). This is also what Zarif sees in Brave.
    await win.loadURL(`https://www.youtube.com/watch?v=${id}&t=${t}s`).catch(() => {});
    await sleep(12000); // page loads, video seeks; pre-roll ads may still show
    await win.webContents.executeJavaScript(`document.querySelector('video')?.pause(); document.querySelector('.ytp-ad-skip-button-modern, .ytp-skip-ad-button')?.click()`).catch(() => {});
    await sleep(1500);
    fs.writeFileSync(path.join(OUT, `frame-${i}.png`), (await win.webContents.capturePage()).toPNG());
    console.log(`frame-${i} ${id} @${t}s`);
  }
  win.destroy();
  app.quit();
});
