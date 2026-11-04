// Vault memory (BUILD-PLAN 4.10): learning.md, rules.md, changelog.md, and the learner run.
// Writes only inside <vault>/nibley/, always temp file + rename.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { cleanEnv } = require('./brain');

const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
function write(f, text) { fs.writeFileSync(`${f}.tmp`, text); fs.renameSync(`${f}.tmp`, f); }
const today = () => new Date().toLocaleDateString('sv');
const stamp = () => new Date().toLocaleString('sv').slice(0, 16);
const oneLine = (s, max = 200) => String(s || '').replace(/[\r\n|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const files = (vault) => {
  const d = path.join(vault, 'nibley');
  return { learning: path.join(d, 'learning.md'), rules: path.join(d, 'rules.md'), changelog: path.join(d, 'changelog.md') };
};
const append = (f, lines) => write(f, read(f).replace(/\s*$/, '\n') + lines.join('\n') + '\n');

function addLearning(vault, lines) {
  const clean = lines.map((l) => oneLine(l)).filter(Boolean);
  if (clean.length) append(files(vault).learning, clean.map((l) => `- ${today()}: ${l}`));
  return clean.length;
}

// ops: [{op:'add'|'remove', text, reason}]. Each applied change is logged in changelog.md.
function changeRules(vault, ops) {
  const f = files(vault);
  let rules = read(f.rules);
  const log = [];
  for (const o of ops) {
    const text = oneLine(o.text), reason = oneLine(o.reason, 120) || 'learner';
    if (!text) continue;
    const lines = rules.split(/\r?\n/);
    const i = lines.findIndex((l) => l.replace(/^\s*-\s+/, '').trim().toLowerCase() === text.toLowerCase());
    if (o.op === 'add' && i < 0) rules = rules.replace(/\s*$/, '\n') + `- ${text}\n`;
    else if (o.op === 'remove' && i >= 0) { lines.splice(i, 1); rules = lines.join('\n'); }
    else continue;
    log.push(`- ${stamp()} | ${o.op} | ${text} | ${reason}`);
  }
  if (log.length) { write(f.rules, rules); append(f.changelog, log); }
  return log.length;
}

// Reverts the newest change that isn't undone yet. Returns a short description or null.
function undoLast(vault) {
  const f = files(vault);
  const lines = read(f.changelog).split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/^- [\d-]+ [\d:]+ \| (add|remove) \| (.*?) \| .*$/);
    if (!m || /\(undone /.test(lines[i])) continue;
    const [, op, text] = m;
    let rules = read(f.rules);
    if (op === 'add') rules = rules.split(/\r?\n/).filter((l) => l.replace(/^\s*-\s+/, '').trim() !== text).join('\n');
    else rules = rules.replace(/\s*$/, '\n') + `- ${text}\n`;
    write(f.rules, rules);
    lines[i] += ` (undone ${stamp()})`;
    write(f.changelog, lines.join('\n'));
    return `${op === 'add' ? 'removed' : 'restored'} "${text}"`;
  }
  return null;
}

const LEARNER = `You update a study buddy's memory about its student, Zarif, after one study session.
You get the session's questions and answers and the current teaching rules.
Reply with ONLY one JSON object, no other text:
{"learning": ["..."], "rules": [{"op": "add" or "remove", "text": "...", "reason": "..."}], "ask": null}
- learning: 1 to 3 short lines (max 20 words each): what he studied, what confused him, which analogy or style worked.
- rules: change the teaching rules only with clear evidence from this session (for example he asked for simpler words twice). Usually []. "remove" text must match an existing rule exactly.
- ask: one short question that would help teach him better next time, or null. Only if it is useful.`;

function runClaude({ claudePath, system, input, timeoutMs = 90e3 }) {
  return new Promise((resolve, reject) => {
    const file = path.join(os.tmpdir(), `nibley-learner-${process.pid}.md`);
    fs.writeFileSync(file, system);
    const c = spawn(claudePath, ['-p', '--model', 'haiku', '--setting-sources', '', '--strict-mcp-config', '--tools', '', '--disable-slash-commands',
      '--no-session-persistence', '--system-prompt-file', file, '--output-format', 'json'], { shell: false, windowsHide: true, env: cleanEnv() });
    let out = '';
    const timer = setTimeout(() => { c.kill(); reject(new Error('learner timeout')); }, timeoutMs);
    c.stdout.on('data', (d) => (out += d));
    c.on('error', reject);
    c.on('exit', () => {
      clearTimeout(timer);
      fs.rm(file, () => {});
      try { resolve(JSON.parse(out).result || ''); } catch { reject(new Error(`learner output not JSON: ${out.slice(0, 200)}`)); }
    });
    c.stdin.end(input);
  });
}

// turns: [{q, a}]. Returns {learning, rules, ask} counts/question, or throws on malformed output.
async function learn({ vault, claudePath, turns }) {
  const input = `Current rules:\n${read(files(vault).rules)}\n\nSession:\n${turns.map((t, i) => `${i + 1}. Zarif: ${t.q}\n   Nibley: ${t.a}`).join('\n')}`;
  const text = await runClaude({ claudePath, system: LEARNER, input });
  const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  const learning = Array.isArray(json.learning) ? json.learning.slice(0, 3) : [];
  const rules = (Array.isArray(json.rules) ? json.rules : []).filter((r) => r && ['add', 'remove'].includes(r.op)).slice(0, 2);
  return {
    learning: addLearning(vault, learning),
    rules: changeRules(vault, rules),
    ask: typeof json.ask === 'string' && json.ask.trim() ? oneLine(json.ask, 160) : null,
  };
}

module.exports = { addLearning, changeRules, undoLast, learn };
