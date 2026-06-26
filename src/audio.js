// Tiny WebAudio: one shared context with two independent gain buses — SFX and music —
// each separately mutable + persisted. Beeps route through sfx; music.js through music.

let actx, sfxGain, musicGain;
let sfxOff = localStorage.getItem('coinflip_sfx') === '0';
let musicOff = localStorage.getItem('coinflip_music') === '0';

function ensure() {
  if (!actx) {
    try {
      actx = new (AudioContext || webkitAudioContext)();
      sfxGain = actx.createGain(); sfxGain.gain.value = sfxOff ? 0 : 1; sfxGain.connect(actx.destination);
      musicGain = actx.createGain(); musicGain.gain.value = musicOff ? 0 : 1; musicGain.connect(actx.destination);
    } catch (e) {}
  }
  return actx;
}
export function audioCtx() { return ensure(); }
export function musicNode() { ensure(); return musicGain; }
export function resumeAudio() { const a = ensure(); a && a.resume && a.resume(); }

export function isSfxOff() { return sfxOff; }
export function isMusicOff() { return musicOff; }
export function toggleSfx() { sfxOff = !sfxOff; localStorage.setItem('coinflip_sfx', sfxOff ? '0' : '1'); if (sfxGain) sfxGain.gain.value = sfxOff ? 0 : 1; return sfxOff; }
export function toggleMusic() { musicOff = !musicOff; localStorage.setItem('coinflip_music', musicOff ? '0' : '1'); if (musicGain) musicGain.gain.value = musicOff ? 0 : 1; return musicOff; }

export function beep(freq, dur, type = 'sine', gain = 0.06) {
  const a = ensure(); if (!a) return;
  try {
    const o = a.createOscillator(), gn = a.createGain();
    o.type = type; o.frequency.value = freq; gn.gain.value = gain;
    o.connect(gn); gn.connect(sfxGain); o.start();
    o.frequency.exponentialRampToValueAtTime(freq * 0.6, a.currentTime + dur);
    gn.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur); o.stop(a.currentTime + dur);
  } catch (e) {}
}
