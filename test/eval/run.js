// Eval run (QUALITY-PLAN T9, LEARNING-ENGINE section 6): asks the real brain (Claude Code on Haiku) the 30 questions in
// questions.json over the test screenshots, scores every answer, saves test/out/eval-<date>.json for the scorecard (Q5, Q6).
// Runs on Zarif's laptop (uses his subscription: ~30 questions per run, so only when prompts change).
//   node test/eval/run.js                  normal run
//   node test/eval/run.js --baseline       mark this run as the baseline
//   node test/eval/run.js --only q01,q05   a few questions
// Env: NIBLEY_BRAIN=gemini runs the Gemini brain instead (saved as gemini-eval-<date>.json, so the scorecard's Claude
// baseline stays clean). CLAUDE_PATH (default: claude), NIBLEY_MODEL (default: haiku), NIBLEY_EFFORT (claude --effort; default: none), NIBLEY_EVAL_STYLES=0 to leave the style section out.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const GEMINI = process.env.NIBLEY_BRAIN === 'gemini';
const brain = GEMINI ? require('../../src/brain-gemini') : require('../../src/brain');
const prompt = require('../../src/prompt');
const styles = require('../../src/styles');
const { HOME } = require('../../src/learn/style');
const { snapshot } = require('../../src/learn/snapshot');
const { loadAnalogies, findAnalogies } = require('../../src/learn/analogies');
const { scoreScript, summarize } = require('./score');

const ROOT = path.join(__dirname, '..', '..');
const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const only = arg('--only') ? arg('--only').split(',') : null;
const items = JSON.parse(fs.readFileSync(path.join(__dirname, 'questions.json'), 'utf8')).filter((q) => !only || only.includes(q.id));
const analogies = loadAnalogies();
const useStyles = process.env.NIBLEY_EVAL_STYLES !== '0';

// Empty scratch vault so the eval doesn't depend on (or change) Zarif's notes.
const vault = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-eval-'));
fs.mkdirSync(path.join(vault, 'nibley'));

function askOnce(item) {
  const png = fs.readFileSync(path.join(ROOT, 'test', 'fixtures', `${item.fixture}.png`));
  const style = item.style || HOME[item.kind] || 'doodle-story';
  const analogy = findAnalogies(analogies, item.question)[0];
  const header = useStyles ? snapshot({ style, pace: { words: 16, lines: 4, rate: 0 }, analogy }) : '';
  return new Promise((resolve) => {
    const t0 = Date.now();
    let sofar = '', first_ms = null; // first_ms: first full say line, when the voice could start
    brain.ask({
      png, text: header ? `${header}\n\n${item.question}` : item.question,
      onText: (d) => { sofar += d; if (first_ms === null && /^say .*\n/m.test(sofar)) first_ms = Date.now() - t0; },
      onEnd: (full) => resolve({ script: full, ms: Date.now() - t0, first_ms, style }),
      onError: (kind, detail) => resolve({ script: '', error: `${kind}: ${detail}`, ms: Date.now() - t0, first_ms, style }),
    });
  });
}

(async () => {
  brain.start({
    model: process.env.NIBLEY_MODEL || (GEMINI ? undefined : 'haiku'), effort: process.env.NIBLEY_EFFORT,
    claudePath: process.env.CLAUDE_PATH || 'claude',
    buildPrompt: () => [prompt.build({ vaultPath: vault, apps: {}, name: 'Zarif' }), useStyles ? styles.section() : ''].filter(Boolean).join('\n\n'),
    onFatal: (e) => { console.error('brain failed:', e); process.exit(1); },
  });
  const results = [];
  for (const item of items) {
    const r = await askOnce(item);
    const s = scoreScript(r.script, item);
    results.push({ id: item.id, question: item.question, style: r.style, ms: r.ms, first_ms: r.first_ms, error: r.error, script: r.script, scores: s });
    console.log(`${item.id} ${s.score.toFixed(2)} ${r.error ? `ERROR ${r.error}` : ''}${item.question}`);
  }
  brain.stop();
  const sum = summarize(results);
  const date = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const firsts = results.map((r) => r.first_ms).filter((x) => x != null).sort((a, b) => a - b);
  const first_ms = { median: firsts[Math.floor(firsts.length / 2)], p90: firsts[Math.floor(firsts.length * 0.9)] };
  const out = { date, brain: GEMINI ? 'gemini' : 'claude', model: process.env.NIBLEY_MODEL || (GEMINI ? 'gemini-3-flash-preview' : 'haiku'), effort: process.env.NIBLEY_EFFORT || 'default', styles: useStyles, first_ms, baseline: process.argv.includes('--baseline'), ...sum, items: results };
  fs.mkdirSync(path.join(ROOT, 'test', 'out'), { recursive: true });
  const file = path.join(ROOT, 'test', 'out', `${GEMINI ? 'gemini-' : ''}eval-${date}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`\nscore ${sum.score} ${JSON.stringify(sum.scores)} first say line ${JSON.stringify(first_ms)} ms\nsaved ${path.relative(ROOT, file)}`);
})();
