'use strict';
// node audio.js video1|video2 out.wav : places Nibley's sounds (and video 2's voices) on a timeline with adelay + amix (normalize=0), then loudnorm to about -14 LUFS.
const { spawnSync } = require('child_process');
const SND = '/tmp/claude-0/-home-user-nibley/77fe0c19-3d64-5601-8230-97f34306a4e4/scratchpad/sounds/split/';
const TTS = '/tmp/claude-0/-home-user-nibley/77fe0c19-3d64-5601-8230-97f34306a4e4/scratchpad/tts/';
// [file, start seconds, volume]
const S = (f, t, v = 1) => [SND + f + '.wav', t, v];
const V = (f, t, v = 1) => [TTS + f + '.wav', t, v];
const PLAN = {
  video1: { dur: 20, items: [
    S('1-magical-5', 0.2),        // Ting! ring draws
    S('1-magical-1', 1.55),       // Bli-bli! Nibley pops in
    S('5-shy-1', 3.65),           // M-mip...
    S('6-confused-3', 7.55),      // Hmmmmm?
    S('1-magical-6', 9.3),        // Ting! arrow
    S('8-excited-1', 10.4),       // WOO-pip!
    S('4-mischievous-1', 14.1),   // Hehehe!
    S('8-excited-4', 16.6),       // Tadaa!
  ] },
  video2: { dur: 24, items: [
    V('h1t', 0.3), V('a1t', 3.6), V('a2t', 8.0), V('h2t', 11.8), V('a3t', 13.6), V('a4t', 18.4),
    S('1-magical-1', 9.35, 0.55),  // Bli-bli! Nibley pops in (under the voice)
    S('1-magical-5', 13.1, 0.7),   // Ting! ring on the arrow
    S('8-excited-4', 22.4, 0.9),   // Tadaa!
  ] },
};
const { dur, items } = PLAN[process.argv[2]];
const out = process.argv[3];
const args = ['-y', '-v', 'error'];
items.forEach(([f]) => args.push('-i', f));
const fc = items.map(([, t, v], i) => `[${i}:a]aresample=48000,aformat=channel_layouts=mono,volume=${v},adelay=${Math.round(t * 1000)}:all=1[a${i}]`).join(';')
  + `;${items.map((_, i) => `[a${i}]`).join('')}amix=inputs=${items.length}:normalize=0:dropout_transition=0,apad=whole_dur=${dur},atrim=0:${dur},loudnorm=I=-14:TP=-1.5:LRA=7,aformat=channel_layouts=stereo:sample_rates=48000[o]`;
args.push('-filter_complex', fc, '-map', '[o]', out);
const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
process.exit(r.status || 0);
