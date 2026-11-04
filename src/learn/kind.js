// What kind of question is this? (LEARNING-ENGINE 4.1). Keyword rules only, no model call. Pure.
// -> 'check' | 'problem' | 'formula' | 'visual' | 'concept'. Order matters: the first matching rule wins.

const clean = (s) => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9'+=^*/ -]+/g, ' ').replace(/\s+/g, ' ').trim();

const RULES = [
  ['check', /\b(quiz me|test me|check me|ask me|check my understanding|am i right|did i get (it|this) right)\b/],
  ['problem', /\b(how (do|would|can|should|did) (i|we|you) (solve|calculate|find|work out|get|compute|fix|debug|write|implement|code)|solve|calculate|compute|work out|find the|what('s| is) the (answer|value|result|output)|how (much|many|far|fast|long|high)|what('s| is) the (derivative|integral|limit|sum|area|speed|force) of|why (doesn't|does not|isn't) (my|this) .*(work|run|compile)|error|bug)\b/],
  ['formula', /\b(derive|derivation|prove|proof|where does .+ come from|how do (we|you) get (the|this) (formula|equation)|formula for|equation for|why is the formula)\b/],
  ['visual', /\b(graph|plot|curve|vectors?|waves?|field lines?|fields?|diagram|chart|shape|angles?|triangles?|circles?|slope|gradient|axis|axes|parabola|geometry|draw|picture|map|tree|flowchart)\b/],
];

function questionKind(text, { screenHasPlot = false } = {}) {
  const t = clean(text);
  for (const [kind, re] of RULES) if (re.test(t)) return kind;
  return screenHasPlot ? 'visual' : 'concept';
}

module.exports = { questionKind, KINDS: ['concept', 'formula', 'problem', 'visual', 'check'] };
