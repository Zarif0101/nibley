const test = require('node:test');
const assert = require('node:assert/strict');
const { questionKind } = require('../src/learn/kind');

const LABELLED = [
  ['what does this mean?', 'concept'], ['what is inertia', 'concept'], ['why does ice float', 'concept'], ['what is a variable in python', 'concept'],
  ['explain recursion', 'concept'], ['what is an API', 'concept'], ['why do we need photosynthesis', 'concept'], ['what is inflation', 'concept'],
  ['how does a transistor work', 'concept'], ['what is the difference between a list and a tuple', 'concept'],
  ['how do I solve this quadratic', 'problem'], ['calculate the final speed', 'problem'], ['find the area of this shape', 'problem'],
  ['what is the derivative of x squared', 'problem'], ['how far does the ball go', 'problem'], ['how long does it take to fall', 'problem'],
  ['why does my code not work', 'concept'], ["why doesn't my loop work", 'problem'], ['I get a TypeError here', 'problem'], ['how do I fix this bug', 'problem'],
  ['how do I write a for loop', 'problem'], ['how many moles are there', 'problem'], ['work out the current in this circuit', 'problem'],
  ['derive the kinetic energy formula', 'formula'], ['prove that the angles add to 180', 'formula'], ['where does E equals m c squared come from', 'formula'],
  ['how do we get the quadratic formula', 'formula'], ['what is the formula for momentum', 'formula'], ['why is the formula squared', 'formula'],
  ['explain this graph', 'visual'], ['what does the slope mean here', 'visual'], ['how do vectors add', 'visual'], ['what is this wave doing', 'visual'],
  ['explain this diagram', 'visual'], ['what are field lines', 'visual'], ['what is a binary tree', 'visual'],
  ['quiz me on vectors', 'check'], ['test me on this chapter', 'check'], ['can you check my understanding', 'check'], ['am I right that force is mass times acceleration', 'check'],
];

test('classifies at least 90% of 40 labelled questions', () => {
  const wrong = LABELLED.filter(([q, k]) => questionKind(q) !== k);
  assert.ok(LABELLED.length === 40);
  assert.ok(wrong.length <= 4, `wrong: ${JSON.stringify(wrong.map(([q, k]) => [q, k, questionKind(q)]))}`);
});

test('a plot on screen makes an unclear question visual', () => {
  assert.equal(questionKind('what is happening here', { screenHasPlot: true }), 'visual');
  assert.equal(questionKind('what is happening here'), 'concept');
});
