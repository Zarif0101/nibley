const test = require('node:test');
const assert = require('node:assert/strict');
const { createLint, shorten } = require('../src/lint');

const say = (text) => ({ type: 'say', text });

test('long say line is cut at the last comma or full stop before 24 words', () => {
  const long = 'Force is mass times acceleration, so a heavier cart needs a bigger push to speed up by the same amount every single second that passes by today.';
  const r = createLint().check(say(long));
  assert.deepEqual(r.fixes, ['long_line']);
  assert.equal(r.cmd.text, 'Force is mass times acceleration.');
});

test('long line with no punctuation is cut at the limit', () => {
  const text = Array.from({ length: 30 }, (_, i) => `w${i}`).join(' ');
  assert.equal(shorten(text, 24).split(' ').length, 24);
  assert.ok(shorten(text, 24).endsWith('…'));
});

test('short lines pass untouched (same object)', () => {
  const c = say('It means force equals mass times acceleration.');
  const r = createLint().check(c);
  assert.equal(r.cmd, c);
  assert.deepEqual(r.fixes, []);
});

test('filler opener is removed from the first line only', () => {
  const l = createLint();
  assert.equal(l.check(say('Great question! A vector has size and direction.')).cmd.text, 'A vector has size and direction.');
  assert.equal(l.check(say('Sure, so think of an arrow.')).cmd.text, 'Sure, so think of an arrow.');
});

test('a bare "Okay." is not stripped to nothing', () => {
  assert.equal(createLint().check(say('Okay.')).cmd.text, 'Okay.');
});

test('banned words are logged but not changed', () => {
  const r = createLint().check(say('It is just a ratio.'));
  assert.deepEqual(r.fixes, ['banned_word']);
  assert.equal(r.cmd.text, 'It is just a ratio.');
});

test('voice stops after 5 say lines', () => {
  const l = createLint();
  for (let i = 0; i < 5; i++) assert.ok(l.check(say(`Line ${i}.`)).cmd);
  assert.deepEqual(l.check(say('Line 6.')), { cmd: null, fixes: ['too_many_lines'] });
});

test('a 3rd visible mark fades the oldest; steps and clear behave', () => {
  const l = createLint();
  for (const type of ['ring', 'arrow']) assert.equal(l.check({ type }).fadeOldest, undefined);
  assert.equal(l.check({ type: 'step', n: 1 }).fadeOldest, undefined);
  const r = l.check({ type: 'highlight' });
  assert.equal(r.fadeOldest, true);
  assert.deepEqual(r.fixes, ['too_many_marks']);
  l.check({ type: 'clear' });
  assert.equal(l.check({ type: 'ring' }).fadeOldest, undefined);
});

test('null and non-say commands pass through', () => {
  const l = createLint();
  assert.deepEqual(l.check(null), { cmd: null, fixes: [] });
  const t = { type: 'title', text: 'Very long title that should not be touched by the guard at all because titles are not spoken aloud' };
  assert.equal(l.check(t).cmd, t);
});
