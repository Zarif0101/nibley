// Same-screen check (SPEED-TOKEN-PLAN P1): skip re-sending a screenshot Claude has already seen. Pure.
// The key is a 64x36 greyscale thumbnail of the capture (one value per ~21x21 px block).
// Two screens count as the same only if the average block difference is tiny AND no single block changed much,
// so a new word, a scroll or a new video frame always means "different". A wrong "different" costs tokens;
// a wrong "same" would make Nibley answer about an old screen, so the thresholds lean to "different".
const KW = 64, KH = 36;

// bitmap: BGRA bytes (Electron nativeImage.toBitmap() on Windows), width w, height h (default: from the length).
function screenKey(bitmap, w, h = Math.floor(bitmap.length / (4 * w))) {
  const out = new Uint8Array(KW * KH);
  for (let ky = 0; ky < KH; ky++) {
    const y0 = Math.floor((ky * h) / KH), y1 = Math.max(y0 + 1, Math.floor(((ky + 1) * h) / KH));
    for (let kx = 0; kx < KW; kx++) {
      const x0 = Math.floor((kx * w) / KW), x1 = Math.max(x0 + 1, Math.floor(((kx + 1) * w) / KW));
      let sum = 0, n = 0;
      // Sample every 3rd pixel each way: enough for a block average, ~9x cheaper than every pixel.
      for (let y = y0; y < y1; y += 3) {
        for (let x = x0; x < x1; x += 3) {
          const i = (y * w + x) * 4;
          sum += 0.114 * bitmap[i] + 0.587 * bitmap[i + 1] + 0.299 * bitmap[i + 2];
          n++;
        }
      }
      out[ky * KW + kx] = n ? Math.round(sum / n) : 0;
    }
  }
  return { w, h, blocks: out };
}

function screenDiff(a, b) {
  if (!a || !b || a.w !== b.w || a.h !== b.h) return { mean: Infinity, max: Infinity };
  let total = 0, max = 0;
  for (let i = 0; i < a.blocks.length; i++) {
    const d = Math.abs(a.blocks[i] - b.blocks[i]);
    total += d;
    if (d > max) max = d;
  }
  return { mean: total / a.blocks.length, max };
}

function sameScreen(a, b, { meanMax = 1.5, blockMax = 6 } = {}) {
  const d = screenDiff(a, b);
  return d.mean <= meanMax && d.max <= blockMax;
}

module.exports = { screenKey, screenDiff, sameScreen, KW, KH };
