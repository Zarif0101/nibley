// Floating sidebar + edge tab (docs/NEXT-ROUND.md phase 2, changed 2026-11-08: floats over the screen, no docking).
// Opens over the right edge; a click anywhere else (blur), Esc, the X, the tab, Win+Shift+`, the tray or "close sidebar" closes it.
// Width: drag the left edge (300-560 px), saved as settings.sidebarWidth.
const path = require('node:path');
const { BrowserWindow, screen } = require('electron');

const TAB = { w: 40, h: 48, top: 84 };
let win = null, tab = null, cfg = null, hiddenAt = 0, pinning = false, saveTimer = null;

const area = () => screen.getPrimaryDisplay().workArea;
const width = () => Math.min(560, Math.max(300, cfg.settings.sidebarWidth || 360));

function placeTab(open) {
  if (!tab || tab.isDestroyed()) return;
  const a = area(), x = a.x + a.width - TAB.w - (open ? win.getBounds().width : 0);
  tab.setBounds({ x, y: a.y + TAB.top, width: TAB.w, height: TAB.h });
  tab.webContents.send('tab:open', open);
}

function pin() { // full work-area height on the right edge, whatever the drag did
  const a = area(), w = width();
  pinning = true;
  win.setBounds({ x: a.x + a.width - w, y: a.y, width: w, height: a.height });
  pinning = false;
}

function create(opts) {
  cfg = opts;
  const prefs = { nodeIntegration: true, contextIsolation: false };
  win = new BrowserWindow({
    width: width(), height: area().height, frame: false, show: false, skipTaskbar: true, resizable: true, movable: false,
    minimizable: false, maximizable: false, fullscreenable: false, alwaysOnTop: true, backgroundColor: '#F7FAFF',
    minWidth: 300, maxWidth: 560, title: 'Nibley', webPreferences: prefs,
  });
  win.setAlwaysOnTop(true, 'pop-up-menu'); // over the browser, under the overlay's cards
  win.loadFile(path.join(__dirname, 'overlay', 'sidebar.html'));
  win.on('blur', () => { if (win.isVisible()) close('click-away'); });
  win.on('resize', () => {
    if (pinning) return;
    cfg.settings.sidebarWidth = Math.min(560, Math.max(300, win.getBounds().width));
    pin();
    placeTab(true);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(cfg.save, 300); // once the drag settles
  });
  win.on('close', (e) => { if (!cfg.quitting()) { e.preventDefault(); close('x'); } });

  tab = new BrowserWindow({
    width: TAB.w, height: TAB.h, frame: false, transparent: true, show: false, skipTaskbar: true, resizable: false, movable: false,
    focusable: false, alwaysOnTop: true, hasShadow: false, backgroundColor: '#00000000', webPreferences: prefs,
  });
  tab.setAlwaysOnTop(true, 'pop-up-menu');
  tab.loadFile(path.join(__dirname, 'overlay', 'sidebar-tab.html'));
  tab.once('ready-to-show', () => { placeTab(false); tab.showInactive(); });
  screen.on('display-metrics-changed', () => { if (win.isVisible()) pin(); placeTab(win.isVisible()); });
}

function open(how, section) {
  pin();
  win.show();
  win.focus();
  if (section) win.webContents.send('sidebar:section', section);
  placeTab(true);
  cfg.log({ ev: 'sidebar', open: true, how });
}
function close(how) {
  if (!win.isVisible()) return;
  win.hide();
  hiddenAt = Date.now();
  placeTab(false);
  cfg.log({ ev: 'sidebar', open: false, how });
}
// A click on the tab blurs the open sidebar first (that closes it); don't let the same click open it again.
function toggle(how, section) {
  if (win.isVisible()) return close(how);
  if (how === 'tab' && Date.now() - hiddenAt < 400) return;
  open(how, section);
}

module.exports = {
  create, open, close, toggle,
  isOpen: () => !!win && win.isVisible(),
  get win() { return win; }, get tab() { return tab; },
  hideTab: () => tab?.hide(), showTab: () => tab?.showInactive(),
};
