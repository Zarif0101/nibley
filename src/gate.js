// Safety gate for actions (BUILD-PLAN 4.9). Pure: the caller gathers UI Automation info first.

const KEYS = ['media_play_pause', 'space', 'k', 'f', 'left', 'right', 'up', 'down', 'pageup', 'pagedown', 'home', 'end', 'tab', 'escape'];
const DELETE = /\b(delete|remove|trash|discard|uninstall)/i;
const SEND = /\b(send|post|publish|submit|reply|comment|share|tweet)/i;
const PAY = /\b(pay|buy|checkout|purchase|order|subscribe|donate)/i;
const CHECKOUT_URL = /checkout|\/cart\b|\/pay\b|\/payment|\/billing|\/buy\b/i;
const CARD_DIGITS = /(?:\d[ -]?){13,19}/;
const KEY_WORDS = { media_play_pause: 'pause or play the video', k: 'pause or play the video', f: 'switch full screen', space: 'press space' };

const no = (say) => ({ ok: false, say });
const MINE = "that's yours to do.";

// action: parsed {kind,...}. info: {name, isPassword} from UI Automation (name '' when unknown).
// settings: {mode:'ask'|'auto', apps:{}}. Returns {ok:false, say} or {ok:true, ask, describe}.
function check(action, info = {}, settings = {}) {
  const name = (info.name || '').trim();
  const ask = settings.mode !== 'auto';
  const yes = (describe) => ({ ok: true, ask, describe });

  switch (action.kind) {
    case 'click':
      if (DELETE.test(name)) return no(`I can't delete things, ${MINE}`);
      if (PAY.test(name)) return no(`I can't buy or pay for anything, ${MINE}`);
      if (SEND.test(name)) return no(`I can't press ${name}, ${MINE}`);
      return yes(name ? `click ${name}` : 'click there');
    case 'type': {
      const text = action.text || '';
      if (info.isPassword) return no(`I can't type into a password box, ${MINE}`);
      if (/\n$/.test(text)) return no(`I can't send messages, ${MINE}`);
      if (CARD_DIGITS.test(text)) return no(`I can't type payment details, ${MINE}`);
      return yes(`type "${text}"`);
    }
    case 'key':
      if (!KEYS.includes(action.name)) return no("I'm not allowed to press that key.");
      return yes(KEY_WORDS[action.name] || `press ${action.name}`);
    case 'scroll':
      if (!['up', 'down', 'left', 'right'].includes(action.dir)) return no("I can't scroll that way.");
      return yes(`scroll ${action.dir}`);
    case 'open_url': {
      let u;
      try { u = new URL(action.url); } catch { return no('I can only open web links.'); }
      if (!/^https?:$/.test(u.protocol)) return no('I can only open web links.');
      if (CHECKOUT_URL.test(u.pathname)) return no(`I can't buy or pay for anything, ${MINE}`);
      return yes(`open ${u.hostname.replace(/^www\./, '')}`);
    }
    case 'open_app':
      if (!settings.apps || !Object.hasOwn(settings.apps, action.name)) return no(`I don't know the app ${action.name}.`);
      return yes(`open ${action.name}`);
    default:
      return no("I can't do that.");
  }
}

const isYes = (text) => /^\W*(yes|yeah|yep|yup|sure|ok(ay)?|do it|go ahead|please do)\b/i.test(text || '');

module.exports = { check, isYes, KEYS };
