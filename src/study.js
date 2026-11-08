// Study page: one page per lecture (brainstorms/2026-11-08-study-page-format.md, mockup design/study-page-mockup.html).
// Fills from his questions (live), a key-ideas recap every 10 min of video (one small Haiku call), and at the end of the
// video a 3-question check + flashcards (one call). Kept cards go to cards.json for the daily review (FSRS fields).
// Files: <data>/nibley/study/<videoId>.json and <data>/nibley/cards.json. Learner data stays inside the app.
const fs = require('node:fs');
const path = require('node:path');
const fsrs = require('./learn/fsrs');

const RECAP_S = 600, MIN_END_S = 300, ANALYZE_CHARS = 150000, MAX_PARTS = 6; // ~37k tokens of transcript per call; 6 parts = ~13 hours
const oneLine = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const clock = (s) => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; };
const json = (text) => JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));

const RECAP = `You write the key ideas of one part of a video lecture for a student's study page.
You get the transcript of that part, each line starting with its time in the video.
Reply with ONLY one JSON object, no other text:
{"lecture": true, "ideas": [{"t": 42, "text": "..."}]}
- ideas: 2 or 3 ideas the teacher actually covered in this part, in order. text: one plain sentence, max 22 words, the idea itself (a fact, rule or formula), not "the teacher talks about". t: the time in seconds where it starts, taken from the transcript.
- Only what the transcript says. No invented numbers, names or formulas.
- If this is not teaching (music, a vlog, a game, an ad), reply {"lecture": false, "ideas": []}.`;

const END = `A student just finished a video lecture. Make a quick check and flashcards from it.
You get the lecture's key ideas, the student's questions, and the transcript.
Reply with ONLY one JSON object, no other text:
{"quiz": [{"q": "...", "o": ["...", "..."], "r": 0, "why": "..."}], "cards": [{"f": "...", "b": "...", "t": 120}]}
- quiz: exactly 3 questions, each answered with one tap: q max 14 words, o = 2 short options (max 5 words each, never a sentence), r = index of the right one, why = one short sentence (max 14 words) saying why.
- cards: CARD_COUNT flashcards on the ideas that matter most, including what the student asked about. f = a question (max 12 words), b = the answer (max 20 words), t = video time in seconds where it is taught.
- Only what the lecture says. No invented numbers, names or formulas.`;

const ANALYZE = `A student is about to watch a video lecture. Read its whole transcript and map it for them.
Each transcript line starts with its time in the video, in seconds.
Reply with ONLY one JSON object, no other text:
{"lecture": true, "chapters": [{"t": 0, "title": "...", "ideas": ["...", "..."]}], "prereqs": ["..."], "tricky": [{"t": 754, "text": "..."}]}
- chapters: the lecture's parts in order, about one per 5-10 minutes (3 to 12). t = where it starts (seconds, from the transcript). title max 5 words. ideas: 2 or 3 per chapter, each one plain sentence, max 20 words: the idea itself (a fact, rule or formula).
- prereqs: 0 to 3 basics the student must already know to follow this lecture, each max 10 words. [] if none.
- tricky: the 2 or 3 moments students most often get stuck on, with t and one short line (max 16 words) saying what is hard there.
- Only what the transcript says. No invented numbers, names or formulas. Write in English even if the lecture is in another language.
- If this is not teaching (music, a vlog, a game), reply {"lecture": false}.`;

