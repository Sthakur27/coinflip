// Entry module: spawning, scoring, input, and the main loop. Wires the rest together.

import {
  GROUND_Y, GRAVITY, POWER_MIN, POWER_MAX, MAX_TILT, COIN_R, CHARGE_RATE,
  AMMO_MAX, REGEN_TIME, HEART_MAX, MAX_PULL, DEAD_PULL, TYPES, POWERUPS, PU_KEYS, PAL, TAU,
} from './config.js';
import {
  cv, ctx, buf, g, S, pointer, dragStart, coins, birds, parts, pops,
  resize, toLogical, aimDir, handTop, inRect, pauseBtn, resumeBtn, retryBtn,
} from './state.js';
import { resumeAudio, beep } from './audio.js';
import {
  drawBackground, drawBird, drawCoin, drawHand, drawTrajectory, drawSling,
  drawHUD, drawPauseBtn, drawPaused, drawGameOver, drawStar, text,
} from './draw.js';

// ── spawning + difficulty
function pickType(s) {
  if (Math.random() < (S.hearts < HEART_MAX ? 0.05 : 0.025)) return 'golden';   // rare bonus, likelier when hurt
  if (s >= 5 && Math.random() < 0.07) return 'gift';                            // power-up carrier
  const w = [['sparrow', 5]];
  if (s >= 8) w.push(['pigeon', 2.5]);
  if (s >= 12) w.push(['thief', 2]);
  if (s >= 24) w.push(['swift', 3]);
  let tot = 0; for (const e of w) tot += e[1];
  let r = Math.random() * tot;
  for (const [t, x] of w) { if ((r -= x) <= 0) return t; }
  return 'sparrow';
}
function spawnGap(s) { return Math.max(1.1, 2.6 - s * 0.03); }
function maxBirds(s) { return s < 12 ? 1 : s < 50 ? 2 : 3; }
function speedMul(s) { return 1 + s * 0.012; }

function spawnOne() {
  const t = pickType(S.score), T = TYPES[t];
  const dir = Math.random() < 0.5 ? 1 : -1;
  const baseY = 38 + Math.random() * 175;
  const b = {
    type: t, r: T.r, hp: T.hp, pts: T.pts, dir, baseY, x: dir > 0 ? -26 : S.VW + 26, y: baseY,
    vx: dir * (40 + Math.random() * 24) * T.spd * speedMul(S.score),
    flap: Math.random() * TAU, bob: Math.random() * TAU, hitFlash: 0,
    bobAmp: T.zig ? 11 : 3.5, bobSpd: T.zig ? 11 : 6,
    swoopAmp: S.score >= 14 ? 14 + Math.random() * 24 : 0, swoopSpd: 0.5 + Math.random() * 0.5, swoopPhase: Math.random() * TAU,
  };
  if (t === 'gift') b.pu = PU_KEYS[Math.floor(Math.random() * PU_KEYS.length)];
  birds.push(b);
}

function spawnCoin(x, y, vx, vy, spinV, r = COIN_R) {
  coins.push({ x, y, vx, vy, spin: 0, spinV, r, charged: false });
  if (coins.length > 28) coins.shift();
}

// ── effects
function sparkle(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + Math.random(), sp = 40 + Math.random() * 90;
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: 0.6, col: color, star: Math.random() < 0.5 });
  }
}
function burst(x, y, color) { sparkle(x, y, color, 16); }
function popText(x, y, label, col) { pops.push({ x, y, text: label, col, t: 0.9 }); }

