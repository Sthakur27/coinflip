// All rendering into the pixel buffer `g`: primitives, entities, HUD, overlays.

import {
  DARK, PAL, TAU, LW, GROUND_Y, GRAVITY, AMMO_MAX, HEART_MAX, REGEN_TIME,
  TYPES, POWERUPS, SKY_T, SKY_M, SKY_B, VIS_PULL,
} from './config.js';
import { g, S, clouds, pointer, dragStart, handTop, aimDir, pauseBtn, resumeBtn, retryBtn } from './state.js';

// ── primitives
export function ell(x, y, rx, ry, fill, stroke = DARK) {
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.lineWidth = LW; g.strokeStyle = stroke; g.stroke(); }
}
export function circ(x, y, r, fill, stroke = DARK) { ell(x, y, r, r, fill, stroke); }
export function tri(ax, ay, bx, by, cx, cy, fill, stroke = DARK) {
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo(cx, cy); g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.lineWidth = LW; g.strokeStyle = stroke; g.lineJoin = 'round'; g.stroke(); }
}
export function rrect(x, y, w, h, r, fill, stroke = DARK) {
  g.beginPath(); g.roundRect(x, y, w, h, r);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.lineWidth = LW; g.strokeStyle = stroke; g.stroke(); }
}
function shadow(x, y, rx) { g.beginPath(); g.ellipse(x, y, rx, rx * 0.34, 0, 0, TAU); g.fillStyle = 'rgba(20,12,30,0.18)'; g.fill(); }
function shadowA(x, y, rx, a) { g.beginPath(); g.ellipse(x, y, rx, rx * 0.34, 0, 0, TAU); g.fillStyle = `rgba(20,12,30,${a})`; g.fill(); }
export function drawStar(x, y, r, col) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? g.lineTo(px, py) : g.moveTo(px, py); }
  g.closePath(); g.fillStyle = col; g.fill();
}
export function text(str, x, y, size, col, align = 'left') {
  g.font = `700 ${size}px "Arial Black", Arial, sans-serif`;
  g.textAlign = align; g.textBaseline = 'alphabetic';
  g.lineJoin = 'round'; g.lineWidth = 2.4; g.strokeStyle = DARK; g.strokeText(str, x, y);
  g.fillStyle = col; g.fillText(str, x, y);
}

// ── background
function drawCloud(x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = PAL.cloud;
  for (const [dx, dy, r] of [[-9, 2, 7], [0, -2, 9], [9, 2, 7], [3, 4, 6], [-3, 4, 6]]) { g.beginPath(); g.ellipse(dx, dy, r, r, 0, 0, TAU); g.fill(); }
  g.fillStyle = PAL.cloudSh;
  for (const [dx, dy, r] of [[-9, 5, 5], [0, 6, 6], [9, 5, 5]]) { g.beginPath(); g.ellipse(dx, dy, r, r * 0.7, 0, 0, TAU); g.fill(); }
  g.restore();
}
export function drawBackground(dt) {
  const grd = g.createLinearGradient(0, 0, 0, GROUND_Y);
  grd.addColorStop(0, SKY_T); grd.addColorStop(0.55, SKY_M); grd.addColorStop(1, SKY_B);
  g.fillStyle = grd; g.fillRect(0, 0, S.VW, GROUND_Y);
  circ(38, 34, 16, PAL.sun, null); circ(38, 34, 11, PAL.sunDk, null);   // sun
  for (const c of clouds) { c.x += c.v * dt; if (c.x > S.VW + 24) c.x = -24; drawCloud(c.x, c.y, c.s); }
  g.fillStyle = PAL.hillDk; g.beginPath(); g.moveTo(0, GROUND_Y);
  for (let x = 0; x <= S.VW; x += 4) g.lineTo(x, GROUND_Y - 18 - Math.sin(x * 0.018) * 14); g.lineTo(S.VW, GROUND_Y); g.fill();
  g.fillStyle = PAL.hill; g.beginPath(); g.moveTo(0, GROUND_Y);
  for (let x = 0; x <= S.VW; x += 4) g.lineTo(x, GROUND_Y - 8 - Math.sin(x * 0.022 + 2) * 9); g.lineTo(S.VW, GROUND_Y); g.fill();
  g.fillStyle = PAL.grass; g.fillRect(0, GROUND_Y, S.VW, S.VH - GROUND_Y);
  g.fillStyle = PAL.grassDk; g.fillRect(0, GROUND_Y, S.VW, 4);
}

