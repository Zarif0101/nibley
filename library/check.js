#!/usr/bin/env node
'use strict';

// Validates the study library against the output contract in docs/briefs/cloud-library.md.
// Usage: node library/check.js            strict (every topic needs a note, every asset must be used)
//        node library/check.js --partial  missing notes / unused assets are reported, not failed
//        node library/check.js --only a,b  check only the notes for topics a and b (partial)

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PARTIAL = process.argv.includes('--partial') || process.argv.includes('--only');
// --only id1,id2: check just these notes (implies --partial); for workers writing a batch
const ONLY = process.argv.includes('--only') ? new Set((process.argv[process.argv.indexOf('--only') + 1] || '').split(',')) : null;
const SUBJECTS = ['physics', 'maths', 'chemistry', 'biology', 'computing'];
const ASSET_SUBJECTS = ['physics', 'maths', 'chemistry', 'biology', 'shared', 'everyday', 'computing', 'diagram'];
const ANALOGY_DOMAINS = ['computing', 'maths', 'physics', 'chemistry', 'biology', 'economics', 'learning', 'everyday'];
const LEVELS = ['foundation', '11', '12'];
const LEVEL_RANK = { foundation: 0, 11: 1, 12: 2 };
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEADINGS = [
  'Simple idea',
  'Key formulas',
  'Picture it',
  'Common mistakes',
  'Check questions',
  'Flashcards',
  'Root check',
];
const SVG_STYLE = {
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '3.5',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
};
const MAX_PATHS = 12;
const MAX_SVG_BYTES = 4096;
const MAX_NOTE_WORDS = 400;
const MAX_IDEA_WORDS = 60;
const MAX_SUMMARY_WORDS = 20;

const failures = [];
const warnings = [];
const pending = [];
const fail = (where, msg) => failures.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const words = (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

function readJson(file) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return { missing: true };
  try {
    return { data: JSON.parse(fs.readFileSync(p, 'utf8')) };
  } catch (e) {
    fail(file, `invalid JSON (${e.message})`);
    return { data: null };
  }
}

