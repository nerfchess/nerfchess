# Logo redesign (2026-07-05)

The owner supplied a hand-drawn logo sketch and asked for it to become the site logo. Recreated it as a clean vector in `public/logo.svg` (512×512 viewBox, transparent background):

- Diamond-rotated 8×8 board in tan/brown (`#a9895a` / `#eadfc4`).
- Hand-painted lowercase "nc" — gray n, sky-blue c.
- Black king and queen silhouettes with thick white outlines (outline done via a white stroke pass under a solid fill pass, so it reads on dark backgrounds).
- Roman numerals on the pieces from the sketch: king **I** (green), queen **VIII** (red) — the nerfed queen is worth 8, not 9.

`LogoMark` in `src/components/Logo.tsx` now renders `<img src="/logo.svg">` instead of the old inline knight-on-plate SVG, so favicon (`layout.tsx` icons already point at `/logo.svg`) and header share one asset. Header wordmark "nerfchess" unchanged.
