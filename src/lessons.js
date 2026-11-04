// Saved lessons (BUILD-PLAN 4.11): <vault>/nibley/lessons/YYYY-MM-DD-<slug>/ with shot.png, script.txt, meta.json.
const fs = require('node:fs');
const path = require('node:path');

const root = (vault) => path.join(vault, 'nibley', 'lessons');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'lesson';

function save({ vault, png, script, title, question }) {
  const date = new Date();
  const base = path.join(root(vault), `${date.toLocaleDateString('sv')}-${slug(title)}`);
  let dir = base;
  for (let n = 2; fs.existsSync(dir); n++) dir = `${base}-${n}`;
  const tmp = `${dir}.tmp`;
  fs.mkdirSync(tmp, { recursive: true });
  fs.writeFileSync(path.join(tmp, 'shot.png'), png);
  fs.writeFileSync(path.join(tmp, 'script.txt'), script);
  fs.writeFileSync(path.join(tmp, 'meta.json'), JSON.stringify({ title, date: date.toISOString(), question }, null, 2));
  fs.renameSync(tmp, dir); // whole lesson appears at once
  return dir;
}

// Newest first: [{dir, title, date, question}]
function list(vault) {
  let names = [];
  try { names = fs.readdirSync(root(vault), { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.endsWith('.tmp')).map((d) => d.name); } catch { return []; }
  return names.map((n) => {
    const dir = path.join(root(vault), n);
    try { return { dir, ...JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')) }; } catch { return null; }
  }).filter(Boolean).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

const load = (dir) => ({
  png: fs.readFileSync(path.join(dir, 'shot.png')),
  script: fs.readFileSync(path.join(dir, 'script.txt'), 'utf8'),
  meta: JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')),
});

module.exports = { save, list, load, root };
