// Edge online voices, one sentence at a time (BUILD-PLAN 4.7). On failure the caller switches to Windows voices.
// Measured 2026-10-28: Edge closes the socket after each sentence (reconnect ~750 ms), so one connection is kept
// open ahead of time. Edge also throttles when many connections open within seconds: a "second request if slow"
// hedge made failures worse in-app, so there is none. One spare connection, opened as the previous one is used.
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const { log } = require('./log');

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
// onChunk (optional): gets each MP3 piece as it arrives, so playback can start before the sentence is done (P7).
// Logs one edge_req line per sentence (QUALITY-PLAN T1): connect, first audio, done. After a timeout it keeps
// listening up to 15 s, so the log tells "slow but arrives" (late_ms) from "never answers".
async function synth(text, giveUpMs = GIVE_UP_MS, onChunk = null) {
  warm();
  const conn = spare;
  spare = connect(); // ready for the next sentence
  const t0 = Date.now(), seen = { opened_ms: t0 - conn.at, words: text.split(/\s+/).length };
  let stream, timer, timedOut = false;
  const close = () => { stream?.destroy(); conn.tts.close(); };
  try {
    return await new Promise((resolve, reject) => {
      timer = setTimeout(() => { timedOut = true; reject(new Error(`no audio in ${giveUpMs} ms (connected ${seen.ready_ms ?? 'never'} ms, opened ${seen.opened_ms} ms before)`)); }, giveUpMs);
      conn.ready.then((tts) => {
        seen.ready_ms = Date.now() - t0;
        ({ audioStream: stream } = tts.toStream(esc(text)));
        const chunks = [];
        stream.on('data', (c) => { if (timedOut) return; seen.first_ms ??= Date.now() - t0; chunks.push(c); clearTimeout(timer); onChunk?.(c); });
        stream.on('end', () => (chunks.length ? resolve(Buffer.concat(chunks)) : reject(new Error('empty audio'))));
        stream.on('error', reject);
      }, reject);
    });
  } finally {
    clearTimeout(timer);
    if (!timedOut) { close(); log({ ev: 'edge_req', ok: seen.first_ms != null, ...seen, total_ms: Date.now() - t0 }); }
    else { // diagnostic: does the audio still come?
      const giveUp = setTimeout(() => { close(); log({ ev: 'edge_req', ok: false, ...seen, late_ms: null }); }, 15000);
      const onLate = () => { clearTimeout(giveUp); close(); log({ ev: 'edge_req', ok: false, ...seen, late_ms: Date.now() - t0 }); };
      if (stream) stream.once('data', onLate); else conn.ready.then(() => stream ? stream.once('data', onLate) : null, () => {});
    }
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
