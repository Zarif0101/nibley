// Mark a release: every user's Nibley updates to it by itself (src/updater.js). Run only when Zarif says "release this".
//   node scripts/release.js 1.1.0 "What's new, in one plain sentence."
// Checks: on main, nothing uncommitted, version above the current one, unit tests pass. Then: bump the version,
// commit, annotated tag with the notes (users see them after updating), push main and the tag.
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { newer, version } = require('../src/updater');

const root = path.join(__dirname, '..');
const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: root, stdio: 'pipe', ...opts }).toString().trim();
const cmd = (line) => sh(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', line]);
const stop = (why) => { console.error(`NOT RELEASED: ${why}`); process.exit(1); };

const [v, ...rest] = process.argv.slice(2);
const notes = rest.join(' ').trim();
if (!/^\d+\.\d+\.\d+$/.test(v || '') || !notes) stop('usage: node scripts/release.js 1.1.0 "What\'s new, one plain sentence."');
if (sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']) !== 'main') stop('not on branch main');
if (sh('git', ['status', '--porcelain', '--untracked-files=no'])) stop('there are uncommitted changes; commit them first'); // new untracked files aren't part of a release
const cur = version(root);
if (!newer(v, cur)) stop(`${v} is not above the current version ${cur}`);
try { cmd('npm test 2>&1'); } catch (e) { stop(`unit tests fail:\n${String(e.stdout).slice(-600)}`); }

cmd(`npm version ${v} --no-git-tag-version 2>&1`);
sh('git', ['commit', '-qam', `Release v${v}: ${notes}`]);
sh('git', ['tag', '-a', `v${v}`, '-m', notes]);
sh('git', ['push', '-q', 'origin', 'main']);
sh('git', ['push', '-q', 'origin', `v${v}`]);
console.log(`RELEASED v${v}. Users update the next time Nibley starts (or within 6 hours).`);
