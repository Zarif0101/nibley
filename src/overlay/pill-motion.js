// Status pill motion (QUALITY-PLAN T12). DESIGN.md easing cubic-bezier(.3,.7,.2,1), only existing tokens. Reduced motion: none.
// enter: pops in from where it sits (scale .82 -> 1.04 -> 1, 170 ms). morph: width glides to the new text and the mascot
// gives a small hop (190 ms). leave: shrinks and fades (140 ms).
// Wiring (local session, overlay.js status()): first show -> pillMotion.enter(s); state change while visible ->
//   pillMotion.morph(s, () => { ...set face/text... }); kind 'none' -> pillMotion.leave(s, () => (s.style.display = 'none')).
(function (root) { // own scope: overlay.js loads these as plain scripts, which share one namespace
const EASE = 'cubic-bezier(.3,.7,.2,1)';
const PILL_CSS = `
#status { transform-origin: 18px 50%; will-change: transform, opacity; }
#status .face { display: block; }
#status.listening, #status { transition: background-color 180ms ${EASE}, color 180ms ${EASE}; }
@media (prefers-reduced-motion: reduce) { #status { transition: none; } }`;
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function injectCss() {
  if (typeof document === 'undefined' || document.getElementById('pill-motion-style')) return;
  const st = document.createElement('style');
  st.id = 'pill-motion-style';
  st.textContent = PILL_CSS;
  document.head.appendChild(st);
}

const pillMotion = {
  enter(el) {
    injectCss();
    if (reducedMotion()) return null;
    return el.animate([
      { opacity: 0, transform: 'scale(.82) translateY(4px)' },
      { opacity: 1, transform: 'scale(1.04) translateY(0)', offset: 0.7 },
      { opacity: 1, transform: 'scale(1)' },
    ], { duration: 170, easing: EASE });
  },
  // apply() changes the content; the pill's width glides from old to new instead of jumping.
  morph(el, apply) {
    injectCss();
    const w0 = el.offsetWidth;
    apply();
    if (reducedMotion()) return null;
    const w1 = el.offsetWidth;
    if (w0 && w1 && w0 !== w1) el.animate([{ width: `${w0}px` }, { width: `${w1}px` }], { duration: 190, easing: EASE });
    const face = el.querySelector('.face');
    if (face) face.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-3px) scale(1.08)', offset: 0.4 }, { transform: 'translateY(0) scale(1)' }], { duration: 220, easing: EASE });
    return true;
  },
  leave(el, done = () => {}) {
    if (reducedMotion()) { done(); return null; }
    const a = el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.92)' }], { duration: 140, easing: 'ease-in' });
    a.onfinish = done;
    return a;
  },
};

const api = { pillMotion, PILL_CSS };
if (typeof module !== 'undefined') module.exports = api;
else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
