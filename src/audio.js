// Tiny WebAudio: one shared context, a master gain for muting, and SFX blips.
// Music (music.js) and all beeps route through `master`, so mute kills everything.

let actx, master, muted = localStorage.getItem('coinflip_mute') === '1';

export function audioCtx() {
  if (!actx) {
    try {
      actx = new (AudioContext || webkitAudioContext)();
      master = actx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(actx.destination);
    } catch (e) {}
  }
  return actx;
}
export function masterNode() { audioCtx(); return master; }
export function resumeAudio() { const a = audioCtx(); a && a.resume && a.resume(); }

export function isMuted() { return muted; }
export function setMuted(m) { muted = m; localStorage.setItem('coinflip_mute', m ? '1' : ''); if (master) master.gain.value = m ? 0 : 1; }
export function toggleMuted() { setMuted(!muted); return muted; }

export function beep(freq, dur, type = 'sine', gain = 0.06) {
  const a = audioCtx(); if (!a) return;
  try {
    const o = a.createOscillator(), gn = a.createGain();
    o.type = type; o.frequency.value = freq; gn.gain.value = gain;
    o.connect(gn); gn.connect(master); o.start();
    o.frequency.exponentialRampToValueAtTime(freq * 0.6, a.currentTime + dur);
    gn.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur); o.stop(a.currentTime + dur);
  } catch (e) {}
}