// ── birds
export function drawBird(b) {
  const T = TYPES[b.type], s = b.r / 11, flap = Math.sin(b.flap);
  g.save(); g.translate(b.x, b.y);
  shadow(0, GROUND_Y - b.y + 2, b.r);
  g.scale(b.dir * s, s);
  if (T.golden) { g.globalAlpha = 0.45; circ(0, 0, 14, '#fff7c8', null); g.globalAlpha = 1; }
  if (T.gift) { g.globalAlpha = 0.4; circ(0, 0, 14, '#e3c2ff', null); g.globalAlpha = 1; }
  tri(-9, -3, -9, 4, -16, 0, T.dk);                                            // tail
  ell(0, 0, 11, 9.5, T.body);                                                  // body
  g.beginPath(); g.ellipse(2, 3, 7, 5.5, 0, 0, TAU); g.fillStyle = T.belly; g.fill();   // belly
  tri(10, -2, 10, 3, 16, 0.5, PAL.beak); tri(10, 0.5, 10, 3, 15, 1.2, PAL.beakDk, null); // beak
  circ(6, -3, 2.4, '#fff'); circ(6.6, -3, 1.1, DARK, null);                              // eye
  if (T.thief) { g.fillStyle = DARK; g.beginPath(); g.ellipse(5.6, -3, 3.6, 2.3, 0, 0, TAU); g.fill(); circ(6.6, -3, 1, '#fff', null); }   // mask
  g.save(); g.translate(-1, -3); g.rotate(flap * 0.6); ell(-3, 2, 6.5, 3.4, T.dk); g.restore();   // wing
  if (b.hitFlash > 0) { g.globalAlpha = Math.min(0.85, b.hitFlash * 5); circ(0, 0, 11.5, '#fff', null); g.globalAlpha = 1; }
  g.restore();
  if (T.gift && b.pu) {                          // floating power-up icon, unflipped
    const iy = b.y - b.r - 9;
    rrect(b.x - 10, iy - 8, 20, 16, 4, '#fff', DARK);
    drawPUIcon(b.pu, b.x, iy, POWERUPS[b.pu].col);
  }
}
function drawPUIcon(type, x, y, col) {
  g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 1.4;
  if (type === 'triple' || type === 'shotgun') {
    const n = type === 'triple' ? 3 : 5;
    for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * 0.5; g.beginPath(); g.ellipse(x + Math.sin(a) * 5, y + 1 - Math.cos(a) * 1.5, 1.5, 1.5, 0, 0, TAU); g.fill(); }
  } else if (type === 'big') {
    g.beginPath(); g.ellipse(x, y, 5, 5, 0, 0, TAU); g.fill();
  } else if (type === 'slowmo') {
    g.beginPath(); g.ellipse(x, y, 5, 5, 0, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 3.4); g.moveTo(x, y); g.lineTo(x + 2.4, y); g.stroke();
  } else if (type === 'infinite') {
    g.beginPath(); g.ellipse(x - 2.4, y, 2.4, 2.4, 0, 0, TAU); g.stroke();
    g.beginPath(); g.ellipse(x + 2.4, y, 2.4, 2.4, 0, 0, TAU); g.stroke();
  }
}
function drawHeart(cx, cy, s, filled) {
  g.beginPath();
  g.moveTo(cx, cy + s * 0.95);
  g.bezierCurveTo(cx - s * 1.5, cy - s * 0.5, cx - s * 0.55, cy - s * 1.2, cx, cy - s * 0.35);
  g.bezierCurveTo(cx + s * 0.55, cy - s * 1.2, cx + s * 1.5, cy - s * 0.5, cx, cy + s * 0.95);
  g.closePath();
  g.fillStyle = filled ? '#ff5a72' : 'rgba(20,12,30,0.22)'; g.fill();
  g.lineWidth = LW; g.strokeStyle = DARK; g.stroke();
}

// ── hand
export function drawHand() {
  const droop = S.state === 'over' ? Math.min(1.2, S.overT * 1.6) : 0;   // sags after game over
  const t = handTop();
  g.save(); g.translate(S.HAND_X, GROUND_Y); g.rotate(S.aimAng * 0.4 + droop);
  rrect(-6, -2, 12, 70, 5, PAL.skin);
  g.restore();
  g.save(); g.translate(t.x + droop * 10, t.y + 8 + droop * 6); g.rotate(S.aimAng * 0.5 + droop);
  ell(0, 0, 9, 8, PAL.skin);
  g.strokeStyle = PAL.skinDk; g.lineWidth = 1;
  for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 4, -6); g.lineTo(i * 4, -1); g.stroke(); }
  const thumbUp = S.flickT > 0 ? Math.sin((1 - S.flickT / 0.22) * Math.PI) : (S.charging ? S.charge * 0.3 : 0);
  g.save(); g.translate(-7, -3); g.rotate(-0.5 - thumbUp * 0.8); ell(0, -3, 3, 5, PAL.skin); g.restore();
  g.restore();
}