// ── hits, misses, lives
function hitBird(bi, coin) {
  const b = birds[bi];
  b.hp -= coin.charged ? 2 : 1;            // a super coin one-shots a pigeon
  b.hitFlash = 0.2;
  if (b.hp > 0) { sparkle(b.x, b.y, '#fff', 6); beep(320, 0.05, 'square', 0.05); return; }   // tank survives the hit
  const sup = coin.charged, T = TYPES[b.type], pts = b.pts * (sup ? 3 : 1);
  S.score += pts; S.streak++;
  if (S.score > S.best) { S.best = S.score; localStorage.setItem('coinflip_best', S.best); }
  if (T.golden) { S.hearts = Math.min(HEART_MAX, S.hearts + 1); popText(b.x, b.y - 16, '+LIFE', '#ff8aa0'); }
  if (T.gift && b.pu) { S.power = b.pu; S.powerT = POWERUPS[b.pu].dur; S.banner = { text: POWERUPS[b.pu].name + '!', t: 1.6 }; beep(600, 0.1, 'square', 0.06); setTimeout(() => beep(1200, 0.12, 'square', 0.05), 90); }
  burst(b.x, b.y, sup ? PAL.superA : (T.gift ? '#c89bff' : PAL.gold));
  popText(b.x, b.y - 10, sup ? `+${pts}!` : (pts > 1 ? `+${pts}` : (S.streak >= 3 ? 'NICE!' : 'BONK!')), sup ? PAL.superA : PAL.gold);
  beep(sup ? 990 : 880, 0.1, 'square', 0.07); setTimeout(() => beep(sup ? 1560 : 1320, 0.12, 'square', 0.05), 60);
  S.shake = sup ? 7 : 5;
  if (T.r >= 14) { S.shake = Math.max(S.shake, 13); beep(110, 0.18, 'sawtooth', 0.06); }   // big bird lands with a thud
  S.ammo = Math.min(AMMO_MAX, S.ammo + 1);
  birds.splice(bi, 1);
  checkStage();
}
function escapeBird(bi) {
  const b = birds[bi], T = TYPES[b.type];
  birds.splice(bi, 1);
  if (T.golden || T.gift) return;          // bonus birds: missing them just forfeits the bonus
  S.streak = 0;
  if (T.thief && S.ammo > 0) { S.ammo--; popText(b.dir > 0 ? S.VW - 44 : 44, 70, 'COIN STOLEN!', '#ff6b6b'); beep(170, 0.22, 'sawtooth', 0.06); }
  loseHeart();
}
function loseHeart() {
  S.hearts--; S.shake = 8; S.flashRed = 0.32; beep(160, 0.18, 'sawtooth', 0.07);
  if (S.hearts <= 0) gameOver();
}
function checkStage() {
  const ns = Math.floor(S.score / 10) + 1;
  if (ns > S.stage) { S.stage = ns; S.banner = { text: 'STAGE ' + S.stage, t: 1.5 }; beep(680, 0.12, 'square', 0.05); setTimeout(() => beep(1020, 0.14, 'square', 0.04), 120); }
}
function gameOver() {
  S.state = 'over'; S.overT = 0; S.charging = false; S.dragging = false;
  beep(220, 0.5, 'sawtooth', 0.08); setTimeout(() => beep(120, 0.6, 'sawtooth', 0.07), 160);
  for (let k = 0; k < S.ammo; k++) spawnCoin(S.HAND_X + (Math.random() * 22 - 11), GROUND_Y - 30, Math.random() * 220 - 110, -160 - Math.random() * 120, 22);
  S.ammo = 0;
}
function restart() {
  S.score = 0; S.streak = 0; S.hearts = HEART_MAX; S.ammo = AMMO_MAX; S.regenT = 0; S.stage = 1;
  coins.length = 0; birds.length = 0; parts.length = 0; pops.length = 0;
  S.spawnT = 0.5; S.banner = null; S.flashRed = 0; S.overT = 0; S.power = null; S.powerT = 0; S.dragging = false; S.state = 'play';
}

// ── input
function pauseGame() { if (S.state === 'play') { S.state = 'paused'; S.charging = false; S.dragging = false; } }
function togglePause() { if (S.state === 'play') pauseGame(); else if (S.state === 'paused') S.state = 'play'; }
function onDown(p) {
  resumeAudio();
  if (S.state === 'over') { if (S.overT > 0.5 && inRect(p, retryBtn())) restart(); return; }   // deliberate confirm only
  if (S.state === 'paused') { if (inRect(p, resumeBtn())) S.state = 'play'; return; }
  if (inRect(p, pauseBtn())) { pauseGame(); return; }
  beginDrag(p);
}
function onUp() { if (S.state === 'play') endDrag(); }
function beginDrag(p) {
  if (S.ammo <= 0) return;
  S.dragging = true; S.charging = true; S.charge = 0;
  dragStart.x = p.x; dragStart.y = p.y;
  updateDrag(p);
}
function updateDrag(p) {
  if (!S.dragging) return;
  const dx = p.x - dragStart.x, dy = p.y - dragStart.y, len = Math.hypot(dx, dy);
  S.charge = Math.max(0, Math.min(1, (len - DEAD_PULL) / (MAX_PULL - DEAD_PULL)));
  S.aimAng = Math.max(-MAX_TILT, Math.min(MAX_TILT, Math.atan2(-dx, dy)));   // fling opposite the pull
}
function endDrag() {
  if (!S.dragging) return;
  S.dragging = false;
  if (S.charge > 0) release(); else S.charging = false;   // a tiny tap cancels, no coin spent
}
function release() {
  if (!S.charging) return; S.charging = false;
  if (S.ammo <= 0) return;
  if (S.power !== 'infinite') S.ammo--;
  const pwr = POWER_MIN + (POWER_MAX - POWER_MIN) * S.charge;
  const d = aimDir(), t = handTop(), baseSpin = 11 + S.charge * 32;
  const r = S.power === 'big' ? COIN_R * 1.9 : COIN_R;
  let shots = 1, spread = 0;
  if (S.power === 'triple') { shots = 3; spread = 0.17; }
  else if (S.power === 'shotgun') { shots = 6; spread = 0.11; }
  for (let i = 0; i < shots; i++) {
    const off = shots === 1 ? 0 : (i - (shots - 1) / 2) * spread;
    const ca = Math.cos(off), sa = Math.sin(off);
    spawnCoin(t.x, t.y, (d.x * ca - d.y * sa) * pwr, (d.x * sa + d.y * ca) * pwr, baseSpin, r);
  }
  S.flickT = 0.22;
  beep(220 + S.charge * 520, 0.16, 'triangle', 0.06);
}

