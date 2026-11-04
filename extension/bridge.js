// Isolated content script: page.js can't use chrome.* APIs, so this passes its messages to the service worker.
let port = null;
const connect = () => {
  port = chrome.runtime.connect({ name: 'nibley' });
  port.onDisconnect.addListener(() => { port = null; }); // the worker sleeps when idle; reconnect on the next message
};
window.addEventListener('message', (e) => {
  if (e.source !== window || e.data?.nibley !== 'page') return;
  try { (port || (connect(), port)).postMessage(e.data); } catch { connect(); port.postMessage(e.data); }
});
