# Homepage performance fixes — implementation spec

**Date:** 2026-07-10
**Problem:** The homepage is laggy after the #300 merge (home redesign + tier 5-7
effects). Two distinct causes: a huge JS bundle on the landing route, and
main-thread work from always-running CSS animations plus expensive paint
features.

Diagnosis summary (see PR discussion for details):

1. `HeroTv` renders the full in-game `Board` component, which statically pulls
   the entire effects stack (~24k lines: `BoardEffects`, `godPlays`,
   `greatPlays`, `funnyPlays`, `vfxSpecs`, framer-motion) into the `/` bundle —
   even though the hero board is `disabled` and never fires an effect.
2. Two infinite CSS animations animate `left` (a layout property, so they run
   style→layout→paint on the main thread every frame): the galloping knight
   and the CTA sheen.
3. `.tv-frame` uses `backdrop-filter: blur(10px)` on top of a
   `background-attachment: fixed` body gradient — both force repaints on
   scroll, and they compound.

The lobby poll (10s), the hero watch socket, and the `dot-live` ping
animations were checked and are cheap; no changes there.

---

## 1. Replace `Board` in the hero with a lightweight spectator board

**Goal:** the `/` route bundle must not contain `BoardEffects`, the
`*Plays` modules, `vfxSpecs`, or framer-motion.

### 1a. Generalize `HeroBoard` into the hero's only board renderer

File: `src/components/HeroBoard.tsx` (86 lines, zero effect imports — keep it
that way).

Extend it to optionally render a real position instead of the hardcoded demo
FEN:

```ts
type HeroBoardProps = {
  /** Live/replay position; falls back to the built-in demo FEN when absent. */
  board?: BoardState;
  /** Highlights from/to with the same .sq-last treatment as LAST_MOVE. */
  lastMove?: Move | null;
};
```

- When `board` is provided, derive the 64 row-major cells (row 0 = rank 8,
  col 0 = file a — the existing layout order) from `BoardState` using the
  `SQ`/`FILE`/`RANK` helpers in `@/engine/types`, and compute the two
  highlighted indices from `lastMove.from`/`lastMove.to`.
- When absent, keep the current `parseFen(FEN)` + `LAST_MOVE` path unchanged.
- Everything else (grid markup, `sq-light`/`sq-dark`/`sq-last` classes,
  `Piece` rendering, coordinate labels) stays as-is. No interaction, no
  animation, no move arrows — the hero is a TV, not a game surface.

### 1b. Swap it into `HeroTv`

File: `src/components/HeroTv.tsx`.

- Delete `import { Board } from "./Board";`.
- Replace the `<Board board={board} ... disabled showCoordinates={false} />`
  block inside the tv-frame link with
  `<HeroBoard board={board} lastMove={lastMove} />`.
- The empty-state branch already renders `<HeroBoard />`; unchanged.
- `replayUci` / `MPSession` / lobby imports stay — the engine's move logic is
  needed to replay the stream and is small relative to the effects stack.

Note: pieces will no longer glide between squares on live moves (the full
Board animates them; HeroBoard repaints). Accepted trade-off — the hero is a
distant preview. If it reads badly, a CSS-only transform transition on the
moving piece can be added to HeroBoard later; do NOT reach back into Board.

### 1c. Guardrail

Add a comment atop `HeroBoard.tsx` stating it is the homepage's board and must
never import from `./Board` or `./effects/*`. (If we ever get a bundle-size CI
check, `/` first-load JS is the number to watch; see Verification.)

---

## 2. Move the `left` animations onto `transform`

File: `src/app/globals.css`.

### 2a. Knight runner (`knight-run`, ~line 857)

The runner travels a distance defined by the track width, so use container
query units:

```css
.knight-track { container-type: inline-size; /* existing rules unchanged */ }
.knight-runner {
  position: absolute;
  bottom: 5px;
  left: 0;                      /* was left: -6%; motion now via transform */
  will-change: transform;
  animation: knight-run 16s linear 2s infinite;
  /* font-size, color, opacity: 0 unchanged */
}
@keyframes knight-run {
  0%   { transform: translateX(-6cqw);  opacity: 0; }
  4%   { opacity: 0.85; }
  50%  { opacity: 0.85; }
  55%, 100% { transform: translateX(101cqw); opacity: 0; }
}
```

