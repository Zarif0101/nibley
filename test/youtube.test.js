// Bridge server for the Chrome extension: only the extension gets in, the right video and transcript part come out.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const yt = require('../src/youtube');

const TOKEN = 'a'.repeat(32);
const vault = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-yt-'));
let port;
const post = (body, { token = TOKEN, origin = 'chrome-extension://abc' } = {}) => fetch(`http://127.0.0.1:${port}/state`, {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-nibley-token': token, origin }, body: JSON.stringify(body),
}).then((r) => r.status);
const state = (tabId, s) => post({ kind: 'state', tabId, state: { title: 'Lecture', t: 130, paused: true, duration: 600, rate: 1, visible: true, ...s } });

test.before(async () => { port = await yt.start({ port: 0, token: TOKEN, vaultPath: vault }); });
test.after(() => { yt.stop(); fs.rmSync(vault, { recursive: true, force: true }); });

test('youtube: only the extension gets in', async () => {
  assert.equal(await post({ kind: 'gone', tabId: 1 }, { token: 'b'.repeat(32) }), 403);
  assert.equal(await post({ kind: 'gone', tabId: 1 }, { token: '' }), 403);
  assert.equal(await post({ kind: 'gone', tabId: 1 }, { origin: 'https://evil.example' }), 403);
  assert.equal(await post({ kind: 'gone', tabId: 1 }), 200);
});

test('youtube: transcript part around the current time, saved to the vault', async () => {
  const lines = Array.from({ length: 60 }, (_, i) => [i * 5, `line at ${i * 5}`]); // one line every 5 s, 0-295 s
  assert.equal(await post({ kind: 'transcript', tabId: 1, videoId: 'aircAruvnKk', title: 'Lecture', duration: 600, lines }), 200);
  assert.equal(await state(1, { videoId: 'aircAruvnKk' }), 200);
  const ctx = yt.context();
  assert.match(ctx, /^\[Video: "Lecture" at 2:10 of 10:00, paused\]/);
  assert.match(ctx, /\[Transcript 0:10-2:40\]/);
  assert.ok(ctx.includes('0:10 line at 10') && ctx.includes('2:40 line at 160'), ctx);
  assert.ok(!ctx.includes('line at 5\n') && !ctx.includes('line at 165'), 'lines outside the window left out');
  assert.ok(fs.existsSync(path.join(vault, 'nibley', 'videos', 'aircAruvnKk.json')));
});

test('youtube: the visible tab wins; gone and bad ids are handled', async () => {
  await state(2, { videoId: 'bbbbbbbbbbb', title: 'Hidden', visible: false });
  assert.equal(yt.current().videoId, 'aircAruvnKk');
  await state(3, { videoId: 'ccccccccccc', title: 'Newest' });
  assert.equal(yt.current().videoId, 'ccccccccccc');
  assert.match(yt.context(), /No transcript/);
  await post({ kind: 'gone', tabId: 3 });
  assert.equal(yt.current().videoId, 'aircAruvnKk');
  await post({ kind: 'transcript', tabId: 1, videoId: '../../evil1', lines: [[0, 'x']] }); // not a video id: ignored
  assert.ok(!fs.existsSync(path.join(vault, 'nibley', 'evil1.json')) && !fs.existsSync(path.join(vault, 'evil1.json')));
  await post({ kind: 'gone', tabId: 1 });
  assert.equal(yt.current(), null);
  assert.equal(yt.context(), null);
});

test('youtube: clock format', () => {
  assert.equal(yt.clock(0), '0:00');
  assert.equal(yt.clock(252.7), '4:12');
  assert.equal(yt.clock(3725), '1:02:05');
});
