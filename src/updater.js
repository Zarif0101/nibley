// Automatic updates to marked releases (brainstorm 2026-11-09-auto-update, Zarif: "only marked releases", "automatically").
// A user's Nibley is a git clone sitting on a release tag (setup.ps1 puts it there). Zarif's own copy is on branch main:
// a copy on a branch is never updated. Update = fetch tags, newest vX.Y.Z above package.json's version, checkout,
// npm install only when package files changed, unit tests; if the tests fail, back to the old commit.
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const run = (cmd, args, cwd, timeout = 120e3) => new Promise((resolve) => {
  execFile(cmd, args, { cwd, timeout, windowsHide: true, maxBuffer: 20e6 }, (err, stdout, stderr) =>
    resolve({ ok: !err, code: err ? (err.code ?? 1) : 0, out: String(stdout).trim(), err: String(stderr).trim() }));
});
const git = (root, ...args) => run('git', args, root, 60e3);
const cmd = (root, line, timeout) => run(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', line], root, timeout); // npm is a .cmd on Windows

const parse = (v) => (String(v).match(/^v?(\d+)\.(\d+)\.(\d+)$/) || []).slice(1).map(Number);
function newer(a, b) { // is version a above version b?
  const x = parse(a), y = parse(b);
  if (x.length !== 3 || y.length !== 3) return false;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
}
const version = (root) => JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;

// The newest release tag on GitHub, or null. Exported for setup and tests.
async function latestTag(root) {
  const f = await git(root, 'fetch', '--tags', '--force', '--quiet', 'origin');
  if (!f.ok) return { error: `fetch: ${f.err.slice(0, 160)}` };
  const tags = (await git(root, 'tag', '-l', 'v*')).out.split('\n').filter((t) => parse(t).length === 3);
  return { tag: tags.sort((a, b) => (newer(a, b) ? -1 : newer(b, a) ? 1 : 0))[0] || null };
}

// opts: {root, log, testLine?: shell line that must pass after updating (default: npm test)}
// Returns {state: 'dev' | 'current' | 'updated' | 'failed', from, to, notes, why}
async function check({ root, log = () => {}, testLine = 'npm test' }) {
  if ((await git(root, 'symbolic-ref', '-q', 'HEAD')).ok) return { state: 'dev' }; // on a branch: a developer's copy
  const from = version(root);
  const { tag, error } = await latestTag(root);
  if (error) { log({ ev: 'update_check_failed', why: error }); return { state: 'failed', from, why: error }; }
  if (!tag || !newer(tag, from)) return { state: 'current', from };
  const prev = (await git(root, 'rev-parse', 'HEAD')).out;
  const back = async (why) => {
    await git(root, 'checkout', '-f', '--quiet', prev);
    log({ ev: 'update_rolled_back', from, to: tag, why: String(why).slice(0, 200) });
    return { state: 'failed', from, to: tag, why };
  };
  const co = await git(root, '-c', 'advice.detachedHead=false', 'checkout', '-f', '--quiet', `tags/${tag}`);
  if (!co.ok) return back(`checkout: ${co.err}`);
  const changed = (await git(root, 'diff', '--name-only', prev, 'HEAD')).out.split('\n');
  if (changed.some((f) => /^package(-lock)?\.json$/.test(f))) {
    const i = await cmd(root, 'npm install --no-fund --no-audit 2>&1', 600e3);
    if (!i.ok) return back(`npm install: ${i.out.slice(-200)}`);
    if (!fs.existsSync(path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'))) await cmd(root, 'node node_modules\\electron\\install.js 2>&1', 600e3);
  }
  if (testLine) {
    const t = await cmd(root, `${testLine} 2>&1`, 300e3);
    if (!t.ok) return back(`tests: ${t.out.slice(-200)}`);
  }
  const notes = (await git(root, 'tag', '-l', '--format=%(contents)', tag)).out.split('\n').filter(Boolean).join(' ').slice(0, 300);
  log({ ev: 'updated', from, to: tag });
  return { state: 'updated', from, to: tag.replace(/^v/, ''), notes };
}

module.exports = { check, latestTag, newer, version };
