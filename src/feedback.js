// User feedback to Nibley's maker by email (brainstorm 2026-11-08-setup-for-any-agent, Q9-Q11).
// Sent through FormSubmit (free form-to-email; no key or password stored in Nibley). TO is FormSubmit's random alias,
// so Zarif's address isn't in the public repo.
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const TO = '99aac1b2865cfe8b13f317273b729c0b'; // FormSubmit alias for Nibley's maker (activated 2026-11-09); the address itself stays out of the repo
const FORM = 'https://github.com/Zarif0101/nibley'; // FormSubmit ties the activated form to this page
const VERSION = require('../package.json').version;

// Recent problems from today's log, so he never has to describe technical details.
function recentErrors(logDir, n = 12) {
  try {
    const file = path.join(logDir, `nibley-${new Date().toLocaleDateString('sv')}.log`);
    return fs.readFileSync(file, 'utf8').trim().split('\n').slice(-400)
      .filter((l) => /"ev":"[a-z_]*(error|crash|fail|fatal|limit)[a-z_]*"/.test(l)).slice(-n).join('\n');
  } catch { return ''; }
}

// kind: 'feedback' (the button) or 'not helpful' (rating). Returns {ok, message}.
async function send({ kind = 'feedback', message, name, brain, png, logDir, fetchFn = fetch }) {
  const text = String(message || '').trim().slice(0, 5000);
  if (!text) return { ok: false, message: 'Write something first.' };
  const details = [`Nibley ${VERSION}`, `Brain: ${brain || 'claude'}`, `Windows ${os.release()}`, `Time: ${new Date().toISOString()}`].join(' | ');
  const form = new FormData();
  form.append('_subject', `Nibley ${kind} from ${String(name || 'a user').slice(0, 40)}`);
  form.append('_template', 'box');
  form.append('_captcha', 'false');
  form.append('Kind', kind);
  form.append('Message', text);
  form.append('Details', details);
  const errs = logDir ? recentErrors(logDir) : '';
  if (errs) form.append('Recent problems', errs);
  if (png) form.append('attachment', new Blob([png], { type: 'image/png' }), 'screen.png');
  if (process.env.NIBLEY_SETTINGS && fetchFn === fetch) { // test runs never email anyone
    sent.push({ kind, text, details, png: !!png });
    return { ok: true, message: 'Sent. Thank you!' };
  }
  try {
    const r = await fetchFn(`https://formsubmit.co/ajax/${TO}`, { method: 'POST', body: form, headers: { Accept: 'application/json', Referer: FORM, Origin: 'https://github.com' } });
    const j = await r.json().catch(() => ({}));
    const ok = r.ok && String(j.success) === 'true';
    return { ok, message: ok ? 'Sent. Thank you!' : `Couldn't send (${j.message || r.status}). Try again later.` };
  } catch (e) {
    return { ok: false, message: "Couldn't send: no internet? Try again later." };
  }
}

// Thumbs after answers: at most 1 answer in 3, never on an answer that already shows buttons.
function createRater({ every = 3 } = {}) {
  let since = every - 1; // the first plain answer can be rated
  return {
    due({ hadButtons }) {
      if (hadButtons) return false;
      since++;
      if (since < every) return false;
      since = 0;
      return true;
    },
  };
}

const sent = []; // tests: what would have been emailed

module.exports = { send, createRater, recentErrors, VERSION, sent };
