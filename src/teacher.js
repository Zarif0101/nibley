// Teacher talk (NEXT-ROUND C1, Zarif Q11-Q14 2026-11-08): picks a teaching style per question and learns which ones
// land for him (src/learn/style.js), and allows a "Makes sense?" check at most once every 3 answers.
// Output is the header line Claude gets before each question: "[nibley] style=board-builder check=ok again=1".
// State: <vault>/nibley/style-state.json (plain JSON, src/learn conventions).
const fs = require('node:fs');
const path = require('node:path');
const { questionKind } = require('./learn/kind');
const st = require('./learn/style');

const YES = /^\W*(yes|yeah|yep|makes sense|got it|i get it|ok(ay)?|understood|clear)\b/i;
const AGAIN = /\b(explain (it |that )?again|again,? (but )?simpler|i (still )?(don'?t|do not) (get|understand)|confus(ed|ing)|lost me|what\?*$)/i;
const EXAMPLE = /^\W*(give me an |an |one more )?example\b/i;
const CHECK_EVERY = 3; // at most one check in this many answers (Q13)

function create(vaultPath, { now = () => Date.now(), rand = Math.random } = {}) {
  const file = path.join(vaultPath, 'nibley', 'style-state.json');
  let state;
  try { state = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { state = st.createStyleState(now()); }
  state = st.decay(state, now());
  let last = null, sinceCheck = CHECK_EVERY; // last answer {kind, style, at, checked}; answers since the last check
  const save = () => { try { fs.writeFileSync(file, JSON.stringify(state)); } catch { /* vault offline: keep going in memory */ } };

  return {
    // Before a question: was it feedback on the last answer? Which style now? Returns {header, kind, style, feedback}.
    before(text) {
      let feedback = null;
      if (last && now() - last.at < 10 * 60e3) {
        feedback = AGAIN.test(text) ? 0 : EXAMPLE.test(text) ? 0.5 : last.checked && YES.test(text) ? 1 : null;
        if (feedback != null) { state = st.landed(state, { kind: last.kind, style: last.style, value: feedback, at: now() }); save(); }
      }
      const again = feedback === 0;
      const kind = again || feedback === 0.5 ? last.kind : questionKind(text);
      let style;
      if (again) { // a different style, never a repeat (Q14)
        const others = st.allowedStyles(kind).filter((s) => s !== last.style);
        style = others.includes(st.HOME[kind]) ? st.HOME[kind] : others[Math.floor(rand() * others.length)];
      } else {
        const p = st.pickStyle(state, kind, { last, now: now(), rand });
        style = p.style;
        state = st.recordPick(state, { kind, style, explore: p.explore, at: now() });
        save();
      }
      const check = sinceCheck >= CHECK_EVERY - 1 && kind !== 'check' && !again ? 'ok' : 'no';
      last = { kind, style, at: now(), checked: false, check };
      return { header: `[nibley] style=${style} check=${check}${again ? ' again=1' : ''}`, kind, style, feedback, check };
    },
    // After the answer: did it end with a check? (counts toward the once-in-3 limit)
    after({ checked }) {
      if (!last) return;
      last.checked = !!checked;
      sinceCheck = checked ? 0 : sinceCheck + 1;
    },
    get state() { return state; },
  };
}

// A "Makes sense?" check is a choices line offering "Explain again".
const isCheck = (cmd) => cmd?.type === 'choices' && cmd.options.some((o) => /explain again/i.test(o));

module.exports = { create, isCheck, CHECK_EVERY, YES, AGAIN, EXAMPLE };
