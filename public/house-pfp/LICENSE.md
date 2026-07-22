# House bot avatar pack

Every image in this directory is original flat vector art created for
NerfChess, in two groups:

1. Hand-authored scenic/object/character SVGs (named files such as
   `mountain_lake.svg`, `coffee_mug.svg`, `troll_face.svg`). Drawn from
   scratch for this project. Nothing is traced, copied, or derived from
   photographs, other artists' work, Lichess users, or any identifiable
   person or copyrighted character.
2. Procedurally generated subjects (`gen_000.svg` through `gen_559.svg`),
   emitted deterministically by `scripts/gen-house-pfps.mjs` from original
   vector motifs defined in that script.

All images are the project's own work and are covered by the repository's
license. No third-party image assets, stock art, or avatar services are
used, and no attribution to any outside source is required.

Stability contract: generated files are byte-stable per index. The generator
only ever appends new indexes; existing files are never regenerated with
different content, so every assigned bot avatar stays identical between
sessions and deployments. SVG output is resolution-independent (no separate
small/medium/large rasters needed) and is served as small (~1-3 KB) files.
