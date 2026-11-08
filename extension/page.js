// Runs inside the YouTube page (world MAIN, so it can use the player's API). Sends the video's state and its
// transcript to bridge.js with postMessage. docs/ARCHITECTURE-v2.md section 3.
(() => {
  const post = (msg) => window.postMessage({ nibley: 'page', ...msg }, location.origin);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const player = () => document.getElementById('movie_player');
  const videoId = () => (location.pathname === '/watch' ? new URL(location.href).searchParams.get('v') : null);

  // Caption requests the player makes itself carry YouTube's proof token (pot); a plain fetch of the listed
  // caption URL comes back empty (measured 2026-11-04). An observer sees them even when the timing buffer is full.
  const captionUrls = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (e.name.includes('/api/timedtext') && /[?&]pot=/.test(e.name)) captionUrls.push(e.name);
  }).observe({ type: 'resource', buffered: true });

  async function getTranscript(id) {
    const p = player(), pr = p?.getPlayerResponse?.();
    if (pr?.videoDetails?.videoId !== id) return { reason: 'player not ready' };
    const tracks = pr.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    const track = tracks.find((t) => t.languageCode?.startsWith('en') && t.kind !== 'asr') || tracks.find((t) => t.languageCode?.startsWith('en')) || tracks[0];
    if (!track) return { reason: 'no captions' };
    const mine = () => captionUrls.findLast((u) => u.includes(`v=${id}`));
    let url = mine();
    if (!url) { // switch captions on for a moment so the player fetches them, then put the viewer's setting back
      const had = p.getOption('captions', 'track') || {};
      p.loadModule?.('captions');
      p.setOption('captions', 'track', track.kind ? { languageCode: track.languageCode, kind: track.kind } : { languageCode: track.languageCode });
      for (let i = 0; i < 40 && !(url = mine()); i++) await sleep(150);
      p.setOption('captions', 'track', had.languageCode ? had : {});
    }
    if (!url) return { reason: 'player did not fetch captions' };
    const j = await fetch(url).then((r) => r.json()).catch(() => null);
    const lines = (j?.events || []).filter((e) => e.segs).map((e) => [Math.round(e.tStartMs / 100) / 10, e.segs.map((s) => s.utf8).join('').replace(/\s+/g, ' ').trim()]).filter((l) => l[1]);
    return lines.length ? { lines, lang: track.languageCode, auto: track.kind === 'asr' } : { reason: 'empty captions' };
  }

  let lastId = null, playingTimer = null, done = null, trying = false, triedAt = 0;
  async function sendTranscript(id, title, duration) {
    trying = true;
    triedAt = Date.now();
    await sleep(1500); // let the player settle on the new video first
    const r = await getTranscript(id).catch((e) => ({ reason: String(e).slice(0, 80) }));
    trying = false;
    if (lastId !== id) return;
    if (r.lines || r.reason === 'no captions') done = id; // otherwise try again on a later report (15 s apart)
    post(r.lines ? { kind: 'transcript', videoId: id, title, duration, ...r } : { kind: 'no_transcript', videoId: id, reason: r.reason });
  }
  function report() {
    const id = videoId(), p = player(), v = document.querySelector('video.html5-main-video') || document.querySelector('video');
    if (!id || !v) { if (lastId) post({ kind: 'gone' }); lastId = null; return; }
    if (p?.classList.contains('ad-showing')) return; // an ad: its time and length aren't the lecture's, captions don't load
    if (id !== lastId) { lastId = id; done = null; triedAt = 0; }
    const title = p?.getVideoData?.().title || document.title.replace(/ - YouTube$/, '');
    post({ kind: 'state', state: { videoId: id, title, t: v.currentTime, paused: v.paused, duration: v.duration || 0, rate: v.playbackRate, visible: document.visibilityState === 'visible' } });
    if (done !== id && !trying && Date.now() - triedAt > 15000) sendTranscript(id, title, v.duration || 0);
  }
  // Every 1 s while playing, every 3 s while paused (so a time link from Nibley's study page still arrives).
  const sync = () => {
    report();
    const v = document.querySelector('video');
    clearInterval(playingTimer);
    if (v) playingTimer = setInterval(report, v.paused ? 3000 : 1000);
  };
  // Commands from Nibley (via bridge.js): jump to a time on the study page.
  window.addEventListener('message', (e) => {
    if (e.source !== window || e.data?.nibley !== 'cmd' || !Number.isFinite(e.data.seek) || !videoId()) return;
    const v = document.querySelector('video.html5-main-video') || document.querySelector('video');
    if (v) v.currentTime = e.data.seek;
  });
  for (const ev of ['play', 'pause', 'seeked', 'ratechange', 'loadedmetadata']) document.addEventListener(ev, sync, true); // media events don't bubble; capture does
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('yt-navigate-finish', sync); // YouTube changes videos without reloading the page
  sync();
})();