// ---------- topics ----------
function checkTopics() {
  const { data, missing } = readJson('topics.json');
  if (missing) {
    fail('topics.json', 'file missing');
    return [];
  }
  if (!Array.isArray(data)) {
    fail('topics.json', 'must be an array');
    return [];
  }
  const ids = new Set();
  for (const [i, t] of data.entries()) {
    const where = `topics.json[${i}]${t && t.id ? ` ${t.id}` : ''}`;
    if (!t || typeof t !== 'object') {
      fail(where, 'not an object');
      continue;
    }
    const keys = ['id', 'subject', 'level', 'title', 'summary', 'prereqs', 'assets'];
    for (const k of keys) if (!(k in t)) fail(where, `missing "${k}"`);
    for (const k of Object.keys(t)) if (!keys.includes(k)) fail(where, `unknown field "${k}"`);
    if (typeof t.id !== 'string' || !KEBAB.test(t.id)) fail(where, 'id must be lowercase kebab-case');
    else if (ids.has(t.id)) fail(where, 'duplicate id');
    else ids.add(t.id);
    if (!SUBJECTS.includes(t.subject)) fail(where, `subject must be one of ${SUBJECTS.join('|')}`);
    if (!LEVELS.includes(t.level)) fail(where, `level must be one of ${LEVELS.join('|')}`);
    if (typeof t.title !== 'string' || !t.title.trim()) fail(where, 'title must be a non-empty string');
    if (typeof t.summary !== 'string' || !t.summary.trim()) fail(where, 'summary must be a non-empty string');
    else if (words(t.summary) > MAX_SUMMARY_WORDS) fail(where, `summary has ${words(t.summary)} words (max ${MAX_SUMMARY_WORDS})`);
    for (const k of ['prereqs', 'assets']) {
      if (!Array.isArray(t[k]) || t[k].some((x) => typeof x !== 'string')) fail(where, `${k} must be an array of strings`);
      else if (new Set(t[k]).size !== t[k].length) fail(where, `${k} has duplicates`);
    }
  }

  const byId = new Map(data.filter((t) => t && typeof t.id === 'string').map((t) => [t.id, t]));
  for (const t of byId.values()) {
    if (!Array.isArray(t.prereqs)) continue;
    for (const p of t.prereqs) {
      const where = `topic ${t.id}`;
      if (p === t.id) fail(where, 'lists itself as a prereq');
      else if (!byId.has(p)) fail(where, `prereq "${p}" does not exist`);
      else if (LEVEL_RANK[byId.get(p).level] > LEVEL_RANK[t.level]) fail(where, `prereq "${p}" is level ${byId.get(p).level}, above this topic's level ${t.level}`);
    }
  }

  // cycle check (iterative DFS, colours: 0 new, 1 on stack, 2 done)
  const colour = new Map();
  for (const start of byId.keys()) {
    if (colour.get(start)) continue;
    const stack = [[start, 0]];
    const trail = [];
    colour.set(start, 1);
    trail.push(start);
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const node = byId.get(frame[0]);
      const pre = (Array.isArray(node.prereqs) ? node.prereqs : []).filter((p) => byId.has(p));
      if (frame[1] < pre.length) {
        const next = pre[frame[1]++];
        const c = colour.get(next) || 0;
        if (c === 1) {
          const loop = trail.slice(trail.indexOf(next)).concat(next);
          fail('prereq graph', `cycle: ${loop.join(' -> ')}`);
        } else if (c === 0) {
          colour.set(next, 1);
          trail.push(next);
          stack.push([next, 0]);
        }
      } else {
        colour.set(frame[0], 2);
        trail.pop();
        stack.pop();
      }
    }
  }

  const roots = [...byId.values()].filter((t) => Array.isArray(t.prereqs) && t.prereqs.length === 0);
  if (!roots.length) fail('prereq graph', 'no root topics (topics with no prereqs)');
  for (const r of roots) if (r.level !== 'foundation') fail(`topic ${r.id}`, 'has no prereqs but is not a foundation topic');

  return [...byId.values()];
}

// ---------- assets ----------
function parseAttrs(s, where) {
  const attrs = {};
  const re = /([a-zA-Z:-]+)\s*=\s*"([^"]*)"/g;
  let m;
  let rest = s;
  while ((m = re.exec(s))) {
    if (m[1] in attrs) fail(where, `duplicate attribute ${m[1]}`);
    attrs[m[1]] = m[2];
    rest = rest.replace(m[0], '');
  }
  if (rest.replace(/\/\s*$/, '').trim()) fail(where, `unparsable attribute text "${rest.trim()}"`);
  return attrs;
}

