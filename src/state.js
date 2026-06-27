// Shared mutable game state, the pixel buffer, and pure geometry helpers.
// `S` holds every scalar that changes at runtime; arrays/objects are mutated in place.

import { GROUND_Y, MAX_TILT, AMMO_MAX, HEART_MAX } from './config.js';

// ── pixel buffer: draw into a small offscreen canvas, blit upscaled with no smoothing
export const cv = document.getElementById('c');
export const ctx = cv.getContext('2d');
export const buf = document.createElement('canvas');
export const g = buf.getContext('2d');

export const S = {
  VW: 640, VH: 360, scale: 1, DPR: 1, HAND_X: 320,   // VH fixed = zoom; VW fills width
  aimAng: 0, handDip: 0, flickT: 0,
  score: 0, streak: 0, best: +(localStorage.getItem('coinflip_best') || 0),
  charging: false, charge: 0, shake: 0,
  ammo: AMMO_MAX, regenT: 0,
  hearts: HEART_MAX, state: 'intro', spawnT: 0.6, stage: 1,
  banner: null, flashRed: 0, overT: 0,
  power: null, powerT: 0,
  dragging: false, prev: 0, introT: 0,
};

export const pointer = { x: 320, y: 40 };
export const dragStart = { x: 0, y: 0 };

// entity pools (mutated in place across modules)
export const clouds = [];
export const coins = [];
export const birds = [];
export const hoops = [];
export const parts = [];
export const pops = [];
for (let i = 0; i < 8; i++) clouds.push({ x: Math.random() * S.VW, y: 22 + Math.random() * 130, s: 0.8 + Math.random() * 1.0, v: 3 + Math.random() * 5 });

export function resize() {
  S.DPR = Math.min(devicePixelRatio || 1, 2);
  S.scale = (innerHeight * S.DPR) / S.VH;            // device px per logical px (fit height)
  S.VW = Math.ceil((innerWidth * S.DPR) / S.scale);  // widen logical view → fills width, no letterbox
  S.HAND_X = S.VW / 2;
  buf.width = S.VW; buf.height = S.VH;
  cv.width = Math.round(innerWidth * S.DPR); cv.height = Math.round(innerHeight * S.DPR);
  cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
  ctx.imageSmoothingEnabled = false;
}
export function toLogical(cx, cy) { return { x: cx / innerWidth * S.VW, y: cy / innerHeight * S.VH }; }

// ── aim + launch geometry
export function aimDir() { return { x: Math.sin(S.aimAng), y: -Math.cos(S.aimAng) }; }
export function handTop() {  // world point where the coin sits / launches from
  const baseY = GROUND_Y - 14 - S.handDip + (S.flickT > 0 ? -Math.sin((1 - S.flickT / 0.22) * Math.PI) * 7 : 0);
  return { x: S.HAND_X + Math.sin(S.aimAng) * 7, y: baseY - 6 };
}

// ── on-screen buttons (geometry shared by input + render)
export function inRect(p, r) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }
export function pauseBtn() { return { x: S.VW - 20, y: 6, w: 16, h: 15 }; }
export function sfxBtn() { return { x: S.VW - 40, y: 6, w: 16, h: 15 }; }
export function musicBtn() { return { x: S.VW - 60, y: 6, w: 16, h: 15 }; }
export function ctrBtn(w, h, cy) { return { x: (S.VW - w) / 2, y: cy, w, h }; }
export function resumeBtn() { return ctrBtn(110, 24, S.VH / 2 - 6); }
export function restartBtn() { return ctrBtn(110, 24, S.VH / 2 + 24); }
export function retryBtn() { return ctrBtn(118, 26, S.VH / 2 + 42); }
export function startBtn() { return ctrBtn(130, 30, S.VH * 0.6); }
