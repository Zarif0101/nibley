// Subtitles (QUALITY-PLAN T2). Look = TEACHING-BIBLE section 5 proposal, only DESIGN.md tokens. NEEDS ZARIF'S OK before shipping.
// One spoken line at a time, bottom-centre, 72 px above the screen bottom (clear of YouTube captions), max 2 lines.
// Moves to top-centre when a mark sits in the bottom quarter. Fades 120 ms (none with reduced motion).
// Wiring (local session, overlay.js run()): const subs = createSubtitles(document.body);
//   after `const dur = await h.started;` -> subs.show(it.text, { top: marksInBottomQuarter() });  on h.ended -> subs.hideSoon();
//   in stopAll() -> subs.hide().
const SUBTITLE_CSS = `
#subtitle { position: absolute; left: 50%; bottom: 72px; transform: translateX(-50%); max-width: 760px; box-sizing: border-box;
  padding: 8px 16px; border-radius: 8px; background: rgba(43, 58, 75, .88); color: #FFFFFF; box-shadow: 0 2px 8px rgba(43, 58, 75, .28);
  font: 600 20px/28px 'Inter'; text-align: center; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  opacity: 0; transition: opacity 120ms cubic-bezier(.3,.7,.2,1); pointer-events: none; }
#subtitle.top { bottom: auto; top: 72px; }
#subtitle.on { opacity: 1; }
@media (prefers-reduced-motion: reduce) { #subtitle { transition: none; } }`;

function createSubtitles(root = document.body) {
  if (!document.getElementById('subtitle-style')) {
    const st = document.createElement('style');
    st.id = 'subtitle-style';
    st.textContent = SUBTITLE_CSS;
    document.head.appendChild(st);
  }
  const el = document.createElement('div');
  el.id = 'subtitle';
  el.setAttribute('aria-live', 'polite');
  root.appendChild(el);
  let timer = null;
  return {
    el,
    show(text, { top = false } = {}) {
      clearTimeout(timer);
      el.textContent = text;
      el.classList.toggle('top', !!top);
      el.classList.add('on');
    },
    hideSoon(ms = 120) { clearTimeout(timer); timer = setTimeout(() => el.classList.remove('on'), ms); },
    hide() { clearTimeout(timer); el.classList.remove('on'); },
  };
}

// A mark counts as "in the bottom quarter" of the 1366x768 screen when its lowest point is below y = 576.
function markBottom(m) {
  if (m.type === 'arrow') return Math.max(m.y1, m.y2);
  if (m.type === 'highlight') return m.y + m.h;
  if (m.type === 'ring') return m.y + m.r;
  return m.y;
}
const inBottomQuarter = (marks, h = 768) => marks.some((m) => markBottom(m) > h * 0.75);

if (typeof module !== 'undefined') module.exports = { createSubtitles, inBottomQuarter, SUBTITLE_CSS };
else window.subtitles = { createSubtitles, inBottomQuarter };