function checkSvg(name, file) {
  const where = `assets/${name}.svg`;
  const buf = fs.readFileSync(file);
  if (buf.length > MAX_SVG_BYTES) fail(where, `${buf.length} bytes (max ${MAX_SVG_BYTES})`);
  const src = buf.toString('utf8').trim();
  if (/<!--|<\?|<!DOCTYPE/i.test(src)) fail(where, 'comments, XML declarations and doctypes are not allowed');
  const open = src.match(/^<svg\b([^>]*)>/);
  if (!open || !src.endsWith('</svg>')) {
    fail(where, 'must be a single <svg>…</svg> element');
    return;
  }
  const svgAttrs = parseAttrs(open[1], where);
  for (const k of Object.keys(svgAttrs)) {
    if (!['xmlns', 'viewBox', ...Object.keys(SVG_STYLE)].includes(k)) fail(where, `attribute "${k}" not allowed on <svg>`);
  }
  if (svgAttrs.xmlns !== 'http://www.w3.org/2000/svg') fail(where, 'xmlns must be http://www.w3.org/2000/svg');
  if (svgAttrs.viewBox !== '0 0 200 200') fail(where, 'viewBox must be "0 0 200 200"');

  const body = src.slice(open[0].length, -'</svg>'.length);
  const tags = body.match(/<[^>]*>/g) || [];
  const leftover = body.replace(/<[^>]*>/g, '').trim();
  if (leftover) fail(where, 'text content is not allowed');
  let paths = 0;
  for (const tag of tags) {
    const m = tag.match(/^<path\b([^>]*?)\/>$/);
    if (!m) {
      fail(where, `only self-closing <path/> elements allowed, found ${tag.slice(0, 40)}`);
      continue;
    }
    paths++;
    const attrs = parseAttrs(m[1], where);
    for (const k of Object.keys(attrs)) {
      if (k !== 'd' && !(k in SVG_STYLE)) fail(where, `attribute "${k}" not allowed on <path>`);
    }
    for (const [k, v] of Object.entries(SVG_STYLE)) {
      const eff = attrs[k] ?? svgAttrs[k];
      if (eff !== v) fail(where, `path ${paths}: ${k} must be "${v}" (got ${eff === undefined ? 'nothing' : `"${eff}"`})`);
    }
    const d = attrs.d || '';
    if (!d.trim()) fail(where, `path ${paths}: empty d`);
    if (!/^[MLHVCSQTAZmlhvcsqtaz0-9eE.,\s-]+$/.test(d)) fail(where, `path ${paths}: d has invalid characters`);
    if (!/^\s*M/i.test(d)) fail(where, `path ${paths}: d must start with a moveto`);
    if (!/[a-z]/.test(d.replace(/e/g, ''))) {
      const nums = (d.match(/-?\d*\.?\d+(e-?\d+)?/gi) || []).map(Number);
      if (nums.some((n) => n < -2 || n > 202)) fail(where, `path ${paths}: coordinates outside the 200x200 viewBox`);
    }
  }
  if (paths === 0) fail(where, 'no paths');
  if (paths > MAX_PATHS) fail(where, `${paths} paths (max ${MAX_PATHS})`);
  // style attributes must be present somewhere for each path (checked above); root-level is preferred.
}

function checkAssets() {
  const dir = path.join(ROOT, 'assets');
  const { data, missing } = readJson('assets/index.json');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)) : [];
  const other = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => !f.endsWith('.svg') && f !== 'index.json') : [];
  for (const f of other) fail(`assets/${f}`, 'unexpected file (only .svg and index.json allowed)');
  if (missing) {
    if (PARTIAL && !files.length) {
      pending.push('assets/index.json not written yet');
      return new Map();
    }
    fail('assets/index.json', 'file missing');
    return new Map();
  }
  if (!Array.isArray(data)) {
    fail('assets/index.json', 'must be an array');
    return new Map();
  }
  const byName = new Map();
  for (const [i, a] of data.entries()) {
    const where = `assets/index.json[${i}]${a && a.name ? ` ${a.name}` : ''}`;
    if (!a || typeof a !== 'object') {
      fail(where, 'not an object');
      continue;
    }
    const keys = ['name', 'subject', 'tags', 'desc', 'anchors'];
    for (const k of keys) if (!(k in a)) fail(where, `missing "${k}"`);
    for (const k of Object.keys(a)) if (!keys.includes(k)) fail(where, `unknown field "${k}"`);
    if (typeof a.name !== 'string' || !KEBAB.test(a.name)) {
      fail(where, 'name must be lowercase kebab-case');
      continue;
    }
    if (byName.has(a.name)) fail(where, 'duplicate name');
    byName.set(a.name, a);
    if (!ASSET_SUBJECTS.includes(a.subject)) fail(where, `subject must be one of ${ASSET_SUBJECTS.join('|')}`);
    if (!Array.isArray(a.tags) || !a.tags.length || a.tags.some((x) => typeof x !== 'string' || !x.trim())) fail(where, 'tags must be a non-empty array of strings');
    if (typeof a.desc !== 'string' || !a.desc.trim()) fail(where, 'desc must be a non-empty string');
    if (!a.anchors || typeof a.anchors !== 'object' || Array.isArray(a.anchors) || !Object.keys(a.anchors).length) {
      fail(where, 'anchors must be an object with at least one named point');
    } else {
      for (const [k, v] of Object.entries(a.anchors)) {
        if (!KEBAB.test(k)) fail(where, `anchor "${k}" must be kebab-case`);
        if (!Array.isArray(v) || v.length !== 2 || v.some((n) => typeof n !== 'number' || n < 0 || n > 200)) fail(where, `anchor "${k}" must be [x, y] inside 0..200`);
      }
    }
    if (!files.includes(a.name)) fail(where, `no file assets/${a.name}.svg`);
  }
  for (const f of files) {
    if (!byName.has(f)) fail(`assets/${f}.svg`, 'not listed in index.json');
    checkSvg(f, path.join(dir, `${f}.svg`));
  }
  return byName;
}

