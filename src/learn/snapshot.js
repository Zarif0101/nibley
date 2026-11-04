// The small header Haiku gets with each question (LEARNING-ENGINE 4.5). Pure. ≤ 120 tokens (≈ 4 characters each).
// Goes at the top of the user message, never the system prompt (brain.js starts claude once with a fixed prompt).
const model = require('./model');

const MAX_TOKENS = 120;
const tokens = (s) => Math.ceil(s.length / 4);
const firstSentence = (s, maxWords = 18) => {
  const one = String(s || '').split(/(?<=[.!?])\s/)[0].trim();
  const w = one.split(/\s+/);
  return w.length > maxWords ? `${w.slice(0, maxWords).join(' ')}…` : one;
};

// Remember the last analogy that landed per topic. worked: [{topic, analogy, at}], newest last, ≤ 100.
function addWorked(worked, { topic, analogy, at = Date.now() }) {
  if (!topic || !analogy) return worked;
  return [...worked.filter((w) => w.topic !== topic), { topic, analogy: String(analogy).slice(0, 80), at }].slice(-100);
}

// opts: {style, pace: {words, lines, rate}, topic, lib, model: state, worked, now}
function snapshot({ style, pace, topic, lib, model: m, worked = [], now = Date.now() }) {
  const head = [`[nibley] style=${style}`];
  if (pace) head.push(`pace=words${pace.words},lines${pace.lines}${pace.rate ? `,rate${pace.rate > 0 ? '+' : ''}${pace.rate}%` : ''}`);
  const lines = [];
  const t = topic && lib?.has(topic) ? lib.get(topic) : null;
  if (t) {
    head.push(`topic=${topic}(${m ? model.level(m, topic, { now }) : 'unknown'})`);
    const note = lib.note(topic);
    const key = firstSentence(note?.idea || t.summary);
    if (key) lines.push(`key: ${key}`);
    if (m) {
      const weak = lib.ancestors(topic).slice(0, 8)
        .map((id) => ({ id, gap: m.gaps[id]?.status === 'open', lv: model.level(m, id, { now }) }))
        .filter((x) => x.gap || x.lv === 'shaky')
        .sort((a, b) => Number(b.gap) - Number(a.gap))
        .slice(0, 2)
        .map((x) => `${x.id}${x.gap ? ' (gap)' : ''}`);
      if (weak.length) lines.push(`weak basics: ${weak.join(', ')}`);
      if (m.topics[topic]?.misconception) lines.push(`misconception: he was sure and wrong here before${note?.mistakes?.[0] ? `; common: ${firstSentence(note.mistakes[0], 14)}` : ''}`);
    }
  }
  const w = topic && [...worked].reverse().find((x) => x.topic === topic);
  if (w) lines.push(`worked before: "${w.analogy}"`);
  const out = [head.join(' '), ...lines];
  while (out.length > 1 && tokens(out.join('\n')) > MAX_TOKENS) out.pop();
  let text = out.join('\n');
  if (tokens(text) > MAX_TOKENS) text = text.slice(0, MAX_TOKENS * 4 - 1) + '…';
  return text;
}

module.exports = { snapshot, addWorked, MAX_TOKENS, tokens };