function setPointer(cx, cy) { const q = toLogical(cx, cy); pointer.x = q.x; pointer.y = q.y; }
addEventListener('resize', resize);
addEventListener('mousemove', e => { setPointer(e.clientX, e.clientY); if (S.dragging) updateDrag(pointer); });
addEventListener('mousedown', e => { setPointer(e.clientX, e.clientY); onDown(pointer); });
addEventListener('mouseup', onUp);
addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat && S.state === 'play' && S.ammo > 0 && !S.dragging) { resumeAudio(); S.charging = true; S.charge = 0; S.aimAng = 0; } }
  else if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); togglePause(); }
  else if ((e.code === 'Enter' || e.code === 'KeyR') && S.state === 'over' && S.overT > 0.5) restart();
});
addEventListener('keyup', e => { if (e.code === 'Space') { e.preventDefault(); if (S.state === 'play' && S.charging && !S.dragging) release(); } });
addEventListener('touchstart', e => { const t = e.touches[0]; setPointer(t.clientX, t.clientY); onDown(pointer); e.preventDefault(); }, { passive: false });
addEventListener('touchmove', e => { const t = e.touches[0]; setPointer(t.clientX, t.clientY); if (S.dragging) updateDrag(pointer); e.preventDefault(); }, { passive: false });
addEventListener('touchend', e => { onUp(); e.preventDefault(); }, { passive: false });