// ---------- notes ----------
function sections(md) {
  const out = [];
  let cur = null;
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^##\s+(.*?)\s*$/);
    if (h && !line.startsWith('###')) {
      cur = { title: h[1], lines: [] };
      out.push(cur);
    } else if (cur) cur.lines.push(line);
  }
  return out;
}

function checkNote(t, assets) {
  const where = `notes/${t.id}.md`;
  const md = fs.readFileSync(path.join(ROOT, 'notes', `${t.id}.md`), 'utf8');
  const total = words(md);
  if (total > MAX_NOTE_WORDS) fail(where, `${total} words (max ${MAX_NOTE_WORDS})`);
  const first = md.split(/\r?\n/)[0];
  if (first !== `# ${t.title}`) fail(where, `first line must be "# ${t.title}"`);
  const secs = sections(md);
  const titles = secs.map((s) => s.title);
  if (titles.join('|') !== HEADINGS.join('|')) {
    fail(where, `headings must be exactly: ${HEADINGS.join(', ')} (found: ${titles.join(', ') || 'none'})`);
    return;
  }
  const S = Object.fromEntries(secs.map((s) => [s.title, s.lines.filter((l) => l.trim())]));

  const idea = S['Simple idea'].join(' ');
  if (!idea) fail(where, 'Simple idea is empty');
  else if (words(idea) > MAX_IDEA_WORDS) fail(where, `Simple idea has ${words(idea)} words (max ${MAX_IDEA_WORDS})`);

  if (!S['Key formulas'].length) fail(where, 'Key formulas is empty (write "none" if there are none)');

  const pic = S['Picture it'];
  if (!pic.length || pic.length > 3) fail(where, `Picture it must be 1-3 lines (found ${pic.length})`);
  const picText = pic.join('\n');
  const refs = [...picText.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  if (!refs.length && t.assets.length) fail(where, 'Picture it names no assets (write asset names in backticks)');
  for (const r of refs) {
    const [name, anchor, ...extra] = r.split('.');
    if (extra.length) {
      fail(where, `Picture it: bad reference \`${r}\``);
      continue;
    }
    if (!assets.has(name)) {
      fail(where, `Picture it: asset \`${name}\` does not exist in assets/index.json`);
      continue;
    }
    if (!t.assets.includes(name)) fail(where, `Picture it: asset \`${name}\` is not in this topic's assets list`);
    if (anchor !== undefined && !(anchor in (assets.get(name).anchors || {}))) fail(where, `Picture it: asset \`${name}\` has no anchor "${anchor}"`);
  }

  const bullets = S['Common mistakes'].filter((l) => /^- \S/.test(l));
  if (bullets.length !== 3 || S['Common mistakes'].length !== 3) fail(where, `Common mistakes must be exactly 3 "- " bullets (found ${bullets.length})`);

  const cq = S['Check questions'];
  const qs = cq.filter((l) => /^\d+\.\s+\S/.test(l));
  const ans = cq.filter((l) => /^\s+Answer:\s*\S/.test(l));
  if (qs.length !== 3 || ans.length !== 3 || cq.length !== 6) fail(where, `Check questions must be 3 numbered questions, each followed by an indented "Answer:" line (found ${qs.length} questions, ${ans.length} answers)`);
  else for (let i = 0; i < 6; i += 2) if (!/^\d+\./.test(cq[i]) || !/^\s+Answer:/.test(cq[i + 1])) fail(where, 'Check questions: each question line must be followed by its Answer: line');

  const fc = S['Flashcards'];
  const okPairs = fc.length === 10 && fc.every((l, i) => (i % 2 ? /^A:\s*\S/ : /^Q:\s*\S/).test(l));
  if (!okPairs) fail(where, `Flashcards must be exactly 5 "Q:" / "A:" line pairs (found ${fc.filter((l) => /^Q:/.test(l)).length} Q, ${fc.filter((l) => /^A:/.test(l)).length} A)`);

  const rc = S['Root check'];
  if (!t.prereqs.length) {
    if (rc.length !== 1 || !/^none\.?$/i.test(rc[0].trim())) fail(where, 'Root check must say "none" for a topic with no prereqs');
  } else {
    const listed = [];
    for (const l of rc) {
      const m = l.match(/^- ([a-z0-9-]+): (.+)$/);
      if (!m) {
        fail(where, `Root check line must look like "- <prereq-id>: <question> Answer: <answer>" (got "${l.slice(0, 50)}")`);
        continue;
      }
      listed.push(m[1]);
      if (!/\S.*\sAnswer:\s*\S/.test(m[2])) fail(where, `Root check for ${m[1]} needs a question and "Answer: ..."`);
    }
    const want = [...t.prereqs].sort().join(',');
    const got = [...listed].sort().join(',');
    if (want !== got) fail(where, `Root check must have one line per prereq (want ${want}; got ${got || 'none'})`);
  }
}

function checkNotes(topics, assets) {
  const dir = path.join(ROOT, 'notes');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const ids = new Set(topics.map((t) => t.id));
  for (const f of files) {
    if (!f.endsWith('.md') || !ids.has(f.slice(0, -3))) fail(`notes/${f}`, 'no matching topic id in topics.json');
  }
  let done = 0;
  const missing = [];
  for (const t of topics) {
    if (ONLY && !ONLY.has(t.id)) continue;
    if (!files.includes(`${t.id}.md`)) {
      missing.push(t.id);
      continue;
    }
    done++;
    checkNote(t, assets);
  }
  if (missing.length) {
    if (PARTIAL) pending.push(`${missing.length} notes not written yet`);
    else for (const id of missing) fail(`notes/${id}.md`, 'missing');
  }
  return done;
}

// ---------- analogies (library/analogies.json): any topic, Teaching-With-Analogies fields ----------
function checkAnalogies(topics, assets) {
  const { data, missing } = readJson('analogies.json');
  if (missing) { if (PARTIAL) pending.push('analogies.json not written yet'); else fail('analogies.json', 'file missing'); return []; }
  if (!Array.isArray(data)) { fail('analogies.json', 'must be an array'); return []; }
  const topicIds = new Set(topics.map((t) => t.id)), ids = new Set();
  const words = (x) => String(x).trim().split(/\s+/).length;
  const req = ['id', 'domain', 'concept', 'keywords', 'analogy', 'mapping', 'breaks', 'assets'], opt = ['topic', 'source'];
  data.forEach((a, i) => {
    const where = `analogies.json[${i}]${a && a.id ? ` ${a.id}` : ''}`;
    if (!a || typeof a !== 'object') return fail(where, 'not an object');
    for (const k of req) if (!(k in a)) fail(where, `missing "${k}"`);
    for (const k of Object.keys(a)) if (!req.includes(k) && !opt.includes(k)) fail(where, `unknown field "${k}"`);
    if (typeof a.id !== 'string' || !KEBAB.test(a.id)) fail(where, 'id must be lowercase kebab-case');
    else if (ids.has(a.id)) fail(where, 'duplicate id'); else ids.add(a.id);
    if (!ANALOGY_DOMAINS.includes(a.domain)) fail(where, `domain must be one of ${ANALOGY_DOMAINS.join('|')}`);
    for (const k of ['concept', 'analogy', 'breaks']) if (typeof a[k] !== 'string' || !a[k].trim()) fail(where, `${k} must be a non-empty string`);
    if (typeof a.analogy === 'string' && words(a.analogy) > 30) fail(where, `analogy has ${words(a.analogy)} words (max 30)`);
    if (typeof a.breaks === 'string' && words(a.breaks) > 30) fail(where, `breaks has ${words(a.breaks)} words (max 30)`);
    if (!Array.isArray(a.keywords) || !a.keywords.length || a.keywords.some((k) => typeof k !== 'string' || !k.trim())) fail(where, 'keywords must be a non-empty array of strings');
    if (!Array.isArray(a.mapping) || a.mapping.length < 2 || a.mapping.length > 4 || a.mapping.some((m) => !Array.isArray(m) || m.length !== 2 || m.some((x) => typeof x !== 'string' || !x.trim()))) fail(where, 'mapping must be 2-4 [familiar, target] string pairs');
    if (!Array.isArray(a.assets) || !a.assets.length) fail(where, 'assets must be a non-empty array');
    else for (const n of a.assets) if (!assets.has(n)) fail(where, `asset "${n}" is not in assets/index.json`);
    if (a.topic !== undefined && !topicIds.has(a.topic)) fail(where, `topic "${a.topic}" is not in topics.json`);
  });
  return data;
}

// ---------- cross checks ----------
function checkUsage(topics, assets, analogies = []) {
  const used = new Set();
  for (const a of analogies) for (const n of a.assets || []) used.add(n);
  for (const t of topics) {
    if (!Array.isArray(t.assets)) continue;
    for (const a of t.assets) {
      used.add(a);
      if (!assets.has(a)) {
        if (PARTIAL && !assets.size) continue;
        fail(`topic ${t.id}`, `asset "${a}" is not in assets/index.json`);
      }
    }
  }
  // Diagram templates are general-purpose: they don't need a topic or analogy to justify them.
  const unused = [...assets.keys()].filter((a) => !used.has(a) && assets.get(a)?.subject !== 'diagram');
  if (unused.length) {
    if (PARTIAL) warn('assets', `not used by any topic: ${unused.join(', ')}`);
    else for (const a of unused) fail(`asset ${a}`, 'not used by any topic or analogy');
  }
  if (PARTIAL && !assets.size && used.size) pending.push(`${used.size} referenced assets not drawn yet`);
}

const topics = checkTopics();
const assets = checkAssets();
const notesDone = topics.length ? checkNotes(topics, assets) : 0;
const analogies = checkAnalogies(topics, assets);
checkUsage(topics, assets, analogies);

const count = (fn) => topics.filter(fn).length;
console.log(`Nibley library check${PARTIAL ? ' (partial)' : ''}`);
console.log(`  topics: ${topics.length} (${SUBJECTS.map((s) => `${s} ${count((t) => t.subject === s)}`).join(', ')}; foundation ${count((t) => t.level === 'foundation')}, 11: ${count((t) => t.level === '11')}, 12: ${count((t) => t.level === '12')})`);
console.log(`  assets: ${assets.size}`);
console.log(`  analogies: ${analogies.length} (${ANALOGY_DOMAINS.map((d) => `${d} ${analogies.filter((a) => a.domain === d).length}`).filter((x) => !/ 0$/.test(x)).join(', ')})`);
console.log(`  notes:  ${notesDone} of ${topics.length}`);
for (const p of pending) console.log(`  pending: ${p}`);
for (const w of warnings) console.log(`  warning: ${w}`);
if (failures.length) {
  console.log(`\nFAIL: ${failures.length} problem${failures.length === 1 ? '' : 's'}`);
  for (const f of failures.slice(0, 200)) console.log(`  - ${f}`);
  if (failures.length > 200) console.log(`  … and ${failures.length - 200} more`);
  process.exit(1);
}
console.log('\nPASS');
