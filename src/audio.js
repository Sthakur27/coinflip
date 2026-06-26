// Tiny WebAudio blip generator — no asset files.

let actx;
export function resumeAudio() {
  try { actx = actx || new (AudioContext || webkitAudioContext)(); actx.resume && actx.resume(); } catch (e) {}
}
export function beep(freq, dur, type = 'sine', gain = 0.06) {
  if (!actx) return;
  try {
    const o = actx.createOscillator(), gn = actx.createGain();
    o.type = type; o.frequency.value = freq; gn.gain.value = gain;
    o.connect(gn); gn.connect(actx.destination); o.start();
    o.frequency.exponentialRampToValueAtTime(freq * 0.6, actx.currentTime + dur);
    gn.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur); o.stop(actx.currentTime + dur);
  } catch (e) {}
}
