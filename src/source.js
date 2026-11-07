// "Now studying" (docs/NEXT-ROUND.md phase 1 step 5): one line naming what is on screen, put in front of every question,
// so Claude stops guessing the topic from the screenshot alone. Pure: foreground window + address bar + video in, line out.
const { clock } = require('./youtube');

const BROWSER_TAIL = /\s+-\s+(Brave|Google Chrome|Microsoft​? Edge|Personal - Microsoft​? Edge)$/i;

// fg: {title, exe, url} from the helper. video: youtube.current() (the extension's last report) or null.
function sourceLine(fg, video) {
  const url = String(fg?.url || '').trim();
  const name = String(fg?.title || '').replace(BROWSER_TAIL, '').replace(/^\(\d+\)\s+/, '').trim(); // "(3) Lecture - YouTube": unread count
  if (!name && !url) return null;
  const parts = [name || fg?.exe || '', url];
  if (video && video.videoId && url.includes(video.videoId)) parts.push(`${clock(video.t)} of ${clock(video.duration)}`);
  else if (/\.pdf\b/i.test(url)) { const page = url.match(/#page=(\d+)/i); if (page) parts.push(`page ${page[1]}`); }
  return `[Source: ${parts.filter(Boolean).join(' | ')}]`;
}

module.exports = { sourceLine };
