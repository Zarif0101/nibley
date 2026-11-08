// YouTube without an extension: video id and title from the browser window, captions from YouTube's player API.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const yt = require('../src/youtube');

test('youtube: video id from the address bar; title without browser and unread count', () => {
  assert.equal(yt.idOf('youtube.com/watch?v=IHZwWFHWa-w&t=30s'), 'IHZwWFHWa-w');
  assert.equal(yt.idOf('https://www.youtube.com/watch?list=x&v=aircAruvnKk'), 'aircAruvnKk');
  assert.equal(yt.idOf('youtube.com/results?search_query=x'), null);
  assert.equal(yt.idOf('youtube.com/watch?v=../../etc'), null);
  assert.equal(yt.cleanTitle('(3) Gradient descent - YouTube - Brave'), 'Gradient descent');
  assert.equal(yt.cleanTitle('Lec 1 | MIT 18.06 - YouTube'), 'Lec 1 | MIT 18.06');
});

test('youtube: captions from the player API, English hand-made track first, lines cleaned', async () => {
  const urls = [];
  const fetchFn = async (url, opts) => {
    urls.push(url);
    if (url.includes('/youtubei/v1/player')) {
      assert.match(opts.body, /"clientName":"ANDROID"/);
      return { json: async () => ({ videoDetails: { title: 'Lecture', lengthSeconds: '600' }, captions: { playerCaptionsTracklistRenderer: { captionTracks: [
        { languageCode: 'en', kind: 'asr', baseUrl: 'https://www.youtube.com/api/timedtext?v=x&lang=en&kind=asr&fmt=srv3' },
        { languageCode: 'en', baseUrl: 'https://www.youtube.com/api/timedtext?v=x&lang=en&fmt=srv3' }] } } }) };
    }
    return { json: async () => ({ events: [{ tStartMs: 1500, segs: [{ utf8: 'hello ' }, { utf8: ' world' }] }, { tStartMs: 3000 }, { tStartMs: 4250, segs: [{ utf8: '\n' }] }, { tStartMs: 6000, segs: [{ utf8: 'next' }] }] }) };
  };
  const r = await yt.fetchTranscript('aircAruvnKk', { fetchFn });
  assert.deepEqual(r.lines, [[1.5, 'hello world'], [6, 'next']]);
  assert.equal(r.auto, false);
  assert.equal(r.duration, 600);
  assert.equal(urls[1], 'https://www.youtube.com/api/timedtext?v=x&lang=en&fmt=json3');
});

test('youtube: no captions, or a caption URL not on youtube.com, gives a reason', async () => {
  const none = async () => ({ json: async () => ({ captions: {} }) });
  assert.deepEqual(await yt.fetchTranscript('aircAruvnKk', { fetchFn: none }), { reason: 'no captions' });
  const odd = async () => ({ json: async () => ({ captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ languageCode: 'en', baseUrl: 'https://evil.example/x' }] } } }) });
  assert.deepEqual(await yt.fetchTranscript('aircAruvnKk', { fetchFn: odd }), { reason: 'no captions' });
});

test('youtube: context block uses the read time and the cached transcript', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-yt-'));
  fs.mkdirSync(path.join(data, 'nibley', 'videos'), { recursive: true });
  const lines = Array.from({ length: 60 }, (_, i) => [i * 5, `line at ${i * 5}`]);
  fs.writeFileSync(path.join(data, 'nibley', 'videos', 'aircAruvnKk.json'), JSON.stringify({ lines }));
  const platform = { youtube: async () => ({ title: 'Lecture - YouTube - Brave', url: 'youtube.com/watch?v=aircAruvnKk', t: 130, duration: 600, paused: true }) };
  await yt.start({ platform, vaultPath: data, fetchTranscript: async () => assert.fail('cached: no fetch') });
  const ctx = yt.context();
  yt.stop();
  assert.match(ctx, /^\[Video: "Lecture" at 2:10 of 10:00, paused\]/);
  assert.match(ctx, /\[Transcript 0:10-2:40\]/);
  assert.ok(ctx.includes('0:10 line at 10') && ctx.includes('2:40 line at 160'), ctx);
  assert.ok(!ctx.includes('line at 5\n') && !ctx.includes('line at 165'), 'lines outside the window left out');
});

test('youtube: clock format', () => {
  assert.equal(yt.clock(0), '0:00');
  assert.equal(yt.clock(252.9), '4:12');
  assert.equal(yt.clock(3725), '1:02:05');
});
