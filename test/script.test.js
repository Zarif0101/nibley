const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLine, createParser, parseAll } = require('../src/script');

test('every command parses', () => {
  assert.deepEqual(parseLine('say Think of voltage like water pressure.'), { type: 'say', text: 'Think of voltage like water pressure.' });
  assert.deepEqual(parseLine('point 100 200 | the knob'), { type: 'point', x: 100, y: 200, label: 'the knob' });
  assert.deepEqual(parseLine('ring 640 360 40 | voltage'), { type: 'ring', x: 640, y: 360, r: 40, label: 'voltage' });
  assert.deepEqual(parseLine('arrow 500 300 -> 640 360'), { type: 'arrow', x1: 500, y1: 300, x2: 640, y2: 360, label: undefined });
  assert.deepEqual(parseLine('highlight 420 200 300 60'), { type: 'highlight', x: 420, y: 200, w: 300, h: 60, label: undefined });
  assert.deepEqual(parseLine('label 100 100 | resistor'), { type: 'label', x: 100, y: 100, text: 'resistor' });
  assert.deepEqual(parseLine('step 1 1210 690 | Click CC'), { type: 'step', n: 1, x: 1210, y: 690, label: 'Click CC' });
  assert.deepEqual(parseLine('wait_click 1210 690'), { type: 'wait_click', x: 1210, y: 690 });
  assert.deepEqual(parseLine('action click 1210 690'), { type: 'action', kind: 'click', x: 1210, y: 690 });
  assert.deepEqual(parseLine('action key media_play_pause'), { type: 'action', kind: 'key', name: 'media_play_pause' });
  assert.deepEqual(parseLine('action type hello world'), { type: 'action', kind: 'type', text: 'hello world' });
  assert.deepEqual(parseLine('action scroll down 3'), { type: 'action', kind: 'scroll', dir: 'down', n: 3 });
  assert.deepEqual(parseLine('action open_url https://youtube.com'), { type: 'action', kind: 'open_url', url: 'https://youtube.com' });
  assert.deepEqual(parseLine('action open_app Chrome'), { type: 'action', kind: 'open_app', name: 'chrome' });
  assert.deepEqual(parseLine("title Ohm's law from the lecture"), { type: 'title', text: "Ohm's law from the lecture" });
  assert.deepEqual(parseLine('clear'), { type: 'clear' });
});

test('label without bar, commas, bullets, case', () => {
  assert.deepEqual(parseLine('label 10, 20 resistor here'), { type: 'label', x: 10, y: 20, text: 'resistor here' });
  assert.deepEqual(parseLine('- RING 10 20 30'), { type: 'ring', x: 10, y: 20, r: 30, label: undefined });
  assert.equal(parseLine('Ring 10 20').r, 40);
});

test('broken lines are bad, never throw', () => {
  for (const l of ['ring', 'ring 10', 'arrow 1 2 3', 'step 1 2', 'say', 'action', 'action fly 1 2', 'action click 5', 'wait_click x y', 'label 1 2']) {
    assert.equal(parseLine(l).type, 'bad', l);
  }
});

test('prose fallback and blank/fence lines', () => {
  assert.deepEqual(parseLine('Sure, here is the answer.'), { type: 'say', text: 'Sure, here is the answer.', prose: true });
  assert.equal(parseLine('   '), null);
  assert.equal(parseLine('```'), null);
  assert.equal(parseLine('```text'), null);
});

test('clamping: off-screen coords, ring radius, highlight size, label words', () => {
  assert.deepEqual(parseLine('ring -50 9999 5'), { type: 'ring', x: 0, y: 767, r: 28, label: undefined });
  assert.equal(parseLine('ring 1 1 900').r, 300);
  const h = parseLine('highlight 1300 700 500 500');
  assert.deepEqual([h.w, h.h], [66, 68]);
  assert.equal(parseLine('point 1 1 | one two three four five six seven eight').label, 'one two three four five six');
  assert.equal(parseLine('action scroll down 999').n, 20);
});

test('streaming: lines split across chunks', () => {
  const got = [];
  const p = createParser((c) => got.push(c));
  for (const ch of ['sa', 'y Hel', 'lo there\nri', 'ng 10 ', '20 40 | x\n', 'say end']) p.push(ch);
  assert.equal(got.length, 2);
  p.end();
  assert.deepEqual(got.map((c) => c.type), ['say', 'ring', 'say']);
  assert.equal(got[0].text, 'Hello there');
  assert.equal(got[2].text, 'end');
});

test('say cap at 8, bad lines reported', () => {
  const bad = [];
  const cmds = parseAll(Array.from({ length: 10 }, (_, i) => `say ${i}`).join('\n') + '\nring x', { onBad: (b) => bad.push(b) });
  assert.equal(cmds.length, 8);
  assert.deepEqual(bad.map((b) => b.why), ['say cap', 'say cap', 'missing numbers']);
});

test('CRLF and trailing spaces', () => {
  assert.deepEqual(parseAll('say a\r\nring 1 2 30\r\n').map((c) => c.type), ['say', 'ring']);
});

test('choices: 2-3 click-to-answer options, each cut to 4 words', () => {
  const { parseLine } = require('../src/script');
  assert.deepEqual(parseLine('choices Yes | No'), { type: 'choices', options: ['Yes', 'No'] });
  assert.deepEqual(parseLine('choices "Yes, pause it" | Not now | Show me a story version please | Fourth'), { type: 'choices', options: ['Yes, pause it', 'Not now', 'Show me a story'] });
  assert.equal(parseLine('choices Yes').type, 'bad');
  assert.equal(parseLine('choices Yes | Yes').type, 'bad', 'duplicates collapse to one option');
});

test('note: target box, title, short note; clamped and cut to size (phase 3 v2)', () => {
  assert.deepEqual(parseLine('note 700 140 80 36 | LEO | Lose Electrons = Oxidation'),
    { type: 'note', x: 700, y: 140, w: 80, h: 36, title: 'LEO', text: 'Lose Electrons = Oxidation' });
  assert.deepEqual(parseLine('note 1360 760 300 300'), { type: 'note', x: 1360, y: 760, w: 6, h: 8, title: undefined, text: undefined });
  const long = parseLine('note 10 10 50 50 | one two three four five six | a b c d e f g h i j k l m n');
  assert.equal(long.title, 'one two three four five');
  assert.equal(long.text.split(' ').length, 12);
  assert.equal(parseLine('note 10 10 | LEO').type, 'bad');
});