// ── main loop
function frame(now) {
  let dt = Math.min((now - S.prev) / 1000, 0.033); S.prev = now;
  if (S.state === 'paused') dt = 0;            // freeze the whole sim, keep rendering
  const wdt = (S.state === 'play' && S.charging ? 0.55 : 1) * dt;   // slight bullet-time while aiming

  if (S.state === 'play' && !S.charging) S.aimAng += (0 - S.aimAng) * Math.min(1, dt * 10);   // hand eases upright when idle
  if (S.charging) { if (!S.dragging) S.charge = Math.min(1, S.charge + dt * CHARGE_RATE); S.handDip = S.charge * 5; } else S.handDip = 0;
  if (S.flickT > 0) S.flickT -= dt;
  if (S.ammo < AMMO_MAX) { S.regenT += dt; if (S.regenT >= REGEN_TIME) { S.ammo++; S.regenT -= REGEN_TIME; } } else S.regenT = 0;
  if (S.power) { S.powerT -= dt; if (S.powerT <= 0) S.power = null; }

  if (S.state === 'play') {
    S.spawnT -= dt;
    if (S.spawnT <= 0) {
      if (birds.length < maxBirds(S.score)) { spawnOne(); S.spawnT = spawnGap(S.score) * (0.7 + Math.random() * 0.6); }
      else S.spawnT = 0.3;
    }
    const bdt = (S.power === 'slowmo' ? 0.4 : 1) * wdt;    // slow-mo power-up + aim bullet-time
    for (let bi = birds.length - 1; bi >= 0; bi--) {
      const b = birds[bi];
      b.x += b.vx * bdt; b.flap += bdt * 14; b.bob += bdt * b.bobSpd; b.swoopPhase += bdt * b.swoopSpd;
      b.y = Math.max(26, Math.min(GROUND_Y - 28, b.baseY + Math.sin(b.bob) * b.bobAmp + Math.sin(b.swoopPhase) * b.swoopAmp));
      if (b.hitFlash > 0) b.hitFlash -= dt;
      if ((b.dir > 0 && b.x > S.VW + 28) || (b.dir < 0 && b.x < -28)) escapeBird(bi);
    }
  }

  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    c.vy += GRAVITY * wdt; c.x += c.vx * wdt; c.y += c.vy * wdt; c.spin += c.spinV * wdt;
    let hit = -1;
    if (S.state === 'play') for (let bi = 0; bi < birds.length; bi++) { const b = birds[bi], dx = c.x - b.x, dy = c.y - b.y, rr = b.r + c.r - 2; if (dx * dx + dy * dy < rr * rr) { hit = bi; break; } }
    if (hit >= 0) { hitBird(hit, c); coins.splice(i, 1); continue; }
    if (c.y > GROUND_Y + 4 || c.x < -12 || c.x > S.VW + 12) coins.splice(i, 1);
  }
  // coin-on-coin elastic bounce (equal mass)
  for (let i = 0; i < coins.length; i++) for (let j = i + 1; j < coins.length; j++) {
    const a = coins[i], b = coins[j];
    const dx = b.x - a.x, dy = b.y - a.y, rsum = a.r + b.r - 1, d2 = dx * dx + dy * dy;
    if (d2 < rsum * rsum && d2 > 0.0001) {
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
      const vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (vn > 0) {
        const imp = (1 + 0.85) * vn / 2;
        a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny;
        a.spinV = 11 + Math.abs(imp) * 0.4; b.spinV = 11 + Math.abs(imp) * 0.4;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (!a.charged || !b.charged) {                     // first clink → power both up + refund
          a.charged = b.charged = true;
          S.ammo = Math.min(AMMO_MAX, S.ammo + 1);
          sparkle(mx, my, '#ff8ccb', 12);
          popText(mx, my - 4, '3x!', PAL.superA);
          beep(740, 0.08, 'square', 0.05); setTimeout(() => beep(1180, 0.1, 'square', 0.04), 55);
        } else {
          sparkle(mx, my, PAL.superLt, 6);
          beep(1500, 0.05, 'square', 0.04);
        }
      }
      const ov = (rsum - d) / 2; a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
    }
  }

  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.vy += GRAVITY * 0.6 * wdt; p.x += p.vx * wdt; p.y += p.vy * wdt; p.life -= wdt; if (p.life <= 0) parts.splice(i, 1); }
  for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.y -= dt * 22; p.t -= dt; if (p.t <= 0) pops.splice(i, 1); }
  if (S.shake > 0) S.shake -= dt * 30;
  if (S.banner) { S.banner.t -= dt; if (S.banner.t <= 0) S.banner = null; }
  if (S.flashRed > 0) S.flashRed -= dt;
  if (S.state === 'over') S.overT += dt;

  // ───── render
  g.save();
  if (S.shake > 0) g.translate((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake);
  drawBackground(dt);
  for (const b of birds) drawBird(b);
  for (const c of coins) drawCoin(c.x, c.y, c.spin, true, c.charged, c.r);
  drawHand();
  if (S.state === 'play') {
    if (S.dragging) drawSling();
    const ht = handTop(); if (S.ammo > 0) drawCoin(ht.x, ht.y, 0, false, false);
    if (S.charging) drawTrajectory(POWER_MIN + (POWER_MAX - POWER_MIN) * S.charge);
  }
  for (const p of parts) { const a = Math.max(0, p.life / 0.6); g.globalAlpha = a; if (p.star) drawStar(p.x, p.y, 3, p.col); else { g.fillStyle = p.col; g.beginPath(); g.ellipse(p.x, p.y, 1.6, 1.6, 0, 0, TAU); g.fill(); } }
  g.globalAlpha = 1;
  for (const p of pops) { g.globalAlpha = Math.min(1, p.t / 0.4); text(p.text, p.x, p.y, 18, p.col, 'center'); }
  g.globalAlpha = 1;
  if (S.banner) { g.globalAlpha = Math.min(1, S.banner.t / 0.4); text(S.banner.text, S.VW / 2, 82, 24, '#fff', 'center'); g.globalAlpha = 1; }
  if (S.flashRed > 0) { g.fillStyle = `rgba(255,46,66,${S.flashRed * 0.5})`; g.fillRect(0, 0, S.VW, S.VH); }
  drawHUD();
  if (S.state === 'play') drawPauseBtn();
  if (S.state === 'paused') drawPaused();
  if (S.state === 'over') drawGameOver();
  g.restore();

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buf, 0, 0, S.VW, S.VH, 0, 0, cv.width, cv.height);   // blit upscaled, crisp

  requestAnimationFrame(frame);
}

// ── boot
resize();
S.prev = performance.now();
requestAnimationFrame(frame);

// expose a little hook for debugging / manual stepping
window.__G = { S, coins, birds, parts, pops, frame, spawnOne, release, restart };
