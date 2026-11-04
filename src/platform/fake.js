// In-memory platform for tests: never touches the real mouse or keyboard.
const calls = [];
const pttListeners = [], clickListeners = [];
const elements = []; // [{box:[x,y,w,h], name, isPassword}]
let focusedPassword = false;

const rec = (...c) => { calls.push(c); };

module.exports = {
  calls, elements,
  start: async () => {},
  stop() {},
  onError() {},
  onPtt(cb) { pttListeners.push(cb); },
  async click(x, y) { rec('click', x, y); },
  async type(text) { rec('type', text); },
  async key(name) { rec('key', name); },
  async scroll(dir, n) { rec('scroll', dir, n); },
  async elementAt(x, y) {
    const e = elements.find(({ box: [bx, by, bw, bh] }) => x >= bx && x <= bx + bw && y >= by && y <= by + bh);
    return e ? { ...e } : { name: '' };
  },
  async focusedIsPassword() { return focusedPassword; },
  onMouseClick(cb) {
    clickListeners.push(cb);
    return () => clickListeners.splice(clickListeners.indexOf(cb), 1);
  },
  foregroundWin: { title: 'Lecture - YouTube - Brave', exe: 'brave' },
  micApps: [],
  async foreground() { return { ...module.exports.foregroundWin }; },
  async micUsers() { return [...module.exports.micApps]; },
  async openUrl(url) { rec('openUrl', url); },
  async openApp(exe) { rec('openApp', exe); },
  async ping() {},
  // Test controls
  emitPtt(ev) { pttListeners.forEach((cb) => cb(ev)); },
  emitClick(x, y) { clickListeners.slice().forEach((cb) => cb(x, y)); },
  setFocusedPassword(v) { focusedPassword = v; },
  reset() { calls.length = 0; elements.length = 0; focusedPassword = false; },
};
