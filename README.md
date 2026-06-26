# 🪙 Coin Flip — bonk the bird!

A tiny pixel-art arcade game built with **zero dependencies** — just HTML5 Canvas and
vanilla ES modules. You're a hand at the bottom of the screen; pull back like a
slingshot and fling spinning coins at the birds crossing the sky.

## Play

Open it through a local web server (ES modules don't load from `file://`):

```bash
# from the project root
python3 -m http.server 8731
# then visit http://localhost:8731
```

### Controls
- **Drag** anywhere and release to fling a coin — pull *distance* sets power, pull
  *direction* sets aim, and the coin flies **opposite** the pull (Angry-Birds style).
  The world slows slightly while you aim.
- **Space** (hold/release) — a straight-up shot, keyboard fallback.
- **P** / **Esc** — pause. **Enter** / **R** or the on-screen button — retry after a game over.
- Works with touch too (drag = touch-drag), so it's mobile-ready.

## How it plays
- You have a **3-coin energy bar**: each flip spends one, you regen one every 3s, and
  **bonking a bird refunds one** instantly.
- Coins **tumble** (heads → edge → tails) and **bounce off each other**. Clink two coins
  mid-air and they become **pink super coins** — worth **3×** and they refund a coin.
- **3 hearts.** A bird that crosses unhit costs a heart; a **thief** also steals a coin.
  Zero hearts = game over.
- **Bird types:** sparrow (1pt), pigeon (big, 2 hits), swift (fast, zigzag), thief (steals),
  golden (rare, +5 & +1 heart), and **gift** birds that drop a timed power-up:
  *triple shot, shotgun, big coins, slow-mo, unlimited ammo*.
- Difficulty scales endlessly by score (faster birds, more on screen, swoops), with a
  **STAGE** banner every 10 points.

## Project structure

```
index.html      — minimal shell (canvas + module entry)
style.css       — fullscreen pixelated canvas
src/
  config.js     — palette, physics constants, bird & power-up tables (no runtime state)
  state.js      — pixel buffer, shared mutable state `S`, entity pools, resize + geometry
  audio.js      — tiny WebAudio blip generator
  draw.js       — all rendering: primitives, entities, HUD, overlays
  game.js       — entry: spawning, scoring, input, and the main loop
```

## How it renders
Everything is drawn into a small offscreen buffer at a fixed logical height (360px;
width adapts to the window) and blitted upscaled with image smoothing **off** — that's
what gives the crisp, chunky pixel look. All sprites are drawn procedurally (shapes +
bold outlines), so there are no image assets to load.

## Tech
Plain JavaScript modules, no build step, no framework — just static files.
