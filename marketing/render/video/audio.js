'use strict';
// node audio.js video1|video2 out.wav : places Nibley's sounds (and video 2's voices) on a timeline with adelay + amix (normalize=0), then loudnorm to about -14 LUFS.
const { spawnSync } = require('child_process');
const SND = '/tmp/claude-0/-home-user-nibley/77fe0c19-3d64-5601-8230-97f34306a4e4/scratchpad/sounds/split/';
const TTS = '/tmp/claude-0/-home-user-nibley/77fe0c19-3d64-5601-8230-97f34306a4e4/scratchpad/tts/';
// [file, start seconds, volume]
const S = (f, t, v = 1) => [SND + f + '.wav', t, v];
const V = (f, t, v = 1) => [TTS + f + '.wav', t, v];
const PLAN = {
  video1: { dur: 25.8, items: [
    S('1-magical-5', 0.2, 0.55),      // Ting! ring draws (no voice)
    S('1-magical-1', 1.45, 0.55),     // Bli-bli! Nibley pops in
    V('n1t', 2.45), S('5-shy-1', 5.1, 0.55),        // "This is Nibley." / M-mip...
    V('n2t', 6.4),
    V('n3t', 9.1), S('6-confused-3', 12.75, 0.55),  // Hmmmmm? while the bubble types
    S('1-magical-6', 14.0, 0.55),     // Ting! arrow
    V('n4t', 14.5), S('8-excited-1', 17.6, 0.55),  // WOO-pip!
    V('n5t', 18.5), S('4-mischievous-1', 21.85, 0.55), // Hehehe!
    V('n6t', 23.35), S('8-excited-4', 24.75, 0.6),  // Tadaa!
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
  + `;${items.map((_, i) => `[a${i}]`).join('')}amix=inputs=${items.length}:normalize=0:dropout_transition=0,apad=whole_dur=${dur},atrim=0:${dur}[m]`;
args.push('-filter_complex', fc, '-map', '[m]', out + '.pre.wav');
let r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (r.status) process.exit(r.status);
// two-pass loudnorm (linear) so the integrated level lands on -14 LUFS
const m = spawnSync('ffmpeg', ['-hide_banner', '-i', out + '.pre.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
const j = JSON.parse(m.stderr.slice(m.stderr.lastIndexOf('{')));
const ln = `volume=${(-13.0 - parseFloat(j.input_i)).toFixed(2)}dB,alimiter=limit=0.9:level=disabled,aformat=channel_layouts=stereo:sample_rates=48000`;
r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', out + '.pre.wav', '-af', ln, out], { stdio: 'inherit' });
require('fs').unlinkSync(out + '.pre.wav');
process.exit(r.status || 0);
