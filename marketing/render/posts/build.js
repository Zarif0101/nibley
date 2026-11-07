'use strict';
// Builds Nibley's launch posts (1080x1350 PNGs) with Playwright.
// Usage: node marketing/render/posts/build.js [outDir]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const draw = require('../../../library/tools/draw.js');
const mascot = require('../../../src/overlay/mascot.js');

const ROOT = path.resolve(__dirname, '../../..');
const OUT = process.argv[2] || '/tmp/claude-0/-home-user-nibley/77fe0c19-3d64-5601-8230-97f34306a4e4/scratchpad/launch-out/posts';
const TMP = path.join(OUT, '..', 'posts-html');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const T = { ink: '#2F8BFF', deep: '#1E6FEB', text: '#2B3A4B', muted: '#6B7A90', bg: '#F7FAFF', line: '#E6EEF8', swipe: 'rgba(255,217,140,.45)' };
const M = 80; // side margin
const CHIP_SHADOW = '0 2px 8px rgba(43,58,75,.28)';
const CARD_SHADOW = '0 1px 3px rgba(43,58,75,.08)';
const fonts = path.join(ROOT, 'src/overlay/fonts');

// ---------- pieces ----------
const mas = (face, size) => mascot.svg(face, size);

function asset(name, size, color = T.text, sw = 3.5) {
  let s = fs.readFileSync(path.join(ROOT, 'library/assets', name + '.svg'), 'utf8');
  s = s.replace(/currentColor/g, color).replace('stroke-width="3.5"', `stroke-width="${sw}"`);
  return s.replace('<svg ', `<svg width="${size}" height="${size}" `);
}
function assetInner(name) {
  const s = fs.readFileSync(path.join(ROOT, 'library/assets', name + '.svg'), 'utf8');
  return s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

// pen strokes built with the library helpers; returns d strings
function pen(name, stroke) {
  const svg = draw.toSvg({ name, strokes: [stroke] });
  return [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join('');
}
function penSvgPaths(ds, w) {
  const attrs = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
  return ds.map((d) => `<path d="${d}" ${attrs} stroke="${T.text}" stroke-width="${w + 5}"/>`).join('') +
    ds.map((d) => `<path d="${d}" ${attrs} stroke="${T.ink}" stroke-width="${w}"/>`).join('');
}

function chipSvg(x, y, text, fs_ = 28) {
  const w = Math.round(text.length * fs_ * 0.57 + 36);
  const h = Math.round(fs_ * 1.65);
  return `<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" rx="8" fill="${T.deep}" style="filter:drop-shadow(0 2px 4px rgba(43,58,75,.28))"/><text x="18" y="${h / 2 + fs_ * 0.35}" font-size="${fs_}" font-weight="600" fill="#fff">${text}</text></g>`;
}

// the lecture slide, 800x500 units. opts: marks, nibley (face), width (px)
function slide(width, opts = {}) {
  const s = width / 800;
  const penW = 7 / s;
  const G = 400, k = 2.6, bx = 300;
  const blockTx = bx - 100 * k, blockTy = G - 130 * k;
  const gTx = bx - 100 * k - 14.7 * k + 14.7 * k; // tile 1 starts at x = bx-(100-14.7)*k... computed below
  const tile = 171 * k;
  const g1 = 40 - 14.7 * k;
  const ground = [0, 1].map((i) => `<g transform="translate(${g1 + i * tile} ${G - 100 * k}) scale(${k})">${assetInner('ground')}</g>`).join('');
  let marks = '';
  if (opts.marks) {
    const ring = pen('post-ring', draw.ellipse(bx, 322, 160, 110));
    const arr = pen('post-arrow', draw.arrow(bx, 246, bx + 4, 140, 22));
    marks = penSvgPaths([ring, arr], penW) + chipSvg(bx + 22, 108, 'the floor pushing back', 34);
  } else if (opts.ring) {
    marks = penSvgPaths([pen('post-ring', draw.ellipse(bx, 322, 160, 110))], penW);
  }
  const nib = opts.nibley ? `<g transform="translate(${opts.nx ?? 590} ${opts.ny ?? 254}) scale(7)" shape-rendering="crispEdges">${mas(opts.nibley, 20).replace(/^<svg[^>]*>/, '').replace('</svg>', '')}</g>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="${width}" height="${width * 0.625}" style="display:block">
<rect width="800" height="500" fill="#fff"/>
<text x="40" y="84" font-size="40" font-weight="700" fill="${T.text}">Forces on a block</text>
<g stroke="${T.text}" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.5" style="vector-effect:non-scaling-stroke">
<clipPath id="gc"><rect x="0" y="0" width="760" height="500"/></clipPath>
<g clip-path="url(#gc)">${ground}</g>
<g transform="translate(${blockTx} ${blockTy}) scale(${k})">${assetInner('block')}</g>
</g>
<g stroke="${T.text}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M${bx} 326 L${bx + 1} 388 M${bx - 11} 372 L${bx + 1} 389 L${bx + 12} 372"/></g>
<text x="${bx + 22}" y="368" font-size="28" font-weight="400" fill="${T.text}">weight</text>
${marks}${nib}
</svg>`;
}

function laptop(slideSvg, w = 920) {
  return `<div style="width:${w}px;position:relative">
<div style="background:${T.text};border-radius:26px 26px 6px 6px;padding:22px 20px 20px;position:relative">
<div style="position:absolute;left:50%;top:7px;width:8px;height:8px;margin-left:-4px;border-radius:50%;background:${T.muted}"></div>
${slideSvg}</div>
<div style="margin:0 -38px;height:22px;background:${T.text};border-radius:4px 4px 26px 26px;position:relative"><div style="position:absolute;left:50%;top:0;width:150px;height:8px;margin-left:-75px;background:${T.muted};border-radius:0 0 12px 12px"></div></div></div>`;
}

const footer = `<div class="foot">${mas('happy', 60)}<span>Nibley</span></div>`;
const stepBlock = (n) => `<div class="step">${n}</div>`;

const pill = (face, label, dark = false) => `<div class="pill ${dark ? 'dark' : ''}">${mas(face, 60)}${dark ? '<span class="bars"><i style="height:16px"></i><i style="height:34px"></i><i style="height:22px"></i></span>' : ''}<span>${label}</span></div>`;

const css = `
@font-face{font-family:Inter;font-weight:400;src:url(file://${fonts}/inter-latin-400-normal.woff2)}
@font-face{font-family:Inter;font-weight:600;src:url(file://${fonts}/inter-latin-600-normal.woff2)}
@font-face{font-family:Inter;font-weight:700;src:url(file://${fonts}/inter-latin-700-normal.woff2)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px;overflow:hidden}
body{background:${T.bg};color:${T.text};font-family:Inter,sans-serif;position:relative}
svg text{font-family:Inter,sans-serif}
.abs{position:absolute}
h1{font-weight:700;font-size:92px;line-height:1.06;letter-spacing:-.02em}
.foot{position:absolute;left:${M}px;bottom:64px;display:flex;align-items:center;gap:20px;font-weight:600;font-size:38px}
.foot svg{display:block}
.step{width:84px;height:84px;border-radius:8px;background:${T.deep};color:#fff;font-weight:700;font-size:48px;display:flex;align-items:center;justify-content:center;box-shadow:${CHIP_SHADOW}}
.pill{display:inline-flex;align-items:center;gap:18px;background:#fff;border-radius:999px;padding:12px 40px 12px 16px;font-weight:600;font-size:40px;box-shadow:${CHIP_SHADOW}}
.pill.dark{background:${T.deep};color:#fff}
.pill svg{display:block}
.bars{display:flex;align-items:center;gap:6px;height:40px}
.bars i{display:block;width:6px;background:#fff;border-radius:3px}
.card{background:#fff;border:2px solid ${T.line};border-radius:12px;box-shadow:${CARD_SHADOW}}
.chip{display:inline-block;background:${T.deep};color:#fff;font-weight:600;font-size:36px;padding:10px 22px;border-radius:8px;box-shadow:${CHIP_SHADOW}}
.key{width:300px;height:300px;background:#fff;border:5px solid ${T.text};border-radius:12px;box-shadow:0 5px 0 ${T.text};transform:translateY(8px);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:110px}
.mark{background:${T.swipe};padding:0 6px;margin:0 -6px;border-radius:2px}
`;

const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;

// ---------- posts ----------
const posts = {};

// 1 cover
posts['post-01'] = page(`
<h1 class="abs" style="left:${M}px;top:88px;width:920px;font-size:100px">Hi, I'm Nibley.<br>I draw on your lecture slides.</h1>
<div class="abs" style="left:${M}px;top:560px">${laptop(slide(880, { ring: true, nibley: 'happy' }))}</div>
<div class="abs" style="left:${M}px;bottom:64px;font-size:40px;font-weight:600">Windows · uses your Claude subscription</div>
`);

// 2 how it works
const miniKey = (t, fs_) => `<div class="key" style="width:130px;height:130px;font-size:${fs_}px;border-width:4px;box-shadow:0 4px 0 ${T.text};transform:translateY(5px)">${t}</div>`;
const col = (n, inner) => `<div style="width:280px;display:flex;flex-direction:column;gap:36px;align-items:flex-start"><div class="step" style="width:64px;height:64px;font-size:36px">${n}</div><div style="height:170px;display:flex;align-items:center">${inner}</div></div>`;
const miniBlock = `<svg width="280" height="260" viewBox="0 0 200 186" style="display:block"><g fill="none" stroke="${T.text}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 -14)">${assetInner('block')}</g>${penSvgPaths([pen('mini-ring', draw.ellipse(100, 86, 76, 54))], 5)}</svg>`;
posts['post-02-1'] = page(`
<h1 class="abs" style="left:${M}px;top:110px;width:940px;font-size:104px">How Nibley<br>works. It's<br>three steps.</h1>
<div class="abs" style="left:${M}px;top:700px;display:flex;gap:40px">
${col(1, `<div style="display:flex;gap:16px;align-items:center">${miniKey('Win', 44)}${miniKey('\`', 110)}</div>`)}
${col(2, `<div class="card" style="padding:22px 24px;font-size:38px;font-weight:600;line-height:1.2;width:280px">what's this?</div>`)}
${col(3, miniBlock)}
</div>
${footer}`);

posts['post-02-2'] = page(`
<div class="abs" style="left:${M}px;top:96px">${stepBlock(1)}</div>
<h1 class="abs" style="left:${M}px;top:240px;font-size:140px">Hold<br>Win + \`</h1>
<div class="abs" style="left:${M}px;top:700px;display:flex;gap:40px;align-items:center"><div class="key" style="width:400px">Win</div><div style="font-size:90px;font-weight:600">+</div><div class="key" style="font-size:240px;line-height:1;padding-top:44px">\`</div></div>
<div class="abs" style="left:${M + 535}px;top:1050px;font-size:40px;font-weight:600">↑ the key under Esc</div>
<div class="abs" style="right:${M}px;bottom:36px">${mas('listening', 160)}</div>
${footer}`);

posts['post-02-3'] = page(`
<div class="abs" style="left:${M}px;top:96px">${stepBlock(2)}</div>
<h1 class="abs" style="left:${M}px;top:230px;width:920px">Ask out loud,<br>like you'd ask<br>a friend.</h1>
<div class="abs card" style="left:${M}px;top:700px;padding:36px 44px;font-size:54px;font-weight:600;line-height:1.2;width:920px;white-space:nowrap;font-size:50px">wait, what's a normal force?</div>
<div class="abs" style="left:${M}px;top:960px">${pill('listening', 'Listening', true)}</div>
<div class="abs" style="right:${M}px;bottom:60px">${mas('listening', 200)}</div>
${footer}`);

posts['post-02-4'] = page(`
<div class="abs" style="left:${M}px;top:96px">${stepBlock(3)}</div>
<h1 class="abs" style="left:${M}px;top:230px;width:920px">It explains,<br>and draws on<br>your screen.</h1>
<div class="abs card" style="left:${M}px;top:600px;width:920px;overflow:hidden;padding:0;border-width:0;box-shadow:${CARD_SHADOW}">${slide(920, { marks: true, nibley: 'speaking' })}</div>
${footer}`);

// 3 before / after
posts['post-03-1'] = page(`
<h1 class="abs" style="left:${M}px;top:96px;width:920px">The slide from<br>the lecture.</h1>
<div class="abs card" style="left:${M}px;top:420px;width:920px;overflow:hidden">${slide(916)}</div>
${footer}`);
posts['post-03-2'] = page(`
<h1 class="abs" style="left:${M}px;top:96px;width:920px">The same slide,<br>one question later.</h1>
<div class="abs card" style="left:${M}px;top:420px;width:920px;overflow:hidden">${slide(916, { marks: true })}</div>
<div class="abs" style="left:${M}px;top:1040px;font-size:46px;font-weight:600">&ldquo;wait, what's a normal force?&rdquo;</div>
${footer}`);

// 4 founder
posts['post-04'] = page(`
<div class="abs" style="left:${M}px;top:100px;width:920px;font-size:76px;line-height:1.25;font-weight:600;letter-spacing:-.015em">
I have ADHD and I study from YouTube lectures. I wanted <span class="mark">answers that come first</span>, <span class="mark">one idea at a time</span>, drawn right where I'm looking. <span style="color:${T.deep};font-weight:700">So I built Nibley. It's free.</span></div>
<div class="abs" style="right:${M}px;bottom:70px">${mas('happy', 240)}</div>
<div class="abs" style="left:${M}px;bottom:64px;font-size:40px;font-weight:600">github.com/Zarif0101/nibley</div>`);

// 5 moods
const faces = ['happy', 'listening', 'thinking', 'speaking', 'confused'];
posts['post-05-1'] = page(`
<h1 class="abs" style="left:${M}px;top:110px;font-size:130px">Nibley<br>has moods.</h1>
<div class="abs" style="left:${M}px;top:700px;display:flex;gap:25px;align-items:flex-start">
${faces.map((f, i) => `<div style="margin-top:${[0, 60, 20, 90, 40][i]}px">${mas(f, 160)}</div>`).join('')}</div>
${footer}`);
const moodPill = { happy: null, listening: pill('listening', 'Listening', true), thinking: pill('thinking', 'Thinking'), speaking: pill('speaking', 'Speaking'), confused: pill('confused', "Didn't catch that") };
faces.forEach((f, i) => {
  posts[`post-05-${i + 2}`] = page(`
<div class="abs" style="left:${M}px;top:96px">${mas(f, 640)}</div>
<div class="abs" style="left:${M}px;top:800px;font-size:150px;font-weight:700;letter-spacing:-.02em">${f}</div>
${moodPill[f] ? `<div class="abs" style="left:${M}px;top:1010px">${moodPill[f]}</div>` : ''}
<div class="abs" style="right:${M}px;bottom:70px;font-size:38px;font-weight:600">${i + 1} / 5</div>${footer}`);
});

// 6 open source
posts['post-06'] = page(`
<h1 class="abs" style="left:${M}px;top:96px;font-size:230px;letter-spacing:-.03em">Free.</h1>
<div class="abs" style="left:${M}px;top:400px;width:920px;font-size:72px;font-weight:700;line-height:1.1;letter-spacing:-.02em">MIT licence.</div>
<div class="abs" style="left:${M}px;top:520px;width:920px;font-size:56px;font-weight:600;line-height:1.2">Runs on your own Claude subscription.</div>
<div class="abs" style="left:${M}px;top:760px;width:880px;font-size:60px;font-weight:600;line-height:1.2;color:${T.deep}">Fork it, change it, make it yours.</div>
<div class="abs card" style="left:${M}px;top:1000px;padding:30px 40px;width:920px;font-size:38px;font-weight:600;line-height:1.3">git clone https://github.com/Zarif0101/nibley</div>
<div class="abs" style="right:${M}px;top:96px">${mas('happy', 200)}</div>`);

// 7 studying too
const dcard = (name, label, x, y, w, h, size) => `<div class="abs card" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">
<div class="abs" style="left:24px;top:24px"><span class="chip" style="font-size:36px">${label}</span></div>
<div class="abs" style="left:${(w - size) / 2}px;top:${(h - size) / 2 + 36}px">${asset(name, size, T.text, 3.5)}</div></div>`;
posts['post-07'] = page(`
<h1 class="abs" style="left:${M}px;top:90px;width:920px;font-size:88px">Nibley's been<br>studying too.</h1>
${dcard('pendulum', 'physics', M, 400, 440, 740, 420)}
${dcard('electrochemical-cell', 'chemistry', 540, 400, 460, 360, 330)}
${dcard('mitochondrion', 'biology', 540, 780, 460, 360, 330)}
<div class="abs" style="left:${M}px;top:1170px;width:920px;font-size:40px;font-weight:600;line-height:1.3">200+ topics and 120+ hand-drawn diagrams, in the next update.</div>`);

// 8 saved lessons
const thumb = (inner) => `<div style="width:300px;height:188px;border-radius:8px;overflow:hidden;border:2px solid ${T.line};flex:none;background:#fff">${inner}</div>`;
const lcard = (th, title, ask, date) => `<div class="card" style="display:flex;gap:28px;padding:24px;align-items:center;margin-top:22px">${th}<div><div style="font-size:42px;font-weight:600;line-height:1.15">${title}</div><div style="font-size:36px;line-height:1.25;margin-top:8px">You asked: ${ask}</div><div style="font-size:36px;margin-top:10px;color:${T.text}">${date}</div></div></div>`;
posts['post-08'] = page(`
<h1 class="abs" style="left:${M}px;top:90px;width:920px;font-size:100px">Say &ldquo;save this&rdquo;.</h1>
<div class="abs" style="left:${M}px;top:240px;width:920px;font-size:62px;font-weight:600;line-height:1.2">Replay it any time.<br><span class="mark">Replays use no extra AI.</span></div>
<div class="abs" style="left:${M}px;top:560px;width:920px;height:900px;background:${T.bg};border:6px solid ${T.text};border-radius:12px;padding:30px 34px">
<div style="display:flex;align-items:center;gap:22px;font-size:54px;font-weight:700">${mas('happy', 80)}Lessons</div>
${lcard(thumb(slide(300, { marks: true })), 'What is a normal force?', 'wait, what&rsquo;s a normal force?', '3 Nov, 19:12')}
${lcard(thumb(`<div style="display:flex;justify-content:center;padding-top:4px">${asset('pendulum', 180)}</div>`), 'Why a pendulum swings', 'why does it come back?', '2 Nov, 22:40')}
${lcard(thumb(`<div style="display:flex;justify-content:center;padding-top:4px">${asset('mitochondrion', 180)}</div>`), 'What the mitochondrion does', 'what are the folds for?', '1 Nov, 08:05')}
</div>`);

// 9 built in public
const parts = ['Electron', 'Claude Haiku', 'Whisper on Groq', 'one stubborn learner'];
posts['post-09'] = page(`
<h1 class="abs" style="left:${M}px;top:96px;width:940px;font-size:76px;white-space:nowrap">What Nibley is made of:</h1>
<div class="abs" style="left:${M}px;top:340px;width:920px">
${parts.map((p, i) => `<div style="border-top:3px solid ${T.line};padding:34px 0 38px;display:flex;align-items:center;gap:32px;font-size:${i === 3 ? 76 : 88}px;font-weight:700;letter-spacing:-.02em"><span class="step" style="width:64px;height:64px;font-size:36px;flex:none">${i + 1}</span><span>${i === 3 ? `<span class="mark">${p}</span>` : p}</span></div>`).join('')}
</div>
<div class="abs" style="right:${M}px;bottom:64px">${mas('happy', 140)}</div>
${footer}`);

// 10 coming soon
const stopwatch = penSvgPaths([
  pen('sw-ring', draw.circle(150, 150, 96)),
  pen('sw-hand', draw.line(150, 150, 150, 84)),
  pen('sw-hand2', draw.line(150, 150, 196, 176)),
  pen('sw-top', draw.line(130, 38, 170, 38)),
], 7);
const stairs = `<g transform="translate(0 0) scale(1.6)" fill="none" stroke="${T.text}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="vector-effect:non-scaling-stroke">${assetInner('staircase')}</g>` + penSvgPaths([pen('gap-ring', draw.ellipse(142, 196, 50, 40))], 7);
posts['post-10'] = page(`
<h1 class="abs" style="left:${M}px;top:96px;font-size:100px">Next up:</h1>
<svg class="abs" style="left:${M}px;top:290px" width="300" height="300" viewBox="0 0 300 300">${stopwatch}</svg>
<div class="abs" style="left:430px;top:340px;width:570px;font-size:68px;font-weight:700;line-height:1.15;letter-spacing:-.02em">Flashcards that time themselves</div>
<div class="abs" style="left:${M}px;top:690px;width:920px;height:3px;background:${T.line}"></div>
<svg class="abs" style="left:${M}px;top:760px" width="300" height="340" viewBox="0 0 320 340">${stairs}</svg>
<div class="abs" style="left:430px;top:790px;width:570px;font-size:68px;font-weight:700;line-height:1.15;letter-spacing:-.02em">A gap finder that spots the basic you're missing</div>
${footer}`);

// ---------- render ----------
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  const names = Object.keys(posts);
  for (const n of names) {
    const f = path.join(TMP, n + '.html');
    fs.writeFileSync(f, posts[n]);
    const p = await ctx.newPage();
    await p.goto('file://' + f);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, n + '.png') });
    await p.close();
  }
  // contact sheet
  const cols = 7, tw = 270, th = 338;
  const rows = Math.ceil(names.length / cols);
  const html = `<!doctype html><html><body style="margin:0;background:#E6EEF8;width:${cols * (tw + 16) + 16}px;font:600 14px Inter,sans-serif">
<div style="display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:16px;padding:16px">${names.map((n) => `<div><img src="file://${path.join(OUT, n + '.png')}" width="${tw}" height="${th}" style="display:block;border:1px solid #2B3A4B"><div style="padding-top:4px;color:#2B3A4B">${n}</div></div>`).join('')}</div></body></html>`;
  const cf = path.join(TMP, 'contact.html');
  fs.writeFileSync(cf, html);
  const cp = await browser.newPage({ viewport: { width: cols * (tw + 16) + 16, height: rows * (th + 40) + 32 } });
  await cp.goto('file://' + cf);
  await cp.screenshot({ path: path.join(OUT, 'contact-sheet.png'), fullPage: true });
  await browser.close();
  console.log(names.length + ' images');
})();