// opts: { dir: data root, run({system, input}) -> text (Claude, Haiku), transcript(videoId) -> [[t, text]] | null,
//         onChange(page), log }
function create(opts) {
  const cfg = { log: () => {}, onChange: () => {}, transcript: () => null, ...opts };
  const root = path.join(cfg.dir, 'nibley');
  const fileOf = (id) => path.join(root, 'study', `${id}.json`);
  let page = null, busy = false;

  const save = () => {
    fs.mkdirSync(path.dirname(fileOf(page.id)), { recursive: true });
    fs.writeFileSync(`${fileOf(page.id)}.tmp`, JSON.stringify(page, null, 1));
    fs.renameSync(`${fileOf(page.id)}.tmp`, fileOf(page.id));
    syncCards();
    cfg.onChange(view());
  };

  // Kept cards of this video in cards.json; FSRS state of cards already there is kept as it is.
  function syncCards() {
    const file = path.join(root, 'cards.json');
    let all = [];
    try { all = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* none yet */ }
    const old = new Map(all.map((c) => [c.id, c]));
    const mine = page.cards.map((c, i) => ({ c, id: `${page.id}:${i}` })).filter(({ c }) => c.keep)
      .map(({ c, id }) => ({ ...(old.get(id) || fsrs.createCard(id, page.title, Date.now())), front: c.f, back: c.b, video: page.id, t: c.t ?? null }));
    const next = all.filter((c) => c.video !== page.id).concat(mine);
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(next, null, 1));
    fs.renameSync(`${file}.tmp`, file);
  }

  function open(v) {
    try { page = JSON.parse(fs.readFileSync(fileOf(v.videoId), 'utf8')); } catch {
      page = { id: v.videoId, title: oneLine(v.title, 200), duration: v.duration || 0, lecture: null, recapTo: 0, ideas: [], questions: [], quiz: [], cards: [], ended: false, created: new Date().toISOString() };
    }
    cfg.log({ ev: 'study_open', video: v.videoId });
    cfg.onChange(view());
  }

  async function call(kind, system, input, timeoutMs) {
    busy = true;
    const t0 = Date.now();
    try {
      const out = json(await cfg.run({ system, input, timeoutMs }));
      cfg.log({ ev: 'study_call', kind, ms: Date.now() - t0 });
      return out;
    } catch (e) {
      cfg.log({ ev: 'study_error', kind, err: String(e.message).slice(0, 160) });
      return null;
    } finally { busy = false; }
  }

  async function recap(from, to) {
    const lines = (cfg.transcript(page.id) || []).filter(([t]) => t >= from && t < to);
    if (!lines.length) { page.recapTo = to; return; } // no captions here: questions still land, no recap
    const id = page.id;
    const r = await call('recap', RECAP, lines.map(([t, x]) => `${Math.round(t)} ${x}`).join('\n'));
    if (!r || page?.id !== id) return;
    if (r.lecture === false) { page.lecture = false; save(); return; }
    page.lecture = true;
    page.recapTo = to;
    for (const i of (Array.isArray(r.ideas) ? r.ideas : []).slice(0, 3)) {
      const t = Number.isFinite(i?.t) ? Math.min(to, Math.max(from, i.t)) : from;
      if (oneLine(i?.text, 200)) page.ideas.push({ t, text: oneLine(i.text, 200), at: Date.now() });
    }
    save();
  }

  async function finish() {
    page.ended = true;
    if (!page.ideas.length && !page.questions.length && page.analyzed !== true) { save(); return; } // nothing studied here (music, a short clip)
    const id = page.id;
    const count = Math.min(25, Math.max(3, Math.round((page.duration / RECAP_S) * 5)));
    const transcript = (cfg.transcript(page.id) || []).map(([t, x]) => `${Math.round(t)} ${x}`).join('\n').slice(0, 40000);
    const ideas = [...(page.chapters || []).flatMap((c) => c.ideas.map((x) => `${clock(c.t)} ${x}`)), ...page.ideas.map((i) => `${clock(i.t)} ${i.text}`)];
    const input = `Lecture: ${page.title}\n\nKey ideas:\n${ideas.join('\n') || '(none)'}\n\n`
      + `Student's questions:\n${page.questions.map((q) => `${clock(q.t)} ${q.q} -> ${q.a}`).join('\n') || '(none)'}\n\nTranscript:\n${transcript || '(none)'}`;
    const r = await call('end', END.replace('CARD_COUNT', String(count)), input);
    if (page?.id !== id) return;
    if (r) {
      page.quiz = (Array.isArray(r.quiz) ? r.quiz : []).filter((q) => q && Array.isArray(q.o) && q.o.length === 2 && [0, 1].includes(q.r)).slice(0, 3)
        .map((q) => ({ q: oneLine(q.q, 160), o: q.o.map((o) => oneLine(o, 80)), r: q.r, why: oneLine(q.why, 160), picked: null }));
      page.cards = (Array.isArray(r.cards) ? r.cards : []).filter((c) => oneLine(c?.f, 1) && oneLine(c?.b, 1)).slice(0, 25)
        .map((c) => ({ f: oneLine(c.f, 160), b: oneLine(c.b, 240), t: Number.isFinite(c.t) ? c.t : null, keep: true }));
    }
    save();
    cfg.log({ ev: 'study_end', video: id, quiz: page.quiz.length, cards: page.cards.length });
  }

  // Called every few seconds with youtube.current(). Returns 'ended' once, when the end pass is done.
  async function tick(v) {
    if (!v || !v.videoId) return null;
    if (page?.id !== v.videoId) open(v);
    if (v.duration) page.duration = v.duration;
    if (canAnalyze() !== shownCan) cfg.onChange(view()); // the transcript arrived: the Analyze button can show
    if (busy || page.lecture === false || page.ended) return null;
    const nearEnd = page.duration >= MIN_END_S && v.t >= page.duration - 3;
    if (nearEnd) {
      if (page.recapTo < v.t - 60) await recap(page.recapTo, page.duration + 1);
      if (page.lecture === false) return null;
      await finish();
      return page.ended ? 'ended' : null;
    }
    if (page.analyzed === true && v.t < (page.analyzedTo ?? Infinity)) return null; // the analysis already mapped this part
    if (v.t - page.recapTo > 2 * RECAP_S) page.recapTo = Math.floor(v.t - RECAP_S); // he skipped ahead: recap where he is, not every part he jumped over
    if (v.t - page.recapTo >= RECAP_S) await recap(page.recapTo, page.recapTo + RECAP_S);
    return null;
  }

  // v: youtube.current() when the answer ended (opens the page if the 5 s tick hasn't yet)
  function addQuestion(v, { q, a }) {
    if (!v?.videoId) return;
    if (page?.id !== v.videoId) open(v);
    page.questions.push({ t: Math.round(v.t), q: oneLine(q, 200), a: oneLine(a, 400), at: Date.now() });
    if (page.lecture === null) page.lecture = true; // he asked about it: it is something he studies
    save();
  }

  function answer(i, k) {
    const q = page?.quiz[i];
    if (!q || q.picked !== null || ![0, 1].includes(k)) return;
    q.picked = k;
    if (k !== q.r) page.cards.push({ f: q.q, b: `${q.o[q.r]}. ${q.why}`, t: null, keep: true, miss: true });
    save();
  }

  function toggleCard(i) {
    const c = page?.cards[i];
    if (!c) return;
    c.keep = !c.keep;
    save();
  }

  // "Analyze this video": the whole transcript, before or while he watches. Long videos go in parts of ~37k tokens,
  // one call each (a 4-hour marathon = 2 parts), so nothing is left out (Zarif 2026-11-08: "half of the video is missing").
  // A page analyzed only partly (older cap, or a part that failed) can analyze the rest.
  const canAnalyze = () => !!page && page.lecture !== false && page.analyzed !== 'working'
    && (!page.analyzed || page.analyzedTo != null) && !!cfg.transcript(page.id)?.length;
  let shownCan = false;
  async function analyze() {
    if (!canAnalyze() || busy) return false;
    const id = page.id, lines = cfg.transcript(id), was = page.analyzed ?? null, first = was !== true;
    const from = first ? -1 : page.analyzedTo;
    const parts = [];
    let text = '', a = null, b = 0;
    for (const [t, x] of lines) {
      if (t <= from) continue;
      const l = `${Math.round(t)} ${x}\n`;
      if (text && text.length + l.length > ANALYZE_CHARS) { parts.push({ text, a, b }); text = ''; a = null; }
      if (a === null) a = t;
      text += l; b = t;
    }
    if (text) parts.push({ text, a, b });
    const todo = parts.slice(0, MAX_PARTS);
    if (first) { page.chapters = []; page.prereqs = []; page.tricky = []; }
    let done = 0;
    for (const [i, part] of todo.entries()) {
      page.analyzed = 'working';
      page.analyzing = { part: i + 1, of: todo.length };
      cfg.onChange(view());
      const where = parts.length > 1 || !first
        ? `\n\nThis is part ${i + 1} of ${todo.length} of the transcript (${clock(part.a)} to ${clock(part.b)}). Map only this part.${first && i === 0 ? '' : ' Give prereqs as [].'}`
        : '';
      const r = await call('analyze', ANALYZE, `Lecture: ${page.title}${where}\n\nTranscript:\n${part.text}`, 240e3);
      if (page?.id !== id) return false;
      if (!r) break;
      if (r.lecture === false && first && i === 0) { page.lecture = false; page.analyzed = null; delete page.analyzing; save(); return false; }
      page.chapters.push(...(Array.isArray(r.chapters) ? r.chapters : []).filter((c) => oneLine(c?.title, 1)).slice(0, 12)
        .map((c) => ({ t: Number.isFinite(c.t) ? c.t : part.a, title: oneLine(c.title, 60), ideas: (Array.isArray(c.ideas) ? c.ideas : []).map((x) => oneLine(x, 200)).filter(Boolean).slice(0, 3) })));
      if (first && i === 0) page.prereqs = (Array.isArray(r.prereqs) ? r.prereqs : []).map((x) => oneLine(x, 120)).filter(Boolean).slice(0, 3);
      page.tricky.push(...(Array.isArray(r.tricky) ? r.tricky : []).filter((x) => oneLine(x?.text, 1)).slice(0, 3).map((x) => ({ t: Number.isFinite(x.t) ? x.t : part.a, text: oneLine(x.text, 160) })));
      page.analyzedTo = part.b;
      done++;
    }
    delete page.analyzing;
    if (!done) { page.analyzed = was; cfg.onChange(view()); return false; }
    page.lecture = true;
    page.analyzed = true;
    page.chapters.sort((x, y) => x.t - y.t);
    page.tricky.sort((x, y) => x.t - y.t);
    if (page.analyzedTo >= lines.at(-1)[0]) page.analyzedTo = null; // null: the whole video
    save();
    cfg.log({ ev: 'study_analyzed', video: id, parts: `${done}/${parts.length}`, chapters: page.chapters.length, covered: page.analyzedTo ?? 'all' });
    return true;
  }

  // Lecture map for the question context: chapter titles with times, so Nibley knows what comes later.
  function context(videoId) {
    if (!page || page.id !== videoId || page.analyzed !== true || !page.chapters?.length) return null;
    return `[Lecture map (whole video${page.analyzedTo ? ` up to ${clock(page.analyzedTo)}` : ''}): ${page.chapters.map((c) => `${clock(c.t)} ${c.title}`).join('; ')}]`;
  }

  const view = () => {
    shownCan = canAnalyze();
    return page && page.lecture !== false ? { ...page, canAnalyze: shownCan } : null;
  };
  return { tick, addQuestion, answer, toggleCard, analyze, context, view, get busy() { return busy; } };
}

module.exports = { create, RECAP_S };
