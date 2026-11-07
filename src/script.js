// Parser for the line script Claude writes (ARCHITECTURE.md section 4). Pure: no I/O.

const SCREEN = { w: 1366, h: 768 };
const COMMANDS = new Set(['say', 'note', 'point', 'ring', 'arrow', 'highlight', 'label', 'step', 'wait_click', 'action', 'title', 'clear', 'choices']);
const ACTIONS = new Set(['click', 'type', 'key', 'scroll', 'open_url', 'open_app']);

const nums = (s) => (s.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(v)));
const words = (s, n) => s.trim().split(/\s+/).slice(0, n).join(' ');

// One line in, one command object out (or null for blank/fence lines, or {type:'bad'}).
function parseLine(raw, screen = SCREEN) {
  const line = raw.trim().replace(/^[-*]\s+/, '');
  if (!line || line.startsWith('```')) return null;
  const [word] = line.split(/\s+/, 1);
  const cmd = word.toLowerCase();
  if (!COMMANDS.has(cmd)) return { type: 'say', text: line, prose: true };
  const rest = line.slice(word.length).trim();
  const bad = (why) => ({ type: 'bad', line, why });
  const X = (v) => clamp(v, 0, screen.w - 1), Y = (v) => clamp(v, 0, screen.h - 1);

  if (cmd === 'say' || cmd === 'title') return rest ? { type: cmd, text: rest } : bad('empty');
  if (cmd === 'clear') return { type: 'clear' };
  // choices Yes | No  -> click-to-answer buttons for the question just asked (QUALITY-PLAN T13): 2-3 options, ≤ 4 words each.
  if (cmd === 'choices') {
    const options = [...new Set(rest.split('|').map((o) => words(o.trim().replace(/^["']|["']$/g, ''), 4)).filter(Boolean))].slice(0, 3);
    return options.length >= 2 ? { type: 'choices', options } : bad('choices needs 2 or 3 options');
  }
  if (cmd === 'action') return parseAction(rest, X, Y) || bad('bad action');
  // note <x> <y> <w> <h> | <title> | <text>  -> a note card with a drawn line to the box (NEXT-ROUND phase 3 v2, 2026-11-08)
  if (cmd === 'note') {
    const [head, t = '', v = ''] = rest.split('|');
    const n = nums(head);
    if (n.length < 4) return bad('missing numbers');
    const x = X(n[0]), y = Y(n[1]), title = words(t, 5), text = words(v, 12);
    return { type: 'note', x, y, w: clamp(n[2], 4, screen.w - x), h: clamp(n[3], 4, screen.h - y), title: title || undefined, text: text || undefined };
  }

  const bar = rest.indexOf('|');
  const head = bar < 0 ? rest : rest.slice(0, bar);
  const tail = bar < 0 ? '' : rest.slice(bar + 1).trim();
  const label = tail ? words(tail, 6) : undefined;
  const n = nums(head);
  if (n.some(Number.isNaN)) return bad('NaN');
  const need = { point: 2, ring: 2, arrow: 4, highlight: 4, label: 2, step: 3, wait_click: 2 }[cmd];
  if (n.length < need) return bad('missing numbers');

  switch (cmd) {
    case 'point': return { type: 'point', x: X(n[0]), y: Y(n[1]), label };
    case 'ring': return { type: 'ring', x: X(n[0]), y: Y(n[1]), r: clamp(n[2] ?? 40, 28, 300), label };
    case 'arrow': return { type: 'arrow', x1: X(n[0]), y1: Y(n[1]), x2: X(n[2]), y2: Y(n[3]), label };
    case 'highlight': {
      const x = X(n[0]), y = Y(n[1]);
      return { type: 'highlight', x, y, w: clamp(n[2], 4, screen.w - x), h: clamp(n[3], 4, screen.h - y), label };
    }
    case 'label': {
      const text = label || words(head.replace(/^\s*-?[\d.]+[\s,]+-?[\d.]+[\s,]*/, ''), 6);
      return text ? { type: 'label', x: X(n[0]), y: Y(n[1]), text } : bad('empty label');
    }
    case 'step': return { type: 'step', n: clamp(n[0], 1, 99), x: X(n[1]), y: Y(n[2]), label };
    case 'wait_click': return { type: 'wait_click', x: X(n[0]), y: Y(n[1]) };
  }
}

function parseAction(rest, X, Y) {
  const [kind, ...args] = rest.split(/\s+/);
  const k = (kind || '').toLowerCase();
  if (!ACTIONS.has(k)) return null;
  const argStr = rest.slice(kind.length).trim();
  if (k === 'click') {
    const n = nums(argStr);
    return n.length >= 2 ? { type: 'action', kind: k, x: X(n[0]), y: Y(n[1]) } : null;
  }
  if (k === 'scroll') {
    const dir = (args[0] || '').toLowerCase();
    return { type: 'action', kind: k, dir, n: clamp(Number(args[1]) || 3, 1, 20) };
  }
  if (k === 'type') return argStr ? { type: 'action', kind: k, text: argStr.replace(/^"(.*)"$/, '$1').replace(/\\n$/, '\n') } : null;
  if (k === 'key') return args[0] ? { type: 'action', kind: k, name: args[0].toLowerCase() } : null;
  if (k === 'open_url') return args[0] ? { type: 'action', kind: k, url: args[0] } : null;
  if (k === 'open_app') return argStr ? { type: 'action', kind: k, name: argStr.toLowerCase() } : null;
}

// Streaming wrapper: feed text deltas, get commands as each line completes.
function createParser(onCmd, { onBad = () => {}, maxSay = 8, screen = SCREEN } = {}) {
  let buf = '', says = 0;
  const line = (l) => {
    const c = parseLine(l, screen);
    if (!c) return;
    if (c.type === 'bad') return onBad(c);
    if (c.type === 'say' && ++says > maxSay) return onBad({ ...c, why: 'say cap' });
    onCmd(c);
  };
  return {
    push(chunk) {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) { line(buf.slice(0, i)); buf = buf.slice(i + 1); }
    },
    end() { if (buf) line(buf); buf = ''; },
  };
}

// Whole script text to command list (lesson replay, tests).
function parseAll(text, opts) {
  const out = [];
  const p = createParser((c) => out.push(c), opts);
  p.push(text);
  p.end();
  return out;
}

module.exports = { parseLine, createParser, parseAll, SCREEN };
