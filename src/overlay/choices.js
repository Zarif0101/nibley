// Click-to-answer buttons (QUALITY-PLAN T13). When Nibley asks something ("Should I pause the video?", "Want a twin
// problem?", "Try this as a story?"), up to 3 buttons appear right above the subtitle. Click one, or press Enter for the
// first, 2 / 3 for the others, Esc to dismiss. A pick counts exactly as if he had said the option out loud.
// The hotkey and voice always still work. Buttons go away after 15 s, on a pick, or on the next hotkey press.
// Look: DESIGN.md tokens only (brand board buttons): first = deep filled, others = white with a deep outline.
// Wiring (local session): overlay.html loads this; overlay.js shows it on item {kind: 'choices', options}; picks go to main
// via ipcRenderer.send('choice', text) -> handleText(text). Clicks need the overlay to stop ignoring the mouse over the
// buttons: setIgnoreMouseEvents(true, { forward: true }) and toggle it from mouseenter/mouseleave on the button row.
(function (root) { // own scope: overlay.js loads these as plain scripts, which share one namespace
const CHOICES_CSS = `
#choices { position: absolute; left: 50%; bottom: 128px; transform: translateX(-50%); display: none; gap: 8px; z-index: 5; }
#choices.top { bottom: auto; top: 128px; }
#choices.on { display: flex; }
#choices button { font: 600 14px/20px 'Inter'; border-radius: 8px; padding: 8px 14px; cursor: pointer; box-shadow: 0 2px 8px rgba(43, 58, 75, .28);
  border: 1.5px solid #1E6FEB; background: #FFFFFF; color: #1E6FEB; display: flex; align-items: center; gap: 8px; }
#choices button.primary { background: #1E6FEB; color: #FFFFFF; }
#choices button:hover { border-color: #2F8BFF; }
#choices button:focus-visible { outline: 2px solid #2F8BFF; outline-offset: 2px; }
#choices .key { font: 400 12px/16px 'Inter'; opacity: .75; border: 1px solid currentColor; border-radius: 4px; padding: 0 4px; }`;
const TIMEOUT_MS = 15000;
const EASE = 'cubic-bezier(.3,.7,.2,1)';

function createChoices(root, onPick, { timeoutMs = TIMEOUT_MS, onHide = () => {} } = {}) {
  if (!document.getElementById('choices-style')) {
    const st = document.createElement('style');
    st.id = 'choices-style';
    st.textContent = CHOICES_CSS;
    document.head.appendChild(st);
  }
  const row = document.createElement('div');
  row.id = 'choices';
  row.setAttribute('role', 'group');
  root.appendChild(row);
  let options = [], timer = null;

  function hide() { const was = options.length > 0; clearTimeout(timer); row.classList.remove('on'); row.innerHTML = ''; options = []; if (was) onHide(); }
  function pick(i) {
    if (i < 0 || i >= options.length) return false;
    const text = options[i];
    hide();
    onPick(text, i);
    return true;
  }
  return {
    el: row,
    get visible() { return options.length > 0; },
    show(opts, { top = false } = {}) {
      hide();
      options = opts.slice(0, 3);
      row.classList.toggle('top', !!top);
      options.forEach((text, i) => {
        const b = document.createElement('button');
        b.className = i === 0 ? 'primary' : '';
        b.textContent = text;
        const k = document.createElement('span');
        k.className = 'key';
        k.textContent = i === 0 ? 'Enter' : String(i + 1);
        b.appendChild(k);
        // mouseup, not click: Windows eats the mousedown on the non-focusable overlay (measured 2026-11-05), so click never fires
        b.addEventListener('mouseup', (e) => e.button === 0 && pick(i));
        row.appendChild(b);
      });
      row.classList.add('on');
      if (row.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        row.animate([{ opacity: 0, transform: 'translateX(-50%) translateY(6px)' }, { opacity: 1, transform: 'translateX(-50%) translateY(0)' }], { duration: 180, easing: EASE });
      }
      timer = setTimeout(hide, timeoutMs);
    },
    hide,
    // Keyboard while the buttons show (keys come from the helper, see QUALITY-PLAN T13). Returns true if used.
    key(name) {
      if (!options.length) return false;
      if (name === 'Enter') return pick(0);
      if (name === 'Escape') { hide(); return true; }
      if (/^[1-3]$/.test(name)) return pick(Number(name) - 1);
      return false;
    },
  };
}

const api = { createChoices, CHOICES_CSS };
if (typeof module !== 'undefined') module.exports = api;
else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
