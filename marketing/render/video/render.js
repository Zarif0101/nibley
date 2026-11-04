'use strict';
// node render.js video1|video2  -> frames via Playwright (seek(i/30) + jpeg screenshot) piped into ffmpeg, mux audio, make sheet.
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const OUT = '/tmp/claude-0/-home-user-nibley/77fe0c19-3d64-5601-8230-97f34306a4e4/scratchpad/launch-out';
const name = process.argv[2] || 'video1';
const dur = { video1: 25.8, video2: 24 }[name];
const FPS = 30;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const silent = path.join(OUT, `.${name}-silent.mp4`);
  const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;   // debug: single frames at seconds
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.join(__dirname, name + '.html'));
  await page.waitForFunction('window.READY === true');
  if (only) {
    for (const s of only) {
      await page.evaluate((t) => window.seek(t), s);
      await page.screenshot({ path: path.join(OUT, `.dbg-${name}-${s}.png`) });
    }
    await browser.close();
    return;
  }
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round(dur * FPS);
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.seek(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();
  // audio
  const wav = path.join(OUT, `.${name}-mix.wav`);
  let r = spawnSync('node', [path.join(__dirname, 'audio.js'), name, wav], { stdio: 'inherit' });
  if (r.status) process.exit(1);
  r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', silent, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', path.join(OUT, name + '.mp4')], { stdio: 'inherit' });
  if (r.status) process.exit(1);
  // keyframe sheet: 1 frame per second, 6 columns
  r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', path.join(OUT, name + '.mp4'), '-vf', `fps=1,scale=300:-1,tile=6x${Math.ceil(dur / 6)}:padding=6:color=0xE6EEF8`, '-frames:v', '1', path.join(OUT, name + '-sheet.png')], { stdio: 'inherit' });
  fs.unlinkSync(silent); fs.unlinkSync(wav);
})();
