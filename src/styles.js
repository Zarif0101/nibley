// Builds the "teaching styles" part of Nibley's system prompt from library/styles/*.md (TEACHING-BIBLE, LEARNING-ENGINE 5.1).
// The section is fixed text (it never changes per question), so Claude Code can reuse it cheaply every turn.
// Which style to use for one answer comes in the per-question header ([nibley] style=..., src/learn/snapshot.js).
// Wiring (local session, src/prompt.js build()): add styles.section() after CORE.
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..', 'library', 'styles');
const ORDER = ['doodle-story', 'board-builder', 'exam-coach', 'picture-first', 'question-buddy'];

// One style file -> {id, name, card, examples: [{title, subject, turns: [{who, text, script}]}]}
function parseStyle(id, md) {
  md = md.replace(/\r\n/g, '\n'); // Windows checkouts get CRLF (git autocrlf)
  const name = (md.match(/^# (.+)$/m) || [])[1] || id;
  const card = ((md.split(/^## Card\s*$/m)[1] || '').split(/^## /m)[0] || '').trim();
  const examples = [];
  for (const part of md.split(/^## Example: /m).slice(1)) {
    const [head, ...rest] = part.split('\n');
    const m = head.match(/^(.*?)\s*\((.+)\)\s*$/) || [null, head.trim(), ''];
    const turns = [];
    const body = rest.join('\n');
    const re = /^(He (asks|answers)[^\n]*)\n```\n([\s\S]*?)\n```/gm;
    let t;
    while ((t = re.exec(body))) turns.push({ who: t[2] === 'asks' ? 'asks' : 'answers', text: t[1].trim(), script: t[3].trim() });
    examples.push({ title: m[1].trim(), subject: m[2].trim(), turns });
  }
  return { id, name, card, examples };
}

function loadStyles(dir = DIR) {
  return ORDER.filter((id) => fs.existsSync(path.join(dir, `${id}.md`))).map((id) => parseStyle(id, fs.readFileSync(path.join(dir, `${id}.md`), 'utf8')));
}

const RULES = `# Teaching styles
Each question starts with a header line like "[nibley] style=board-builder pace=words16,lines4". Never read it aloud.
Use the style it names. pace: words = max words per say line, lines = max say lines.
If it has "try analogy", use that analogy: map 2-3 parts, then say once where it breaks.
Rules for every style: answer first in under 15 words; one idea per say line; a mark for every key idea; analogy before the real word; a small number example before a formula; never say easy, obviously, just or simply; if unsure, say so.`;

// examplesPerStyle: 1 keeps the prompt small (~650 words); the second example is for tests and the eval.
function section({ dir = DIR, examplesPerStyle = 1 } = {}) {
  const parts = [RULES];
  for (const s of loadStyles(dir)) {
    parts.push(s.card);
    for (const ex of s.examples.slice(0, examplesPerStyle)) {
      parts.push(ex.turns.map((t) => `${t.text}\n${t.script}`).join('\n'));
    }
  }
  return parts.join('\n\n');
}

module.exports = { loadStyles, parseStyle, section, ORDER };
