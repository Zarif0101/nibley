const test = require('node:test');
const assert = require('node:assert/strict');
const { check, isYes } = require('../src/gate');

const ask = { mode: 'ask', apps: { chrome: 'chrome', notepad: 'notepad' } };
const auto = { ...ask, mode: 'auto' };

test('ask mode asks, auto mode does not', () => {
  const a = { kind: 'key', name: 'media_play_pause' };
  assert.deepEqual(check(a, {}, ask), { ok: true, ask: true, describe: 'pause or play the video' });
  assert.deepEqual(check(a, {}, auto), { ok: true, ask: false, describe: 'pause or play the video' });
  assert.equal(check(a, {}, {}).ask, true, 'default is ask');
});

test('no passwords', () => {
  for (const s of [ask, auto]) assert.equal(check({ kind: 'type', text: 'hunter2' }, { isPassword: true }, s).ok, false);
  assert.equal(check({ kind: 'type', text: 'hello' }, { isPassword: false }, auto).ok, true);
});

test('no payment details typed', () => {
  assert.equal(check({ kind: 'type', text: '4111 1111 1111 1111' }, {}, auto).ok, false);
  assert.equal(check({ kind: 'type', text: '4111-1111-1111-1111' }, {}, auto).ok, false);
  assert.equal(check({ kind: 'type', text: 'chapter 12 page 340' }, {}, auto).ok, true);
});

test('no deleting', () => {
  for (const name of ['Delete', 'Remove from playlist', 'Move to Trash', 'Discard draft', 'Uninstall']) {
    for (const s of [ask, auto]) assert.equal(check({ kind: 'click', x: 1, y: 1 }, { name }, s).ok, false, name);
  }
  assert.equal(check({ kind: 'key', name: 'delete' }, {}, auto).ok, false);
  assert.equal(check({ kind: 'key', name: 'shift+delete' }, {}, auto).ok, false);
});

test('no sending or posting', () => {
  for (const name of ['Send', 'Post', 'Publish', 'Submit', 'Reply', 'Comment', 'Share', 'Tweet']) {
    const r = check({ kind: 'click', x: 1, y: 1 }, { name }, auto);
    assert.equal(r.ok, false, name);
  }
  assert.equal(check({ kind: 'click', x: 1, y: 1 }, { name: 'Send' }, auto).say, "I can't press Send, that's yours to do.");
  assert.equal(check({ kind: 'type', text: 'hi there\n' }, {}, auto).ok, false);
});

test('no payments', () => {
  for (const name of ['Pay now', 'Buy', 'Checkout', 'Purchase', 'Place order', 'Subscribe', 'Donate']) {
    assert.equal(check({ kind: 'click', x: 1, y: 1 }, { name }, auto).ok, false, name);
  }
  assert.equal(check({ kind: 'open_url', url: 'https://shop.example.com/checkout' }, {}, auto).ok, false);
});

test('safe clicks pass, unknown element allowed', () => {
  assert.deepEqual(check({ kind: 'click', x: 1, y: 1 }, { name: 'Subtitles/closed captions (c)' }, auto), { ok: true, ask: false, describe: 'click Subtitles/closed captions (c)' });
  assert.deepEqual(check({ kind: 'click', x: 1, y: 1 }, { name: '' }, auto), { ok: true, ask: false, describe: 'click there' });
  assert.equal(check({ kind: 'click', x: 1, y: 1 }, { name: '' }, ask).ask, true);
});

test('key allowlist', () => {
  for (const k of ['media_play_pause', 'space', 'k', 'f', 'left', 'right', 'up', 'down', 'pageup', 'pagedown', 'home', 'end', 'tab', 'escape']) {
    assert.equal(check({ kind: 'key', name: k }, {}, auto).ok, true, k);
  }
  for (const k of ['enter', 'ctrl+w', 'alt+f4', 'win', 'backspace']) assert.equal(check({ kind: 'key', name: k }, {}, auto).ok, false, k);
});

test('URL schemes', () => {
  assert.equal(check({ kind: 'open_url', url: 'https://www.youtube.com/watch?v=1' }, {}, auto).describe, 'open youtube.com in a new tab');
  assert.equal(check({ kind: 'open_url', url: 'http://example.com' }, {}, auto).ok, true);
  for (const u of ['file:///C:/Windows', 'javascript:alert(1)', 'ms-settings:privacy', 'not a url', 'C:\\x.exe']) {
    assert.equal(check({ kind: 'open_url', url: u }, {}, auto).ok, false, u);
  }
});

test('app allowlist and scroll', () => {
  assert.equal(check({ kind: 'open_app', name: 'chrome' }, {}, auto).ok, true);
  // opening a site or app asks first even in Auto mode (NEXT-ROUND Q15)
  assert.equal(check({ kind: 'open_app', name: 'chrome' }, {}, auto).ask, true);
  assert.equal(check({ kind: 'open_url', url: 'https://youtube.com' }, {}, auto).ask, true);
  assert.equal(check({ kind: 'open_app', name: 'cmd' }, {}, auto).ok, false);
  assert.equal(check({ kind: 'open_app', name: 'constructor' }, {}, auto).ok, false);
  assert.equal(check({ kind: 'scroll', dir: 'down', n: 3 }, {}, auto).ok, true);
  assert.equal(check({ kind: 'scroll', dir: 'sideways', n: 3 }, {}, auto).ok, false);
  assert.equal(check({ kind: 'format_disk' }, {}, auto).ok, false);
});

test('isYes', () => {
  for (const t of ['Yes.', 'yeah', 'Yep, do it', 'ok', 'Okay go', 'sure', 'Do it.', 'go ahead']) assert.equal(isYes(t), true, t);
  for (const t of ['no', 'nope', 'wait', '', 'yesterday was fine', 'not yet']) assert.equal(isYes(t), false, t);
});
