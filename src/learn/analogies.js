// Analogy lookup for any topic (library/analogies.json, research/2026-11-04-analogies-for-any-topic.md). Pure after load.
// Each analogy follows Teaching-With-Analogies: familiar thing, mapping, where it breaks. Haiku gets one per question.
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT = path.join(__dirname, '..', '..', 'library', 'analogies.json');
const clean = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

function loadAnalogies(file = DEFAULT) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Score: exact topic link wins; then whole keyword/concept phrases found in the question. -> best first.
function findAnalogies(list, text, { topic, domain, limit = 3, exclude = [] } = {}) {
  const q = ` ${clean(text)} `;
  const scored = [];
  for (const a of list) {
    if (exclude.includes(a.id) || (domain && a.domain !== domain)) continue;
    let s = topic && a.topic === topic ? 10 : 0;
    for (const k of [a.concept, ...a.keywords]) {
      const c = clean(k);
      if (c && q.includes(` ${c} `)) s += 2 + c.split(' ').length;
    }
    if (s > 0) scored.push([s, a]);
  }
  return scored.sort((x, y) => y[0] - x[0]).slice(0, limit).map(([, a]) => a);
}

// One line for the per-question header (snapshot.js).
const analogyLine = (a) => (a ? `try analogy: ${a.analogy} (breaks: ${a.breaks}) draw: ${a.assets.join(', ')}` : '');

module.exports = { loadAnalogies, findAnalogies, analogyLine };
