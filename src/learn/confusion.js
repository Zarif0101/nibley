// Confusion detector: a rolling score over recent viewing behaviour. Pure, JSON-serialisable.
// Research: research/2026-11-04-quizzes-hints-teachback-confusion.md. Numbers are starting guesses to tune.
// Event times (`at`, `duration`) are milliseconds; seek positions (`from`, `to`) are video seconds.

const PARAMS = {
  windowMs: 3 * 60000, // only events this recent count
  threshold: 3, // offer at or above this score
  maxOffers: 3, // per session
  minGapMs: 5 * 60000, // between offers
  cooldownMs: 15 * 60000, // quiet time after two dismissals in a row
  repeatSpanSec: 15, // seek-backs landing this close together are the same span
  slideGraceMs: 2000, // a seek-back this soon after a slide change is re-reading
  pauseMs: 20000, // a pause longer than this counts
  silenceMs: 15000, // silence after a question longer than this counts
  points: { seekBack: 1, seekBackRepeat: 2, pause: 1, speedDown: 1, wrong: 2, silence: 1 },
};

const createDetector = () => ({ version: 1, events: [], offers: [] });

const addEvent = (d, event) => ({ ...d, events: [...d.events, { ...event }] });

function score(d, now = Date.now()) {
  const P = PARAMS.points;
  const events = d.events.filter((e) => e.at <= now && now - e.at <= PARAMS.windowMs).sort((a, b) => a.at - b.at);
  const rewatched = []; // `to` of earlier counted seek-backs
  let total = 0;
  for (const e of events) {
    if (e.type === 'seek-back') {
      const afterSlide = events.some((s) => s.type === 'slide-change' && e.at - s.at >= 0 && e.at - s.at <= PARAMS.slideGraceMs);
      if (afterSlide) continue;
      const again = rewatched.some((to) => Math.abs(to - e.to) <= PARAMS.repeatSpanSec);
      total += again ? P.seekBackRepeat : P.seekBack;
      rewatched.push(e.to);
    } else if (e.type === 'pause') total += e.duration > PARAMS.pauseMs ? P.pause : 0;
    else if (e.type === 'speed-down') total += P.speedDown;
    else if (e.type === 'wrong') total += P.wrong;
    else if (e.type === 'silence') total += e.duration > PARAMS.silenceMs ? P.silence : 0;
  }
  return total;
}

function shouldOffer(d, now = Date.now()) {
  if (score(d, now) < PARAMS.threshold) return false;
  if (d.offers.length >= PARAMS.maxOffers) return false;
  const last = d.offers[d.offers.length - 1];
  if (!last) return true;
  if (now - last.at < PARAMS.minGapMs) return false;
  const lastTwo = d.offers.slice(-2);
  const dismissedTwice = lastTwo.length === 2 && lastTwo.every((o) => !o.accepted);
  return !(dismissedTwice && now - last.at < PARAMS.cooldownMs);
}

const recordOffer = (d, { at = Date.now(), accepted = false } = {}) => ({ ...d, offers: [...d.offers, { at, accepted: !!accepted }] });

module.exports = { PARAMS, createDetector, addEvent, score, shouldOffer, recordOffer };
