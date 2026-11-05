const test = require('node:test');
const assert = require('node:assert');
const { sourceLine } = require('../src/source');

test('YouTube in Brave: title, link, video time', () => {
  const fg = { title: '(3) Linear Algebra Lecture 2 - YouTube - Brave', exe: 'brave', url: 'youtube.com/watch?v=abc123XYZ_0' };
  const video = { videoId: 'abc123XYZ_0', t: 754.2, duration: 3010 };
  assert.equal(sourceLine(fg, video), '[Source: Linear Algebra Lecture 2 - YouTube | youtube.com/watch?v=abc123XYZ_0 | 12:34 of 50:10]');
});

test('the video time only when the link is that video', () => {
  const fg = { title: 'Khan Academy - Brave', exe: 'brave', url: 'khanacademy.org/math' };
  assert.equal(sourceLine(fg, { videoId: 'abc123XYZ_0', t: 5, duration: 60 }), '[Source: Khan Academy | khanacademy.org/math]');
});

test('PDF in Brave: file name, link, page when the link has it', () => {
  assert.equal(sourceLine({ title: 'week3.pdf - Brave', exe: 'brave', url: 'file:///C:/notes/week3.pdf#page=4' }, null),
    '[Source: week3.pdf | file:///C:/notes/week3.pdf#page=4 | page 4]');
  assert.equal(sourceLine({ title: 'week3.pdf - Brave', exe: 'brave', url: 'file:///C:/notes/week3.pdf' }, null),
    '[Source: week3.pdf | file:///C:/notes/week3.pdf]');
});

test('other apps: window title only; nothing known: no line', () => {
  assert.equal(sourceLine({ title: 'notes.txt - Notepad', exe: 'notepad', url: '' }, null), '[Source: notes.txt - Notepad]');
  assert.equal(sourceLine({ title: '', exe: '', url: '' }, null), null);
  assert.equal(sourceLine(null, null), null);
});