// ── coin: tumbles end-over-end (squash vertically) → heads · edge · tails
export function drawCoin(x, y, spin, flying, charged, baseR = 6) {
  const hf = flying ? Math.max(0, Math.min(1, (GROUND_Y - y) / (GROUND_Y - 50))) : 0;   // apex scaling
  const r = baseR * (1 + hf * 0.3);
  if (flying) shadowA(x, GROUND_Y - 1, baseR * (0.45 + (1 - hf) * 0.8), 0.05 + (1 - hf) * 0.16);

  const FACE = charged ? PAL.superA : PAL.gold, FACE2 = charged ? PAL.superB : '#f4c233';
  const EDGE = charged ? PAL.superEdge : PAL.goldEdge, EDGEDK = charged ? PAL.superDk : PAL.goldDk, LT = charged ? PAL.superLt : PAL.goldLt;

  const c = Math.cos(spin);
  const ry = Math.abs(c) * r;
  if (ry < r * 0.16) {
    const ew = r * 1.9, eh = Math.max(1.6, r * 0.36);
    rrect(x - ew / 2, y - eh / 2, ew, eh, eh / 2, EDGE);
    g.strokeStyle = EDGEDK; g.lineWidth = 0.8;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x + i * ew * 0.17, y - eh / 2 + 0.6); g.lineTo(x + i * ew * 0.17, y + eh / 2 - 0.6); g.stroke(); }
  } else {
    const heads = c > 0;
    g.beginPath(); g.ellipse(x, y, r, ry, 0, 0, TAU);
    g.fillStyle = heads ? FACE : FACE2; g.lineWidth = LW; g.strokeStyle = DARK; g.fill(); g.stroke();
    g.beginPath(); g.ellipse(x, y, r * 0.7, ry * 0.7, 0, 0, TAU); g.strokeStyle = EDGE; g.lineWidth = 1; g.stroke();
    g.save(); g.translate(x, y); g.scale(1, Math.abs(c));
    if (heads) drawStar(0, 0, r * 0.42, LT);
    else { g.beginPath(); g.moveTo(0, -r * 0.42); g.lineTo(r * 0.32, 0); g.lineTo(0, r * 0.42); g.lineTo(-r * 0.32, 0); g.closePath(); g.fillStyle = LT; g.fill(); }
    g.restore();
    g.globalAlpha = 0.85; g.beginPath(); g.ellipse(x - r * 0.32, y - ry * 0.34, r * 0.16, ry * 0.16, 0, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.globalAlpha = 1;
  }
}

// ── aiming aids
export function drawTrajectory(power) {
  const d = aimDir();
  let px = handTop().x, py = handTop().y, vx = d.x * power, vy = d.y * power;
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 60; i++) {
    vy += GRAVITY * 0.02; px += vx * 0.02; py += vy * 0.02;
    if (py > GROUND_Y) break;
    if (i % 4 === 0) { g.beginPath(); g.ellipse(px, py, 1.1, 1.1, 0, 0, TAU); g.fill(); }
  }
}
export function drawSling() {                              // band + knob showing the pull
  const t = handTop();
  const dx = pointer.x - dragStart.x, dy = pointer.y - dragStart.y, len = Math.hypot(dx, dy) || 1;
  const vl = Math.min(len, VIS_PULL);
  const kx = t.x + dx / len * vl, ky = t.y + dy / len * vl;
  g.lineCap = 'round';
  g.strokeStyle = DARK; g.lineWidth = 4.5; g.beginPath(); g.moveTo(t.x, t.y); g.lineTo(kx, ky); g.stroke();
  g.strokeStyle = '#ffe9a0'; g.lineWidth = 2; g.beginPath(); g.moveTo(t.x, t.y); g.lineTo(kx, ky); g.stroke();
  const col = S.charge < 0.5 ? '#6ee7ff' : S.charge < 0.82 ? '#ffd34d' : '#ff6b6b';
  circ(kx, ky, 5.5, col, DARK);
}

