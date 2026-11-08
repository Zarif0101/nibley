const test = require('node:test');
const assert = require('node:assert/strict');
const feedback = require('../src/feedback');

test('feedback: posts his words, details and the screenshot to the form service; empty message is refused', async () => {
  let req = null;
  const fetchFn = async (url, opts) => { req = { url, opts }; return { ok: true, json: async () => ({ success: 'true' }) }; };
  assert.equal((await feedback.send({ message: '   ', fetchFn })).ok, false);
  const r = await feedback.send({ kind: 'not helpful', message: 'Question: what is x?', name: 'Rafi', brain: 'gemini', png: Buffer.from([1, 2, 3]), fetchFn });
  assert.deepEqual(r, { ok: true, message: 'Sent. Thank you!' });
  assert.match(req.url, /^https:\/\/formsubmit\.co\/ajax\//);
  const f = req.opts.body;
  assert.equal(f.get('_subject'), 'Nibley not helpful from Rafi');
  assert.equal(f.get('Message'), 'Question: what is x?');
  assert.match(f.get('Details'), /Brain: gemini/);
  assert.equal(f.get('attachment').size, 3);
});

test('feedback: service says no, or no internet: a plain message, nothing thrown', async () => {
  const no = await feedback.send({ message: 'hi', fetchFn: async () => ({ ok: true, json: async () => ({ success: 'false', message: 'This form needs Activation.' }) }) });
  assert.equal(no.ok, false);
  assert.match(no.message, /needs Activation/);
  const off = await feedback.send({ message: 'hi', fetchFn: async () => { throw new Error('ENOTFOUND'); } });
  assert.equal(off.ok, false);
  assert.match(off.message, /no internet/);
});

test('ratings: first plain answer, then 1 in 3; answers with their own buttons are skipped and not counted', () => {
  const r = feedback.createRater();
  const seq = [false, false, true, false, false, false].map((hadButtons) => r.due({ hadButtons }));
  assert.deepEqual(seq, [true, false, false, false, true, false]);
});
