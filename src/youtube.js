// YouTube without any browser extension (Zarif 2026-11-08: learners install nothing but Nibley).
// - Video on screen: the helper reads the top-most Brave/Chrome/Edge YouTube window like a screen reader does
//   (address bar, "Seek slider" time + length, Play/Pause button), every 3 s while one is open.
// - Transcript: fetched once per video straight from YouTube's player API (the phone app's way: no proof token
//   needed), cached in <data>/nibley/videos/<id>.json. If YouTube changes this, the lecture ear (sound) still works.
// - Time links: open the video at that time in a new tab (YouTube ignores outside seeks; tested 2026-11-08).
const fs = require('node:fs');
const path = require('node:path');

const ID = /^[\w-]{11}$/; // YouTube video ids; also keeps file names safe
const MAX_LINES = 20000, POLL_MS = 3000;
let cfg = null, state = null, timer = null;
const transcripts = new Map(), fetching = new Set();

const videoFile = (id) => path.join(cfg.vaultPath, 'nibley', 'videos', `${id}.json`);
const idOf = (url) => { const m = String(url).match(/[?&]v=([\w-]{11})/); return m && ID.test(m[1]) ? m[1] : null; };
const cleanTitle = (t) => String(t).replace(/\s+-\s+YouTube(\s+-\s+.*)?$/, '').replace(/^\(\d+\)\s+/, '').trim().slice(0, 200);

// Caption tracks from the player API (ANDROID client returns plain caption URLs). Exported for tests.
async function fetchTranscript(id, { fetchFn = fetch } = {}) {
  const r = await fetchFn('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ videoId: id, context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 30, hl: 'en' } } }),
  });
  const j = await r.json();
  const tracks = j.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  const track = tracks.find((t) => t.languageCode?.startsWith('en') && t.kind !== 'asr') || tracks.find((t) => t.languageCode?.startsWith('en')) || tracks[0];
  if (!track?.baseUrl?.startsWith('https://www.youtube.com/')) return { reason: 'no captions' };
  const c = await (await fetchFn(`${track.baseUrl.replace(/&fmt=[^&]*/, '')}&fmt=json3`)).json();
  const lines = (c.events || []).filter((e) => e.segs).map((e) => [Math.round(e.tStartMs / 100) / 10, e.segs.map((s) => s.utf8).join('').replace(/\s+/g, ' ').trim()])
    .filter((l) => l[1]).slice(0, MAX_LINES).map(([t, s]) => [t, s.slice(0, 500)]);
  return lines.length ? { lines, lang: track.languageCode, auto: track.kind === 'asr', title: j.videoDetails?.title, duration: Number(j.videoDetails?.lengthSeconds) || 0 } : { reason: 'empty captions' };
}

function loadTranscript(id) {
  if (transcripts.has(id) || fetching.has(id)) return;
  try { transcripts.set(id, JSON.parse(fs.readFileSync(videoFile(id), 'utf8')).lines); return; } catch { /* not cached yet */ }
  fetching.add(id);
  cfg.fetchTranscript(id).then((r) => {
    if (!r.lines) { cfg.log({ ev: 'no_transcript', videoId: id, reason: r.reason }); return; }
    transcripts.set(id, r.lines);
    fs.mkdirSync(path.dirname(videoFile(id)), { recursive: true });
    fs.writeFile(videoFile(id), JSON.stringify({ videoId: id, title: r.title || '', duration: r.duration, lang: r.lang, auto: r.auto, saved: new Date().toISOString(), lines: r.lines }), () => {});
    cfg.log({ ev: 'transcript', videoId: id, lines: r.lines.length, auto: r.auto });
  }, (e) => cfg.log({ ev: 'no_transcript', videoId: id, reason: String(e.message).slice(0, 100) }))
    .finally(() => fetching.delete(id));
}

async function poll() {
  try {
    const r = await cfg.platform.youtube();
    const id = r && idOf(r.url);
    if (!id) { state = null; return; }
    state = { videoId: id, title: cleanTitle(r.title), t: r.t, duration: r.duration, paused: !!r.paused, rate: 1, visible: true, at: Date.now() };
    loadTranscript(id);
  } catch (e) {
    if (!/timeout/.test(e.message)) cfg.log({ ev: 'yt_read_error', err: String(e.message).slice(0, 120) });
  }
}

// opts: {platform, vaultPath (data root), log, fetchTranscript?}
function start(opts) {
  cfg = { log: () => {}, fetchTranscript: (id) => fetchTranscript(id), ...opts };
  state = null;
  transcripts.clear();
  clearInterval(timer);
  timer = setInterval(poll, POLL_MS);
  timer.unref?.();
  return poll();
}

// The video on screen. Time moves on between reads while it plays.
function current() {
  if (!state) return null;
  const t = state.paused ? state.t : Math.min(state.duration || Infinity, state.t + (Date.now() - state.at) / 1000);
  return { ...state, t };
}

function transcriptOf(id) {
  if (!ID.test(id || '')) return null;
  if (!transcripts.has(id)) {
    try { transcripts.set(id, JSON.parse(fs.readFileSync(videoFile(id), 'utf8')).lines); } catch { return null; }
  }
  return transcripts.get(id);
}

const clock = (s) => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; };

// Text block put in front of a question: title, time, and the transcript from 2 min before to 30 s after now.
function context({ before = 120, after = 30 } = {}) {
  const s = current();
  if (!s) return null;
  const head = `[Video: "${s.title}" at ${clock(s.t)} of ${clock(s.duration)}, ${s.paused ? 'paused' : 'playing'}]`;
  const lines = transcriptOf(s.videoId);
  if (!lines) return `${head}\n[No transcript for this video]`;
  const near = lines.filter(([t]) => t >= s.t - before && t <= s.t + after);
  return `${head}\n[Transcript ${clock(s.t - before)}-${clock(s.t + after)}]\n${near.map(([t, x]) => `${clock(t)} ${x}`).join('\n')}`;
}

// Time links on the study page: the video at that time, in a new tab.
function seek(t, videoId = state?.videoId) {
  if (!ID.test(videoId || '') || !Number.isFinite(t)) return false;
  cfg.platform.openUrl(`https://www.youtube.com/watch?v=${videoId}&t=${Math.max(0, Math.floor(t))}s`).catch((e) => cfg.log({ ev: 'yt_seek_error', err: e.message }));
  return true;
}

module.exports = { start, stop: () => clearInterval(timer), current, context, clock, seek, transcript: transcriptOf, fetchTranscript, poll, idOf, cleanTitle };
