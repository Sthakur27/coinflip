// Static configuration: palette, physics constants, and entity tables.
// Nothing here mutates at runtime.

export const DARK = '#241734';
export const SKY_T = '#3aa6f0', SKY_M = '#84d0ff', SKY_B = '#c9eeff';
export const PAL = {
  bird: '#ff5a72', birdDk: '#e23a59', belly: '#ffd9c2', beak: '#ffb02e', beakDk: '#e88a16',
  skin: '#f3b078', skinDk: '#d98a55',
  gold: '#ffd34d', goldDk: '#e0a31f', goldLt: '#fff0a8', goldEdge: '#caa015',
  superA: '#ff5ea8', superB: '#ff7ab6', superDk: '#a82e6a', superLt: '#ffd0ea', superEdge: '#c83a82',
  grass: '#76d36b', grassDk: '#57b657', hill: '#8de07f', hillDk: '#6fc864',
  cloud: '#ffffff', cloudSh: '#dff1ff', sun: '#ffe9a0', sunDk: '#ffd45e',
};
export const TAU = Math.PI * 2;
export const LW = 1.4;                       // outline width (logical px)

// world / physics
export const GROUND_Y = 300;
export const GRAVITY = 700;
export const POWER_MIN = 380, POWER_MAX = 730;   // fling speed at 0% / 100% pull (higher floor)
export const MAX_TILT = 1.1;                     // ~63° off vertical
export const COIN_R = 6;
export const CHARGE_RATE = 1.55;                 // keyboard hold-to-charge speed

// resources
export const AMMO_MAX = 3, REGEN_TIME = 3;       // 3 coins; one back every 3s
export const HEART_MAX = 3;

// slingshot input: pull distance → power
export const MAX_PULL = 70, DEAD_PULL = 10, VIS_PULL = 42;

// target birds
export const TYPES = {
  sparrow: { r: 11, hp: 1, spd: 1.00, pts: 1, body: '#ff5a72', dk: '#e23a59', belly: '#ffd9c2' },
  pigeon:  { r: 15, hp: 2, spd: 0.62, pts: 2, body: '#94a6c8', dk: '#6c7fa6', belly: '#e2e9f6' },
  swift:   { r: 8,  hp: 1, spd: 1.45, pts: 1, body: '#54d6c2', dk: '#2fae9c', belly: '#d9fff8', zig: true },
  thief:   { r: 11, hp: 1, spd: 1.05, pts: 2, body: '#43435a', dk: '#27273a', belly: '#ececf4', thief: true },
  golden:  { r: 12, hp: 1, spd: 0.60, pts: 5, body: '#ffd34d', dk: '#e0a31f', belly: '#fff3b0', golden: true },
  gift:    { r: 12, hp: 1, spd: 0.72, pts: 2, body: '#b06bff', dk: '#7d3fd0', belly: '#ecd9ff', gift: true },
};

// power-ups carried by gift birds
export const POWERUPS = {
  triple:   { dur: 12, name: 'TRIPLE SHOT',    col: '#6ee7ff' },
  shotgun:  { dur: 12, name: 'SHOTGUN',        col: '#ffb02e' },
  big:      { dur: 12, name: 'BIG COINS',      col: '#7dffb0' },
  slowmo:   { dur: 8,  name: 'SLOW-MO',        col: '#c89bff' },
  infinite: { dur: 10, name: 'UNLIMITED AMMO', col: '#ffd34d' },
};
export const PU_KEYS = Object.keys(POWERUPS);

// basketball hoop (rare required target): rim opening + decorative chain net
export const HOOP = { rimW: 15, postR: 3, chainN: 4, links: 4, seg: 4.6 };
