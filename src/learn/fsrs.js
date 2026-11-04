// FSRS-6 scheduler, reimplemented from the published formulas (open-spaced-repetition, MIT;
// research/2026-11-04-spaced-repetition.md section 1, checked against ts-fsrs 6.0.0).
// Pure: a card in, a new card out. R is computed live from `last`, never stored.

const FSRS_PARAMS = [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542];
const GRADE = { again: 1, hard: 2, good: 3, easy: 4 };

const DAY = 86400000;
const S_MIN = 0.001;
const S_MAX = 36500;
const w = FSRS_PARAMS;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const decay = -w[20];
const factor = Math.pow(0.9, 1 / decay) - 1;

const createCard = (id, topic, now) => ({ id, topic, state: 'new', stability: 0, difficulty: 0, reps: 0, lapses: 0, last: null, due: now });

// R = 0.9 when t = S. A card never reviewed counts as fully remembered (nothing to forget yet).
function retrievability(card, now) {
  if (card.state === 'new' || card.last === null) return 1;
  const t = Math.max(0, (now - card.last) / DAY);
  return Math.pow(1 + (factor * t) / card.stability, decay);
}

function interval(stability, retention = 0.9) {
  const days = Math.round((stability / factor) * (Math.pow(retention, 1 / decay) - 1));
  return clamp(days, 1, S_MAX);
}

const initDifficulty = (g) => w[4] - Math.exp((g - 1) * w[5]) + 1;

function nextDifficulty(d, g) {
  const damped = d + (-w[6] * (g - 3) * (10 - d)) / 9;
  return clamp(w[7] * initDifficulty(4) + (1 - w[7]) * damped, 1, 10);
}

function nextStability(d, s, r, g, sameDay) {
  if (sameDay) {
    const mult = Math.pow(s, -w[19]) * Math.exp(w[17] * (g - 3 + w[18]));
    return clamp(s * (g >= 2 ? Math.max(mult, 1) : mult), S_MIN, S_MAX);
  }
  if (g === 1) {
    const lapse = w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp(w[14] * (1 - r));
    return clamp(Math.min(lapse, s / Math.exp(w[17] * w[18])), S_MIN, S_MAX);
  }
  const hard = g === 2 ? w[15] : 1;
  const easy = g === 4 ? w[16] : 1;
  const grow = Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp(w[10] * (1 - r)) - 1) * hard * easy;
  return clamp(s * (1 + grow), S_MIN, S_MAX);
}

function rate(card, grade, now, { retention = 0.9 } = {}) {
  if (![1, 2, 3, 4].includes(grade)) throw new Error('rate: grade must be 1, 2, 3 or 4');
  let stability;
  let difficulty;
  if (card.state === 'new') {
    stability = clamp(w[grade - 1], S_MIN, S_MAX);
    difficulty = clamp(initDifficulty(grade), 1, 10);
  } else {
    const t = Math.max(0, (now - card.last) / DAY);
    stability = nextStability(card.difficulty, card.stability, retrievability(card, now), grade, t < 1);
    difficulty = nextDifficulty(card.difficulty, grade);
  }
  return {
    ...card,
    state: 'review',
    stability,
    difficulty,
    reps: card.reps + 1,
    lapses: card.lapses + (grade === 1 && card.state !== 'new' ? 1 : 0),
    last: now,
    due: now + interval(stability, retention) * DAY,
  };
}

// The model judges `correct`; a bare "got it" is not an answer.
function gradeFromAnswer({ correct, hintLevel = 0, sure, tooEasy } = {}) {
  if (!correct || hintLevel >= 3) return GRADE.again;
  if (hintLevel > 0 || sure === false) return GRADE.hard;
  return tooEasy ? GRADE.easy : GRADE.good;
}

module.exports = { FSRS_PARAMS, GRADE, createCard, retrievability, rate, interval, gradeFromAnswer };
