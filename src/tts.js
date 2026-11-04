// Edge online voices, one sentence at a time (BUILD-PLAN 4.7). On failure the caller switches to Windows voices.
// Measured 2026-10-28: Edge closes the socket after each sentence (reconnect ~750 ms), so one connection is kept
// open ahead of time. Edge also throttles when many connections open within seconds: a "second request if slow"
// hedge made failures worse in-app, so there is none. One spare connection, opened as the previous one is used.
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

// MAX_AGE: warm() at the hotkey replaces older sockets. 10 s (2026-10-28) made most first lines reconnect inside their
// budget, since the first line comes 4-14 s after the press. Re-measured 2026-11-04: sockets idle 2-20 s answered in
// 0.18-0.24 s; the 10-28 "idle socket, no audio" was Edge's slow periods, not the idle socket.
const MAX_AGE = 30e3, GIVE_UP_MS = 2500;
let voice, spare = null;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function connect() {
  const tts = new MsEdgeTTS();
  const entry = { at: Date.now(), tts, ready: tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3).then(() => tts) };
  entry.ready.catch(() => { entry.at = 0; }); // failed (offline, timeout): the next warm() replaces it
  return entry;
}

// Makes sure a fresh connection is waiting; call when Zarif presses the hotkey (answer is >1.5 s away).
function warm() {
  if (spare && Date.now() - spare.at < MAX_AGE) return;
  spare?.tts.close();
  spare = connect();
}

// One sentence to an MP3 buffer. Rejects if no audio arrives within giveUpMs.
async function synth(text, giveUpMs = GIVE_UP_MS) {
  warm();
  const conn = spare;
  spare = connect(); // ready for the next sentence
  let stream, timer;
  try {
    return await new Promise((resolve, reject) => {
      const t0 = Date.now(), seen = {};
      timer = setTimeout(() => reject(new Error(`no audio in ${giveUpMs} ms (connected ${seen.ready ?? 'never'} ms, opened ${t0 - conn.at} ms before)`)), giveUpMs);
      conn.ready.then((tts) => {
        seen.ready = Date.now() - t0;
        ({ audioStream: stream } = tts.toStream(esc(text)));
        const chunks = [];
        stream.on('data', (c) => { chunks.push(c); clearTimeout(timer); });
        stream.on('end', () => (chunks.length ? resolve(Buffer.concat(chunks)) : reject(new Error('empty audio'))));
        stream.on('error', reject);
      }, reject);
    });
  } finally {
    clearTimeout(timer);
    stream?.destroy();
    conn.tts.close();
  }
}

// The first request of a fresh app (or voice) is often slow or silent (seen 2026-10-28), so spend it on a warm-up.
async function init(v) {
  voice = v;
  spare?.tts.close();
  spare = null;
  warm();
  await spare.ready;
  await synth('Ready.', 5000).catch(() => {});
}

module.exports = { init, synth, warm, close: () => spare?.tts.close() };