// ── HUD + overlays
export function drawHUD() {
  text('SCORE', 9, 18, 11, '#fff');
  text(String(S.score), 9, 40, 24, PAL.gold);
  if (S.best) text('BEST ' + S.best, 9, 56, 10, '#ffe9a0');
  for (let i = 0; i < HEART_MAX; i++) drawHeart(S.VW - 32 - (HEART_MAX - 1 - i) * 17, 18, 6.5, i < S.hearts);
  const n = AMMO_MAX, cs = 13, gap = 7, tw = n * cs + (n - 1) * gap, ex = (S.VW - tw) / 2;
  for (let i = 0; i < n; i++) {
    const cx = ex + cs / 2 + i * (cs + gap), cy = 16 + cs / 2;
    circ(cx, cy, cs / 2, 'rgba(20,12,30,0.22)', DARK);
    if (i < S.ammo) { circ(cx, cy, cs / 2 - 1.5, PAL.gold, DARK); drawStar(cx, cy, cs * 0.2, PAL.goldLt); }
    else if (i === S.ammo) {
      const p = Math.min(1, S.regenT / REGEN_TIME);
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, cs / 2 - 1.5, -Math.PI / 2, -Math.PI / 2 + p * TAU); g.closePath();
      g.fillStyle = 'rgba(255,211,77,0.55)'; g.fill();
    }
  }
  if (S.power) {
    const P = POWERUPS[S.power];
    text(P.name, S.VW / 2, 44, 9, P.col, 'center');
    const bw = 78, bx = (S.VW - bw) / 2;
    rrect(bx, 48, bw, 4, 2, '#0006', DARK);
    rrect(bx, 48, bw * Math.max(0, S.powerT / P.dur), 4, 2, P.col, null);
  } else if (S.streak >= 3) text(S.streak + 'x', S.VW / 2, 46, 11, PAL.gold, 'center');
  if (S.state === 'over') return;
  if (S.charging) {
    const bw = 180, bx = (S.VW - bw) / 2, by = S.VH - 16;
    rrect(bx, by, bw, 7, 3, '#0006', DARK);
    const grd = g.createLinearGradient(bx, 0, bx + bw, 0);
    grd.addColorStop(0, '#6ee7ff'); grd.addColorStop(0.5, PAL.gold); grd.addColorStop(1, '#ff6b6b');
    rrect(bx + 1, by + 1, (bw - 2) * S.charge, 5, 2, grd, null);
  } else if (S.ammo <= 0) {
    text('OUT OF COINS — RECHARGING…', S.VW / 2, S.VH - 8, 10, '#ffd66b', 'center');
  } else {
    text('DRAG TO AIM + POWER  ·  RELEASE TO FLING', S.VW / 2, S.VH - 8, 10, '#fff', 'center');
  }
}
function drawButton(r, label, col) {
  rrect(r.x, r.y, r.w, r.h, 6, col, DARK);
  text(label, r.x + r.w / 2, r.y + r.h / 2 + 4, 12, '#fff', 'center');
}
export function drawPauseBtn() {
  const r = pauseBtn();
  rrect(r.x, r.y, r.w, r.h, 3, 'rgba(20,12,30,0.35)', DARK);
  g.fillStyle = '#fff'; g.fillRect(r.x + 5, r.y + 4, 2.5, r.h - 8); g.fillRect(r.x + r.w - 7.5, r.y + 4, 2.5, r.h - 8);
}
export function drawPaused() {
  g.fillStyle = 'rgba(20,12,30,0.5)'; g.fillRect(0, 0, S.VW, S.VH);
  text('PAUSED', S.VW / 2, S.VH / 2 - 16, 28, '#fff', 'center');
  drawButton(resumeBtn(), 'RESUME', '#3aa6f0');
  text('P / ESC TO RESUME', S.VW / 2, S.VH / 2 + 50, 9, '#d8e2ef', 'center');
}
export function drawGameOver() {
  g.fillStyle = `rgba(20,12,30,${Math.min(0.62, S.overT * 0.9)})`; g.fillRect(0, 0, S.VW, S.VH);
  text('GAME OVER', S.VW / 2, S.VH / 2 - 30, 30, '#ff6b8a', 'center');
  text('SCORE ' + S.score, S.VW / 2, S.VH / 2 - 4, 16, '#fff', 'center');
  text('BEST ' + S.best, S.VW / 2, S.VH / 2 + 14, 12, '#ffe9a0', 'center');
  if (S.overT > 0.5) { drawButton(retryBtn(), 'RETRY', '#3aa6f0'); text('ENTER / R', S.VW / 2, S.VH / 2 + 84, 9, '#d8e2ef', 'center'); }
}
