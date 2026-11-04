const test = require('node:test');
const assert = require('node:assert/strict');
const { matchCommand, styleRequest } = require('../src/commands');

const cases = {
  again: ['again', 'Say that again', 'say it again please', 'Repeat that.', 'one more time', 'what did you say?', 'Nibley, repeat'],
  slower: ['slower', 'Slow down!', 'speak slower please', "you're too fast", 'can you go slower'],
  faster: ['faster', 'speed up', 'talk faster', 'too slow'],
  shorter: ['shorter', 'short version', 'keep it short', 'summarize that', 'TL;DR'],
  more: ['more detail', 'tell me more', 'go deeper', 'explain more'],
  gotit: ['got it', 'makes sense', 'thanks', 'okay thanks', 'I get it', 'understood'],
  lost: ['what?', 'huh', "I don't get it", "I'm lost", 'i am confused', "that didn't make sense"],
};

test('each command phrase is recognised', () => {
  for (const [name, phrases] of Object.entries(cases)) for (const p of phrases) assert.equal(matchCommand(p), name, p);
});

test('real questions are never swallowed', () => {
  for (const q of ['again, what is a vector?', 'what is a vector', 'slow down the video', 'can you explain more about vectors and why they add',
    'what does this mean', 'why is it faster', 'make the summary of this lecture', 'thanks, but what about friction?', 'save this', 'pause the video', '']) {
    assert.equal(matchCommand(q), null, q);
  }
});

test('style requests for one answer', () => {
  assert.equal(styleRequest('explain inertia like a story'), 'doodle-story');
  assert.equal(styleRequest('show me step-by-step how to get v = u + at'), 'board-builder');
  assert.equal(styleRequest('how would they test this in the exam style'), 'exam-coach');
  assert.equal(styleRequest('can you visualize this graph'), 'picture-first');
  assert.equal(styleRequest('quiz me on vectors'), 'question-buddy');
  assert.equal(styleRequest('show me how to turn on captions'), null);
  assert.equal(styleRequest('what is a vector'), null);
});
