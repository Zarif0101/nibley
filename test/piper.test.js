// Needs the Piper download in piper/ (gitignored); skipped when it's missing.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const piper = require('../src/piper');

const exe = path.join(__dirname, '..', 'piper', 'piper.exe');
const model = path.join(__dirname, '..', 'piper', 'voices', 'en_US-lessac-medium.onnx');

test('piper: sentences come back as WAV, in order, after a timeout too', { skip: !fs.existsSync(exe) && 'piper not installed' }, async () => {
  assert.equal(piper.start(exe, model), true);
  await assert.rejects(piper.synth('A long sentence that cannot finish in one millisecond.', 1), /no audio/);
  const short = await piper.synth('Hi.');
  const long = await piper.synth('Think of the heart as two pumps side by side, one for the lungs and one for the body.');
  for (const b of [short, long]) assert.equal(b.subarray(0, 4).toString(), 'RIFF');
  assert.ok(long.length > short.length * 2, `long ${long.length} vs short ${short.length}: outputs matched to the wrong sentence`);
  piper.stop();
});

test('piper: missing install returns false', () => {
  assert.equal(piper.start('nope.exe', 'nope.onnx'), false);
});
