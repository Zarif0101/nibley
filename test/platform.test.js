const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.NIBLEY_FAKE = '1';
const platform = require('../src/platform');
const { parseAll } = require('../src/script');
const gate = require('../src/gate');

const CONTRACT = ['onPtt', 'click', 'type', 'key', 'scroll', 'elementAt', 'focusedIsPassword', 'onMouseClick', 'openUrl', 'openApp'];

test('fake and windows platforms export the whole contract', () => {
  const win = require('../src/platform/windows');
  for (const name of CONTRACT) {
    assert.equal(typeof platform[name], 'function', `fake.${name}`);
    assert.equal(typeof win[name], 'function', `windows.${name}`);
  }
});

test('a full fake turn: script -> gate -> platform', async () => {
  platform.reset();
  platform.elements.push({ box: [700, 500, 90, 36], name: 'Send' }, { box: [744, 546, 48, 40], name: 'Subtitles/closed captions (c)' });
  const script = 'say Turning on captions.\naction click 768 566\naction click 745 518\naction key media_play_pause\naction type hello\naction open_url file:///C:/x\n';
  const spoken = [];
  for (const cmd of parseAll(script)) {
    if (cmd.type === 'say') { spoken.push(cmd.text); continue; }
    const info = cmd.kind === 'click' ? await platform.elementAt(cmd.x, cmd.y) : cmd.kind === 'type' ? { isPassword: await platform.focusedIsPassword() } : {};
    const d = gate.check(cmd, info, { mode: 'auto', apps: {} });
    if (!d.ok) { spoken.push(d.say); continue; }
    if (cmd.kind === 'click') await platform.click(cmd.x, cmd.y);
    if (cmd.kind === 'key') await platform.key(cmd.name);
    if (cmd.kind === 'type') await platform.type(cmd.text);
  }
  assert.deepEqual(platform.calls, [['click', 768, 566], ['key', 'media_play_pause'], ['type', 'hello']]);
  assert.deepEqual(spoken, ['Turning on captions.', "I can't press Send, that's yours to do.", 'I can only open web links.']);

  platform.reset();
  platform.setFocusedPassword(true);
  const d = gate.check({ kind: 'type', text: 'x' }, { isPassword: await platform.focusedIsPassword() }, { mode: 'auto' });
  assert.equal(d.ok, false);
});

test('fake click watcher: wait_click advances on a near click only', () => {
  const hits = [];
  const stop = platform.onMouseClick((x, y) => { if (Math.hypot(x - 768, y - 566) <= 40) hits.push([x, y]); });
  platform.emitClick(100, 100);
  platform.emitClick(780, 570);
  stop();
  platform.emitClick(768, 566);
  assert.deepEqual(hits, [[780, 570]]);
});

test('only src/platform/ touches the OS', () => {
  const files = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'platform') walk(p); } else if (/\.(js|html)$/.test(e.name)) files.push(p);
  });
  walk(path.join(__dirname, '..', 'src'));
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    assert.ok(!/process\.platform|powershell/i.test(src), `${path.relative(process.cwd(), f)} touches the OS directly`);
  }
});
