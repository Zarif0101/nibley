// Service worker: forwards page reports to Nibley on 127.0.0.1. config.js (written by Nibley at start) sets NIBLEY.
importScripts('config.js');

async function send(body) {
  try {
    const r = await fetch(`http://127.0.0.1:${NIBLEY.port}/state`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-nibley-token': NIBLEY.token },
      body: JSON.stringify(body),
    });
    return await r.json(); // Nibley's reply can carry a command for this tab, e.g. {seek: 125}
  } catch { return {}; } // Nibley isn't running: drop it, the next report brings it up to date
}

chrome.runtime.onConnect.addListener((port) => {
  const tabId = port.sender?.tab?.id;
  port.onMessage.addListener(async (m) => {
    const r = await send({ ...m, tabId });
    if (Number.isFinite(r?.seek)) try { port.postMessage({ seek: r.seek }); } catch {} // the tab may have gone
  });
});
chrome.tabs.onRemoved.addListener((tabId) => send({ kind: 'gone', tabId }));
