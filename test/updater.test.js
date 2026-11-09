// Updater with real git repos in a temp folder: an "origin" (GitHub) and a user's clone sitting on a release tag.
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const updater = require('../src/updater');

const g = (cwd, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd, stdio: 'pipe' }).toString().trim();
const pkg = (dir, v) => fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'nibley', version: v }));

function world() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-upd-'));
  const origin = path.join(base, 'origin'), user = path.join(base, 'user');
  fs.mkdirSync(origin);
  g(origin, 'init', '-q', '-b', 'main');
  pkg(origin, '1.0.0');
  fs.writeFileSync(path.join(origin, 'app.txt'), 'old');
  g(origin, 'add', '.'); g(origin, 'commit', '-q', '-m', 'one'); g(origin, 'tag', '-a', 'v1.0.0', '-m', 'First release');
  g(base, 'clone', '-q', origin, user);
  g(user, '-c', 'advice.detachedHead=false', 'checkout', '-q', 'tags/v1.0.0');
  const release = (v, notes, file = 'new') => {
    pkg(origin, v);
    fs.writeFileSync(path.join(origin, 'app.txt'), file);
    g(origin, 'commit', '-qam', `release ${v}`); g(origin, 'tag', '-a', `v${v}`, '-m', notes);
  };
  return { origin, user, release };
}

test('versions compare by number, not text', () => {
  assert.equal(updater.newer('v1.10.0', '1.9.3'), true);
  assert.equal(updater.newer('v1.0.0', '1.0.0'), false);
  assert.equal(updater.newer('banana', '1.0.0'), false);
});

test('a marked release updates the user, with its notes; work pushed to main without a tag does not', async () => {
  const w = world();
  g(w.origin, 'commit', '-q', '--allow-empty', '-m', 'work in progress'); // pushed to main, not released
  assert.equal((await updater.check({ root: w.user, testLine: 'exit 0' })).state, 'current');
  w.release('1.1.0', "What's new: answers start faster.");
  const r = await updater.check({ root: w.user, testLine: 'exit 0' });
  assert.equal(r.state, 'updated');
  assert.equal(r.to, '1.1.0');
  assert.match(r.notes, /answers start faster/);
  assert.equal(fs.readFileSync(path.join(w.user, 'app.txt'), 'utf8'), 'new');
  assert.equal((await updater.check({ root: w.user, testLine: 'exit 0' })).state, 'current'); // once
});

test("a release whose tests fail is rolled back; the user's settings file is never touched", async () => {
  const w = world();
  fs.writeFileSync(path.join(w.user, 'settings.json'), '{"name":"Rafi"}'); // untracked, like the real one (gitignored)
  w.release('1.1.0', 'Broken', 'broken');
  const logs = [];
  const r = await updater.check({ root: w.user, testLine: 'exit 1', log: (e) => logs.push(e.ev) });
  assert.equal(r.state, 'failed');
  assert.equal(fs.readFileSync(path.join(w.user, 'app.txt'), 'utf8'), 'old');
  assert.equal(updater.version(w.user), '1.0.0');
  assert.equal(fs.readFileSync(path.join(w.user, 'settings.json'), 'utf8'), '{"name":"Rafi"}');
  assert.ok(logs.includes('update_rolled_back'));
});

test("a developer's copy on a branch is never updated", async () => {
  const w = world();
  g(w.user, 'checkout', '-q', 'main');
  w.release('2.0.0', 'Big');
  assert.equal((await updater.check({ root: w.user, testLine: 'exit 0' })).state, 'dev');
});

test('no internet (origin gone): failed, nothing changed', async () => {
  const w = world();
  fs.rmSync(w.origin, { recursive: true, force: true });
  const r = await updater.check({ root: w.user, testLine: 'exit 0' });
  assert.equal(r.state, 'failed');
  assert.equal(updater.version(w.user), '1.0.0');
});
