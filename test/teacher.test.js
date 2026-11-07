const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const teacher = require('../src/teacher');

const vault = () => { const v = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-teach-')); fs.mkdirSync(path.join(v, 'nibley')); return v; };

test('header names a style and check; "Makes sense?" at most once in 3 answers', () => {
  const t = teacher.create(vault(), { rand: () => 0.3 });
  const a = t.before('what is inertia?');
  assert.match(a.header, /^\[nibley\] style=[a-z-]+ check=ok$/);
  t.after({ checked: true });
  assert.equal(t.before('what is momentum?').check, 'no'); t.after({ checked: false });
  assert.equal(t.before('what is friction?').check, 'no'); t.after({ checked: false });
  assert.equal(t.before('what is gravity?').check, 'ok');
});

test('"explain again" scores the last style as not landed and switches style', () => {
  const v = vault(), t = teacher.create(v, { rand: () => 0.3 });
  const a = t.before('what is inertia?'); t.after({ checked: true });
  const b = t.before('explain it again, simpler');
  assert.equal(b.feedback, 0);
  assert.notEqual(b.style, a.style);
  assert.match(b.header, /again=1/);
  assert.equal(b.check, 'no');
  const saved = JSON.parse(fs.readFileSync(path.join(v, 'nibley', 'style-state.json'), 'utf8'));
  assert.equal(saved.scores[a.kind][a.style].b, 1);
});

test('"Makes sense" after a check counts as landed; plain "yes" without a check does not', () => {
  const t = teacher.create(vault(), { rand: () => 0.3 });
  t.before('what is inertia?'); t.after({ checked: false });
  assert.equal(t.before('yes').feedback, null);
  t.after({ checked: true });
  assert.equal(t.before('Makes sense').feedback, 1);
});

test('isCheck spots the Makes sense buttons only', () => {
  assert.equal(teacher.isCheck({ type: 'choices', options: ['Makes sense', 'Explain again', 'Example'] }), true);
  assert.equal(teacher.isCheck({ type: 'choices', options: ['Yes', 'No'] }), false);
});
