// Learning curve per topic (LEARNING-ENGINE 4.4). Pure. curve state: { topicId: [[at, p], ...] } (last 50 points).
// Call addPoint after every model.observe with the new P(known). No percentages ever reach the user.
const fsrs = require('./fsrs');
const model = require('./model');

const MAX = 50, DAY = 86400000, WEEK = 7 * DAY;
const FADING = 0.7; // FSRS retrievability below this on a card he knew: needs a refresh (guess)

const band = (p) => (p >= model.PARAMS.known ? 2 : p >= model.PARAMS.shaky ? 1 : 0); // 0 shaky, 1 okay, 2 strong-ish

function addPoint(curve, topic, at, p) {
  const pts = [...(curve[topic] || []), [at, Math.round(p * 1000) / 1000]].slice(-MAX);
  return { ...curve, [topic]: pts };
}

function pAt(points, at) {
  let p = null;
  for (const [t, v] of points) { if (t <= at) p = v; else break; }
  return p;
}

// -> {stronger: [ids], fading: [ids], text}
function weekSummary({ curve = {}, cards = [] }, now = Date.now()) {
  const stronger = [];
  for (const [topic, pts] of Object.entries(curve)) {
    if (!pts.length) continue;
    const before = pAt(pts, now - WEEK) ?? model.PARAMS.prior, after = pAt(pts, now);
    if (after != null && band(after) > band(before)) stronger.push(topic);
  }
  const fading = [...new Set(cards.filter((c) => c.reps > 0 && c.state !== 'new' && fsrs.retrievability(c, now) < FADING).map((c) => c.topic))];
  const parts = [];
  if (stronger.length) parts.push(`${stronger.length} topic${stronger.length > 1 ? 's' : ''} got stronger this week`);
  if (fading.length) parts.push(`${fading.length} need${fading.length > 1 ? '' : 's'} a refresh`);
  return { stronger, fading, text: parts.length ? `${parts.join(', ')}.` : '' };
}

// Days from the first point to the first point at okay or better; null if not reached.
function timeToOkay(curve, topic) {
  const pts = curve[topic] || [];
  if (!pts.length) return null;
  const hit = pts.find(([, p]) => p >= model.PARAMS.shaky);
  return hit ? Math.round((hit[0] - pts[0][0]) / DAY * 10) / 10 : null;
}

module.exports = { MAX, FADING, addPoint, weekSummary, timeToOkay };
