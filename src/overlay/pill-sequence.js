// Status pill sequencer (QUALITY-PLAN T12). Pure: inject now() and timers.
// Why: today the Listening pill waits for the screenshot (~0.9 s) and is skipped when he lets go first, so the pill
// seems to appear at random. Now every press shows the same order, each state for at least minMs:
//   press -> (screen grabbed) listening -> thinking -> speaking -> none
// The pill can't show before the screenshot is taken (it would be in the picture), so press() blocks the queue
// and ready() opens it. Errors and short messages jump the queue.
(function (root) { // own scope: overlay.js loads these as plain scripts, which share one namespace
const ORDER = { listening: 1, thinking: 2, speaking: 3 };

function createPillSequencer(show, { minMs = 350, now = () => Date.now(), setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  let current = 'none', shownAt = -Infinity, queue = [], timer = null, blocked = false;

  function apply(kind, text) { current = kind; shownAt = now(); show(kind, text); }
  function flush() {
    timer = null;
    if (blocked || !queue.length) return;
    const wait = current === 'none' ? 0 : shownAt + minMs - now();
    if (wait > 0) { timer = setTimer(flush, wait); return; }
    const next = queue.shift();
    apply(next.kind, next.text);
    if (queue.length) flush();
  }
  function enqueue(kind, text) {
    // Never go backwards or repeat: drop queued states that come at or after this one in the order.
    if (ORDER[kind]) queue = queue.filter((q) => ORDER[q.kind] && ORDER[q.kind] < ORDER[kind]);
    // Never skip Listening: a press always shows it first, even if he let go before the screen was grabbed.
    if (ORDER[kind] > ORDER.listening && !ORDER[current] && !queue.some((q) => q.kind === 'listening')) queue.unshift({ kind: 'listening', text: 'Listening' });
    queue.push({ kind, text });
    clearTimer(timer);
    flush();
  }

  return {
    // New hotkey press: forget the old turn, wait for the screenshot before showing anything.
    press() { clearTimer(timer); timer = null; queue = []; blocked = true; if (current !== 'none') apply('none', ''); },
    // Screen grabbed: the pill may appear now.
    ready() { blocked = false; if (!queue.length) queue.push({ kind: 'listening', text: 'Listening' }); flush(); },
    push(kind, text = '') {
      if (kind === 'error' || kind === 'msg') { clearTimer(timer); timer = null; queue = []; blocked = false; return apply(kind, text); }
      if (kind === 'none') { queue.push({ kind: 'none', text: '' }); clearTimer(timer); return flush(); }
      if (ORDER[current] >= ORDER[kind]) return; // already there or past it
      enqueue(kind, text);
    },
    get current() { return current; },
    get pending() { return queue.map((q) => q.kind); },
  };
}

const api = { createPillSequencer };
if (typeof module !== 'undefined') module.exports = api;
else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
