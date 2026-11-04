// Short voice commands and feedback phrases (QUALITY-PLAN T4, LEARNING-ENGINE section 2). Pure.
// matchCommand only fires when the whole utterance is the command, so "again, what is a vector?" stays a question.
// Wiring (local session, src/main.js handleText, next to "save this"): const c = matchCommand(text); if (c) return onCommand(c);

const clean = (s) => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const PLEASE = "(?:please |can you |could you |nibley )*";
const TAIL = "(?: please| nibley| thanks)*";
const rx = (body) => new RegExp(`^${PLEASE}(?:${body})${TAIL}$`);

const COMMANDS = [
  ['again', rx("say (?:that|it) again|again|repeat(?: that| it)?|one more time|come again|what did you say")],
  ['slower', rx("slower|slow down|(?:speak|talk|go) slower|(?:you're |you are |that's )?too fast")],
  ['faster', rx("faster|speed up|(?:speak|talk|go) faster|(?:you're |you are |that's )?too slow")],
  ['shorter', rx("shorter|(?:a )?short(?:er)? version|tl ?dr|keep it short|summari[sz]e(?: that| it)?|in short")],
  ['more', rx("more detail|more details|explain more|go deeper|tell me more|more")],
  ['gotit', rx("got it|makes sense|that makes sense|(?:ok|okay) (?:got it|thanks|thank you)|thanks|thank you|i get it|understood|i understand")],
  ['lost', rx("what|huh|i don't get it|i don't understand(?: it| that)?|i'm (?:lost|confused)|i am (?:lost|confused)|that didn't make sense")],
];

// -> 'again' | 'slower' | 'faster' | 'shorter' | 'more' | 'gotit' | 'lost' | null
function matchCommand(text) {
  const t = clean(text);
  if (!t || t.split(' ').length > 8) return null;
  for (const [name, re] of COMMANDS) if (re.test(t)) return name;
  return null;
}

// "explain it like a story", "step by step", "exam style", "show me", "quiz me": a style for this one answer.
const STYLES = [
  ['doodle-story', /\b(like a story|as a story|tell (it|me) a story|story ?time|with a stick ?figure|doodle)\b/],
  ['board-builder', /\b(step by step|step-by-step|derive|derivation|on the board|line by line|show (the )?working)\b/],
  ['exam-coach', /\b(exam style|for the exam|exam trick|how (would|will) (they|it) (be )?test|shortcut|quick trick)\b/],
  ['picture-first', /\b(show me visually|visuali[sz]e( it)?|draw it|picture it|the intuition|intuitively)\b/],
  ['question-buddy', /\b(quiz me|test me|check me|ask me|check my understanding)\b/],
];
function styleRequest(text) {
  const t = clean(text);
  for (const [style, re] of STYLES) if (re.test(t)) return style;
  return null;
}

module.exports = { matchCommand, styleRequest };
