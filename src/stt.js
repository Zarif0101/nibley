// Groq Whisper transcription (BUILD-PLAN 4.3). Errors carry .kind: nokey | key | rate | offline | http.
const URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const FILLER = /^\W*(thank you|thanks|you|bye|okay)?\W*$/i; // Whisper's usual words on silence

const fail = (kind, msg) => Object.assign(new Error(msg || kind), { kind });

async function post(audio, key, mime, prompt) {
  const fd = new FormData();
  fd.append('file', new Blob([audio], { type: mime }), mime.includes('webm') ? 'clip.webm' : 'clip.mp3');
  fd.append('model', 'whisper-large-v3-turbo');
  fd.append('language', 'en');
  fd.append('response_format', 'json');
  if (prompt) fd.append('prompt', prompt);
  try {
    return await fetch(URL, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: fd, signal: AbortSignal.timeout(8000) });
  } catch (e) {
    throw fail('offline', e.message);
  }
}

// audio: Buffer. durationMs: clip length (for the filler check). prompt: words Whisper should expect (for lecture
// sound: the end of the previous piece, so sentences carry on). Returns '' when nothing useful was said.
const ASK = 'A student asks about a lecture on screen: physics, maths, chemistry, biology, YouTube captions.';
async function transcribe(audio, { key, durationMs = 2000, mime = 'audio/webm', prompt = ASK }) {
  if (!key) throw fail('nokey');
  let r = await post(audio, key, mime, prompt);
  if (r.status === 429) {
    const wait = Number(r.headers.get('retry-after'));
    if (!(wait > 0 && wait < 3)) throw fail('rate');
    await new Promise((res) => setTimeout(res, wait * 1000));
    r = await post(audio, key, mime, prompt);
    if (r.status === 429) throw fail('rate');
  }
  if (r.status === 401 || r.status === 403) throw fail('key');
  if (!r.ok) throw fail('http', `Groq ${r.status}`);
  const text = String((await r.json()).text || '').trim();
  return durationMs < 1000 && FILLER.test(text) ? '' : text;
}

module.exports = { transcribe, FILLER };
