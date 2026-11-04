// Answer guard (QUALITY-PLAN T6): fixes what the prompt can't guarantee, one parsed script command at a time. Pure.
// Wiring (local session, src/main.js onCmd): const r = ctx.lint.check(cmd); r.fixes.forEach((rule) => log({ ev: 'lint', rule, turn: ctx.id }));
//   if (!r.cmd) return; if (r.fadeOldest) send('item', ctx.id, { kind: 'fade-oldest' }); then handle r.cmd as before.
// Create one guard per turn: ctx.lint = createLint().

const MARKS = new Set(['ring', 'point', 'arrow', 'highlight', 'label']);
const FILLER = /^(great|good|nice|excellent) question[,.!]?\s+|^(sure|okay|ok|alright|so)[,.!]?\s+(so[,.]?\s+)?/i;
const BANNED = /\b(easy|easily|obviously|just|simply)\b/i;

const words = (s) => s.trim().split(/\s+/).filter(Boolean);

// Cut a long line at the last comma/full stop before the limit (if that keeps at least 4 words), else at the limit.
function shorten(text, max) {
  const w = words(text);
  if (w.length <= max) return text;
  for (let i = max - 1; i >= 3; i--) if (/[,.;:!?]$/.test(w[i])) return w.slice(0, i + 1).join(' ').replace(/[,;:]$/, '.');
  return w.slice(0, max).join(' ') + '…';
}

function createLint({ maxSay = 6, maxWords = 24, maxMarks = 3 } = {}) {
  let says = 0, visible = 0;
  return {
    check(cmd) {
      const fixes = [];
      if (!cmd) return { cmd, fixes };
      if (cmd.type === 'say') {
        if (says >= maxSay) return { cmd: null, fixes: ['too_many_lines'] };
        let text = cmd.text;
        if (says === 0 && FILLER.test(text)) {
          const cut = text.replace(FILLER, '');
          if (words(cut).length >= 2) { text = cut[0].toUpperCase() + cut.slice(1); fixes.push('filler'); }
        }
        if (words(text).length > maxWords) { text = shorten(text, maxWords); fixes.push('long_line'); }
        if (BANNED.test(text)) fixes.push('banned_word'); // logged only: removing "just" can change the meaning
        says++;
        return { cmd: text === cmd.text ? cmd : { ...cmd, text }, fixes };
      }
      if (cmd.type === 'clear') { visible = 0; return { cmd, fixes }; }
      if (MARKS.has(cmd.type)) {
        visible++;
        if (visible > maxMarks) { visible = maxMarks; return { cmd, fixes: ['too_many_marks'], fadeOldest: true }; }
      }
      return { cmd, fixes };
    },
    get counts() { return { says, visible }; },
  };
}

module.exports = { createLint, shorten, FILLER, BANNED };
