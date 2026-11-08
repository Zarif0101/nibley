// Study page live check: the real recap and end prompts on real saved YouTube transcripts, real Claude (Haiku).
// 1) MIT 18.06 lecture 1, first 10 min: 2-3 ideas with times inside the part, marked as a lecture.
// 2) A tech review video: should come back as not a lecture (or at worst, ideas; printed for a look).
// 3) MIT lecture end pass (40 min): 3 two-option questions, ~20 cards with times.
// 4) Transcript fetched live from YouTube (no extension), then "Analyze this video" on it: chapters, basics, tricky parts.
// 5) Analyze a 4-hour Bangla HSC marathon (transcript capped at ~37k tokens): English chapters, says how far it covered.
// Run: node test/study-live-check.js     (about 6 Claude calls' worth of time, 1-2 min)
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const study = require('../src/study');
const { runClaude } = require('../src/memory');

const settings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'settings.json'), 'utf8'));
const homes = [path.join(process.env.APPDATA, 'nibley', 'nibley', 'videos'), path.join(settings.vaultPath || '', 'nibley', 'videos')];
const transcript = (id) => { for (const d of homes) { try { return JSON.parse(fs.readFileSync(path.join(d, `${id}.json`), 'utf8')).lines; } catch { /* next */ } } return null; };
const run = ({ system, input, timeoutMs }) => runClaude({ claudePath: settings.claudePath, system, input, timeoutMs });
const { fetchTranscript } = require('../src/youtube');
const rows = [];
const check = (name, ok, detail = '') => { rows.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-study-live-'));
  const mit = study.create({ dir, run, transcript, log: (e) => e.ev !== 'study_open' && console.log('  log', JSON.stringify(e)) });
  const V = { videoId: 'ZK3O402wf1c', title: 'Lec 1 | MIT 18.06 Linear Algebra, Spring 2005', duration: 2389 };
  await mit.tick({ ...V, t: 605 });
  let p = mit.view();
  check('MIT recap: 2-3 ideas', p && p.ideas.length >= 2 && p.ideas.length <= 3, p?.ideas.map((i) => `\n    ${i.t}s ${i.text}`).join(''));
  check('MIT recap: times inside 0-600 s', p && p.ideas.every((i) => i.t >= 0 && i.t <= 600));
  check('MIT recap: marked as a lecture', p?.lecture === true);

  const tech = study.create({ dir, run, transcript });
  await tech.tick({ videoId: 'g6Die8gVFn0', title: "OLED iPad Mini is The Most Apple Product They've Ever Appled", duration: 779, t: 605 });
  console.log(`INFO  tech review video: ${tech.view() ? `kept as study page, ideas: ${tech.view().ideas.map((i) => i.text).join(' | ')}` : 'not a lecture (hidden)'}`);

  await mit.tick({ ...V, t: 2387 });
  p = mit.view();
  check('MIT end: 3 quiz questions, 2 short options each', p.quiz.length === 3 && p.quiz.every((q) => q.o.length === 2 && q.o.every((o) => o.split(' ').length <= 8)), p.quiz.map((q) => `\n    ${q.q} [${q.o.join(' / ')}] -> ${q.o[q.r]}`).join(''));
  check('MIT end: 15-25 cards', p.cards.length >= 15 && p.cards.length <= 25, `${p.cards.length} cards, e.g.\n    ${p.cards.slice(0, 3).map((c) => `${c.f} -> ${c.b} (${c.t}s)`).join('\n    ')}`);
  check('MIT end: cards have video times', p.cards.filter((c) => Number.isFinite(c.t)).length >= p.cards.length * 0.8);

  const live = await fetchTranscript('ZK3O402wf1c');
  check('transcript fetched live from YouTube, no extension', live.lines?.length > 500, `${live.lines?.length} lines, ${live.lang}${live.auto ? ' (auto)' : ''}`);
  const a = study.create({ dir: fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-an-')), run, transcript: () => live.lines });
  await a.tick({ ...V, t: 5 });
  let t0 = Date.now();
  await a.analyze();
  p = a.view();
  check('MIT analysis: 3-12 chapters with rising times', p.analyzed === true && p.chapters.length >= 3 && p.chapters.every((c, i) => i === 0 || c.t >= p.chapters[i - 1].t),
    `${Date.now() - t0} ms${p.chapters.map((c) => `\n    ${Math.round(c.t)}s ${c.title}: ${c.ideas.join(' / ')}`).join('')}\n    basics: ${p.prereqs.join(' / ')}\n    tricky: ${p.tricky.map((x) => `${x.t}s ${x.text}`).join(' / ')}`);
  check('MIT analysis: covers the whole video', p.analyzedTo === null);

  const hsc = study.create({ dir: fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-an-')), run, transcript });
  await hsc.tick({ videoId: 'KM4YXq-b4Ss', title: 'Thermodynamics marathon | HSC Physics', duration: 13960, t: 5 });
  t0 = Date.now();
  await hsc.analyze();
  p = hsc.view();
  check('HSC marathon analysis: English chapters, partial coverage said', p?.analyzed === true && p.chapters.length >= 3 && Number.isFinite(p.analyzedTo),
    `${Date.now() - t0} ms, covered to ${Math.round((p?.analyzedTo || 0) / 60)} min${(p?.chapters || []).map((c) => `\n    ${Math.round(c.t)}s ${c.title}`).join('')}`);
  console.log(`\n${rows.filter(Boolean).length}/${rows.length} pass`);
})().catch((e) => { console.error('STUDY LIVE CHECK CRASH', e); process.exit(1); });
