const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const insights = require('../src/insights');

const L = (o) => JSON.stringify({ t: '2026-11-08T10:00:00Z', ...o });
const DAY = [
  L({ ev: 'start' }), L({ ev: 'turn', ptt_up: 1000, first_audio: 3000 }), L({ ev: 'turn', ptt_up: 1000, first_audio: 12000 }), L({ ev: 'turn', ptt_up: 500 }),
  L({ ev: 'line_voice', src: 'edge' }), L({ ev: 'line_voice', src: 'piper' }), L({ ev: 'claude_error', kind: 'limit', detail: 'You hit your limit' }),
  L({ ev: 'study_open', video: 'aaaaaaaaaaa' }), L({ ev: 'study_open', video: 'aaaaaaaaaaa' }), L({ ev: 'study_analyzed', video: 'aaaaaaaaaaa' }),
  L({ ev: 'rating', helpful: false }), L({ ev: 'transcript', videoId: 'x', title: 'Secret lecture title' }), 'half a line {',
].join('\n');

test('report: counts only; no titles, no error text, no question words', () => {
  const s = insights.summarize(DAY);
  assert.equal(s.questions, 3);
  assert.equal(s.wait.median, 11000);
  const text = insights.reportText('2026-11-08', s, { brain: 'gemini', version: '1.1.0' });
  assert.match(text, /Started 1 times, 3 questions/);
  assert.match(text, /claude_error \(limit\): 1/);
  assert.match(text, /videos with a study page: 1, Analyze this video: 1/);
  assert.match(text, /0 helpful, 1 not helpful/);
  assert.doesNotMatch(text, /Secret|hit your limit/);
});

test('sending: nothing without a yes; then profile once and each finished day once; today waits', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-ins-'));
  fs.writeFileSync(path.join(dir, 'nibley-2026-11-07.log'), DAY);
  fs.writeFileSync(path.join(dir, 'nibley-2026-11-08.log'), L({ ev: 'ready' })); // a day without use: marked done, nothing sent
  const today = new Date().toLocaleDateString('sv');
  fs.writeFileSync(path.join(dir, `nibley-${today}.log`), DAY);
  const mails = [];
  const send = async (kind, message) => { mails.push({ kind, message }); return { ok: true }; };
  const settings = { profile: { studying: 'HSC', age: 'under 18', heard: null } };
  assert.equal(await insights.sendDue({ settings, save() {}, logDir: dir, send, version: '1.1.0' }), 0);
  settings.shareReports = false;
  assert.equal(await insights.sendDue({ settings, save() {}, logDir: dir, send, version: '1.1.0' }), 0);
  settings.shareReports = true;
  assert.equal(await insights.sendDue({ settings, save() {}, logDir: dir, send, version: '1.1.0' }), 2);
  assert.deepEqual(mails.map((m) => m.kind), ['new user profile', 'daily report']);
  assert.match(mails[0].message, /Studying for: HSC\nAge range: under 18\nHeard about Nibley from: skipped/);
  assert.match(mails[1].message, /^Day: 2026-11-07/);
  assert.match(settings.installId, /^[0-9a-f]{6}$/);
  assert.equal(await insights.sendDue({ settings, save() {}, logDir: dir, send, version: '1.1.0' }), 0); // once
});

test('offline: the day stays pending and goes next time', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-ins-'));
  fs.writeFileSync(path.join(dir, 'nibley-2026-11-07.log'), DAY);
  const settings = { shareReports: true };
  assert.equal(await insights.sendDue({ settings, save() {}, logDir: dir, send: async () => ({ ok: false }), version: '1' }), 0);
  assert.equal(await insights.sendDue({ settings, save() {}, logDir: dir, send: async () => ({ ok: true }), version: '1' }), 1);
});
