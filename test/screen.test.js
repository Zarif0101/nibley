const test = require('node:test');
const assert = require('node:assert/strict');
const { screenKey, sameScreen, screenDiff } = require('../src/screen');

const W = 1366, H = 768;
// A busy fake screen: stripes and blocks of text-like noise, deterministic.
function screen(fn = () => 0) {
  const b = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, v = ((x >> 4) * 37 + (y >> 3) * 91) % 200 + 20 + fn(x, y);
    b[i] = b[i + 1] = b[i + 2] = Math.max(0, Math.min(255, v)); b[i + 3] = 255;
  }
  return b;
}
const base = screen();
const kBase = screenKey(base, W, H);

test('the same screen twice is the same', () => {
  assert.ok(sameScreen(kBase, screenKey(screen(), W, H)));
});

test('tiny pixel noise (compression, anti-aliasing) still counts as the same', () => {
  const noisy = screen((x, y) => ((x * 7 + y * 13) % 3) - 1);
  assert.ok(sameScreen(kBase, screenKey(noisy, W, H)), JSON.stringify(screenDiff(kBase, screenKey(noisy, W, H))));
});

test('a new word (a 40x14 px dark patch) makes it different', () => {
  const word = screen((x, y) => (x >= 600 && x < 640 && y >= 300 && y < 314 ? -150 : 0));
  assert.ok(!sameScreen(kBase, screenKey(word, W, H)), JSON.stringify(screenDiff(kBase, screenKey(word, W, H))));
});

test('scrolling 40 px makes it different', () => {
  const scrolled = new Uint8Array(base.length);
  scrolled.set(base.subarray(40 * W * 4));
  assert.ok(!sameScreen(kBase, screenKey(scrolled, W, H)));
});

test('a different size or a missing key is never the same', () => {
  assert.ok(!sameScreen(kBase, screenKey(new Uint8Array(1280 * 720 * 4), 1280, 720)));
  assert.ok(!sameScreen(kBase, null));
});

test('the key is small and the height defaults from the buffer length', () => {
  const k = screenKey(base, W);
  assert.equal(k.h, H);
  assert.equal(k.blocks.length, 64 * 36);
});