Same timing, same path, compositor-only. The inner `knight-hop` span is
already transform-based; leave it.

### 2b. CTA sheen (`cta-sweep`, ~line 777)

The sheen is 42% of the button wide, so self-relative `translateX`
percentages can express the same sweep without container units:
`left: -60%` of the button ≈ `translateX(-143%)` of the sheen, and
`left: 130%` ≈ `translateX(310%)`.

```css
.cta-shine::after {
  /* content/top/bottom/width/background/pointer-events unchanged */
  left: 0;
  transform: translateX(-143%) skewX(-18deg);
  will-change: transform;
  animation: cta-sweep 5s ease-in-out 1.2s infinite;
}
@keyframes cta-sweep {
  0%, 62%   { transform: translateX(-143%) skewX(-18deg); }
  86%, 100% { transform: translateX(310%)  skewX(-18deg); }
}
```

`skewX` must ride along in every keyframe since `transform` is now animated.

### 2c. Reduced motion

Both animations must be disabled under `prefers-reduced-motion: reduce` (the
file already has a gate block near line 639 — add these selectors to it if
they're not already covered).

---

## 3. Drop the expensive paint features

File: `src/app/globals.css`.

### 3a. `.tv-frame` backdrop blur (~line 740)

Delete both `backdrop-filter` and `-webkit-backdrop-filter` lines. What's
behind the frame is just the body gradient, so bake the frost in instead:
raise the frame's own base layer from `rgba(22, 21, 18, 0.6)` to about
`rgba(28, 26, 22, 0.92)` and keep the existing top gradient overlay. Eyeball
against the current look in both themes; the light-theme override
(`rgba(255,255,255,0.6)` → ~`0.9`) gets the same treatment.

### 3b. Body `background-attachment: fixed` (~line 157)

Replace the fixed-attachment gradient with a fixed-position pseudo-element,
which gives identical visuals (gradient pinned to the viewport, no white flash
on overscroll) without the repaint-on-scroll cost:

```css
html, body {
  background-color: #191713;   /* keep: overscroll guard */
  color: var(--paper);
  min-height: 100vh;
}
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: linear-gradient(180deg, #282420 0%, #1e1b17 46%, #191713 100%);
}
```

Check the light theme: if `html[data-theme="light"]` restyles the body
gradient, the override must move to `body::before` too. Also grep for any
other `background-attachment: fixed` while in there.

---

## 4. Optional follow-up (measure first)

`src/app/page.tsx` imports `ALL_NERFS`/`ALL_BUFFS` only for `.length` in the
signed-in stat strip. If the bundle analysis in Verification shows the card
libraries are a meaningful share of `/` first-load JS, replace with exported
`NERF_COUNT`/`BUFF_COUNT` constants (or a generated count). Skip if the win is
small — the libraries are shared with other routes anyway.

---

## Verification

1. **Bundle:** `next build` before and after; record `/` first-load JS from
   the route table. Expect a large drop (the effects stack + framer-motion
   leaving the route). Confirm with `@next/bundle-analyzer` that no
   `effects/*` module appears in the `/` chunk graph.
2. **Runtime:** DevTools performance trace, 10s idle on the homepage:
   no recurring Layout/Recalculate-style work from the knight or sheen
   (their animations should show as compositor-only). Scroll the page
   top-to-bottom: no long paint frames from the gradient or tv-frame.
3. **Visual:** homepage in dark + light themes, desktop + mobile widths:
   hero shows the demo board when no games exist, a live game when one is
   running (moves appear, `sq-last` trail follows), knight still gallops,
   CTA sheen still sweeps, tv-frame still reads frosted.
4. **Reduced motion:** with `prefers-reduced-motion: reduce`, knight and
   sheen are static.
5. Full game page (`/game/[id]`) unaffected — `Board.tsx` itself is untouched.
