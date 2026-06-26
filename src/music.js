// Procedural chiptune loop — no audio files. A looping A-minor-pentatonic melody
// with a triangle bass, a kick on the downbeats, and offbeat hats, scheduled ahead
// of the audio clock. Routes through the shared master gain so mute applies.

import { audioCtx, musicNode } from './audio.js';

const BPM = 132, STEP = 30 / BPM;            // eighth-note duration (s)
const MEL  = [81, 0, 76, 79,  76, 0, 72, 74,  76, 0, 81, 79,  76, 72, 74, 0];   // 16 eighths, 0 = rest
const BASS = [45, 45, 41, 41,  43, 43, 40, 40];                                  // one per two steps (Am F G Em)

let timer = null, step = 0, nextTime = 0, mgain = null, noiseBuf = null;

const midi = m => 440 * Math.pow(2, (m - 69) / 12);

function ensure() {
  const ac = audioCtx(); if (!ac) return null;
  if (!mgain) { mgain = ac.createGain(); mgain.gain.value = 0.3; mgain.connect(musicNode()); }
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, (ac.sampleRate * 0.2) | 0, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return ac;
}
function tone(ac, freq, t, dur, type, vol) {
  const o = ac.createOscillator(), gn = ac.createGain();
  o.type = type; o.frequency.value = freq;
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn); gn.connect(mgain); o.start(t); o.stop(t + dur + 0.02);
}
function kick(ac, t) {
  const o = ac.createOscillator(), gn = ac.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  gn.gain.setValueAtTime(0.5, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(gn); gn.connect(mgain); o.start(t); o.stop(t + 0.18);
}
function hat(ac, t) {
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
  const gn = ac.createGain(); gn.gain.setValueAtTime(0.1, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  s.connect(hp); hp.connect(gn); gn.connect(mgain); s.start(t); s.stop(t + 0.06);
}
function scheduler() {
  const ac = ensure(); if (!ac) return;
  while (nextTime < ac.currentTime + 0.12) {                 // 0.12s lookahead
    const s = step % 16;
    if (MEL[s]) tone(ac, midi(MEL[s]), nextTime, STEP * 0.9, 'square', 0.18);
    if (s % 2 === 0) tone(ac, midi(BASS[(s / 2) % BASS.length]), nextTime, STEP * 1.7, 'triangle', 0.22);
    if (s === 0 || s === 8) kick(ac, nextTime);
    if (s % 2 === 1) hat(ac, nextTime);
    nextTime += STEP; step++;
  }
}
export function startMusic() {
  const ac = ensure(); if (!ac || timer) return;
  step = 0; nextTime = ac.currentTime + 0.1;
  timer = setInterval(scheduler, 25);
}
