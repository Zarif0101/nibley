// 3D Nibley mood loops for the status pill (QUALITY-PLAN T10, only after T0-T9 are green). Plain images, no 3D in the app:
// each mood is one horizontal WebP strip (src/overlay/mascot3d/<mood>.webp, made by design/mascot-3d/render.js --loops),
// stepped with a CSS animation. Costs almost nothing while idle. Reduced motion: first frame only.
// Wiring (local session, overlay.js status()): face.innerHTML = ''; face.append(mascotLoop(FACE[kind] || 'happy', 28)).
const LOOPS = { frames: 30, T: 2.5, moods: ['happy', 'listening', 'thinking', 'speaking', 'confused', 'excited', 'error'] };

function loopCss(size = 28, dir = 'mascot3d') {
  const w = LOOPS.frames * size;
  return `.m3d-${size} { display: block; width: ${size}px; height: ${size}px; background-repeat: no-repeat; background-size: ${w}px ${size}px;
  animation: m3d-${size} ${LOOPS.T}s steps(${LOOPS.frames}) infinite; }
@keyframes m3d-${size} { from { background-position: 0 0; } to { background-position: -${w}px 0; } }
@media (prefers-reduced-motion: reduce) { .m3d-${size} { animation: none; } }
${LOOPS.moods.map((m) => `.m3d-${size}.${m} { background-image: url(${dir}/${m}.webp); }`).join('\n')}`;
}

function mascotLoop(mood = 'happy', size = 28) {
  if (!document.getElementById(`m3d-style-${size}`)) {
    const st = document.createElement('style');
    st.id = `m3d-style-${size}`;
    st.textContent = loopCss(size);
    document.head.appendChild(st);
  }
  const el = document.createElement('span');
  el.className = `m3d-${size} ${LOOPS.moods.includes(mood) ? mood : 'happy'}`;
  el.setAttribute('aria-hidden', 'true');
  return el;
}

if (typeof module !== 'undefined') module.exports = { mascotLoop, loopCss, LOOPS };
else window.mascotLoop = mascotLoop;
