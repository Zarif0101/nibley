// Lecture ear: what gets sent to Groq, what is kept, and the block Claude sees.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ear = require('../src/ear');

const vault = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-ear-'));
const OWN = 'C:#Nibley#electron.exe';
let sent, mic, reply, on;
function setup() {
  sent = [];
  mic = [OWN];
  reply = 'so the gradient points uphill';
  on = true;
  ear.start({
    transcribe: async (buf, o) => { sent.push(o); await new Promise((r) => setTimeout(r, 30)); if (reply instanceof Error) throw reply; return reply; },
    micUsers: async () => mic,
    foreground: async () => ({ title: 'Gradient descent - YouTube - Brave' }),
    ownMic: (n) => n === OWN,
    enabled: () => on,
    vaultPath: vault,
  });
}
const piece = (o = {}) => ({ buf: Buffer.from('x'), t0: Date.now() - 30e3, t1: Date.now(), loudMs: 20000, ...o });

test.after(() => fs.rmSync(vault, { recursive: true, force: true }));

test('ear: a piece with sound is sent and shows up as heard', async () => {
  setup();
  assert.equal(await ear.onPiece(piece()), 'sent');
  await ear.settled(1000);
  const ctx = ear.context();
  assert.match(ctx, /^\[On screen: "Gradient descent - YouTube - Brave"\]\n\[Heard in the last 2 min\]\n0:30 ago {2}so the gradient points uphill$/);
  assert.equal(sent.length, 1);
  assert.ok(sent[0].prompt.startsWith('A lecture'), 'lecture prompt for Whisper');
  const day = new Date().toLocaleDateString('sv');
  assert.match(fs.readFileSync(path.join(vault, 'nibley', 'sessions', `${day}.md`), 'utf8'), /· Gradient descent - YouTube - Brave · so the gradient points uphill/);
});

test('ear: quiet pieces, calls and the off switch never reach Groq', async () => {
  setup();
  assert.equal(await ear.onPiece(piece({ loudMs: ear.MIN_LOUD_MS - 1 })), 'quiet');
  mic = [OWN, 'C:#Program Files#Zoom#bin#Zoom.exe'];
  assert.equal(await ear.onPiece(piece()), 'call');
  mic = [OWN];
  on = false;
  assert.equal(await ear.onPiece(piece()), 'off');
  assert.equal(sent.length, 0);
  assert.equal(ear.context(), null);
});

test('ear: Whisper filler and old lines are left out; the next piece gets the last words as a prompt', async () => {
  setup();
  reply = 'Thank you.';
  await ear.onPiece(piece());
  await ear.settled(1000);
  assert.equal(ear.context(), null, 'filler on music or noise is dropped');
  reply = 'first the cost function';
  await ear.onPiece(piece({ t0: Date.now() - 200e3, t1: Date.now() - 170e3 })); // ended 2:50 ago: outside 2 min
  await ear.settled(1000);
  assert.equal(ear.context(), null);
  reply = 'then the gradient';
  await ear.onPiece(piece());
  await ear.settled(1000);
  assert.ok(sent.at(-1).prompt.endsWith('first the cost function'), sent.at(-1).prompt);
  assert.ok(ear.context().includes('then the gradient') && !ear.context().includes('cost function'));
});

test('ear: Groq rate limit pauses sending for a minute', async () => {
  setup();
  reply = Object.assign(new Error('rate'), { kind: 'rate' });
  await ear.onPiece(piece());
  await ear.settled(1000);
  assert.equal(await ear.onPiece(piece()), 'groq_limit');
  assert.equal(sent.length, 1);
});

test('ear: settled waits for a piece still being transcribed', async () => {
  setup();
  ear.onPiece(piece());
  await new Promise((r) => setTimeout(r, 5)); // the piece is with "Groq" now
  assert.equal(ear.context(), null);
  await ear.settled(1000);
  assert.ok(ear.context());
});
