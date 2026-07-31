# Site themes

The site theme is a Settings > Appearance preference (`settings.siteTheme`),
applied by `applyUiPrefs` as `html[data-theme="<id>"]`. There are two kinds, and
the picker separates them because they promise different things.

## Tints

`dark`, `light`, `system`, `midnight`, `void`, `abyss`, `ember`, `crimson`,
`moss`, `nebula`.

A tint overrides **four tokens** and nothing else:

```css
html[data-theme="moss"] {
  --bg-base: #0f140e;
  --bg-panel: #1a2318;
  --bg-raised: #253021;
  --border-subtle: #2d3c27;
}
```

The whole surface/edge ladder and the page wash are computed from those four in
`:root`, so a tint costs no per-component work. Every tint shares one gold
accent, deliberately: the game must read identically in all of them.

## Flagships

`obsidian`, `porcelain`, `neon`, `jade`, `aurora`.

A flagship is a different room, not a filter. Each one owns:

| | |
| --- | --- |
| **Palette** | background, border and text tokens |
| **Accent** | its own primary accent (`--accent-gold` and aliases) plus the ink that sits on an accent fill |
| **Atmosphere** | a fixed layer on `html::after` — the light in the room |
| **Material** | its own `.plate` box-shadow — what a panel is made of under that light |
| **Motion** | its own durations and reveal curve |
| **Chests** | its own draft-chest material and brightness |

| Theme | Reads as | Accent | Feel |
| --- | --- | --- | --- |
| Obsidian | Volcanic glass, molten ember | `#ff7a2f` | Heavy. Deep press, hard specular edge, slow |
| Porcelain | Glazed white, cobalt ink | `#2a55b8` | Crisp. Light scheme, no bloom, fast |
| Neon | Arcade indigo, hot magenta | `#ff45c8` | Snappy. Max bloom, overshooting reveal |
| Jade | Lacquer green, jade inlay | `#2fbf9f` | Calm. Long even easing, quiet |
| Aurora | Polar night, violet light | `#9d7bff` | Floaty. Soft diffuse bloom, long rises |

### What a flagship must never touch

- **The semantic accents.** `--accent-nerf` (red), `--accent-buff` (blue) and
  `--accent-positive` (green) mean mode, danger and a win. A theme that
  recoloured them would lie about the game, so every flagship hue is chosen
  clear of that red/blue/green rather than being a shade of it. Porcelain is the
  one theme that adjusts them, and only in the way the Light theme does: darkened
  to the same hues so they still clear WCAG AA as text on paper.
- **The board.** Board colours are the player's own setting (`BOARD_THEMES`,
  applied inline as `--sq-light` / `--sq-dark`). A site theme must not fight it.
- **Layout.** No radius, spacing or type-scale changes. A theme changes the light
  and the weight, never where the furniture sits.

## The three page layers

A palette alone leaves five pages that differ only in hue, so a flagship also
owns the light in the room. Three fixed layers stack behind every page:

| Layer | What it is |
| --- | --- |
| `html` background-color | the canvas fill, so nothing flashes before paint |
| `html::before` | the token-derived page wash (every theme gets it free) |
| `html::after` | the flagship atmosphere (only the five define one) |

**`body` must stay `background-color: transparent`.** Body's background paints
after html's negative-z children, so an opaque colour there covers both fixed
layers — which is exactly what used to happen, leaving the page wash this file
documents invisible on every theme. A custom background image still works: that
sets `background-image` on body and layers over the same canvas.

Atmospheres are decoration, so all five park under Performance mode
(`html[data-perf="low"]::after { display: none }`). Aurora's is the only animated
one; it moves by transform alone and stops under Performance mode or when
animations are off.

## Theme character tokens

The four tokens that let a theme change how the interface *feels*, defined in
`:root` and overridden per flagship:

| Token | Default | Drives |
| --- | --- | --- |
| `--feel-press` | `0.98` | `.press:active` scale |
| `--feel-sheen` | `0.028` | top-light alpha on `.plate` |
| `--feel-glow` | `1` | multiplier on accent bloom (`.gilt`, primary button halo) |
| `--ease-signature` | `var(--ease-out)` | reveal curve (`.draft-in`, `.stagger-in`) |

Themes also override the shared `--dur-1/2/3` and `--ease-out`.

## Light-scheme themes

Paper treatments (plate fill, the ink text ramp, border alphas, input styling)
hang off `html[data-light]`, which `applyUiPrefs` sets whenever the active
theme's `scheme` is `light`. They are not keyed to the `light` theme id, so a new
light theme costs no extra CSS. The ink ramp reads the active theme's own
`--text-primary` / `--text-secondary` / `--text-muted`, so it retints per theme.

## Chest materials

`DraftChest.css` gives every draft chest a material band from the best tier in
the offer: `wood`, `iron`, `gilded`, `arcane`, `apex`, `mythic`.

A flagship re-skins the three **mundane** bands (wood, iron, gilded) into its own
material and turns one dial for brightness:

- `--chest-glow` — the band's base brightness. Set by the band, never by a theme.
- `--chest-lumen` — the theme's multiplier on it (porcelain `0.5`, neon `1.6`).
- `--chest-lit` — what every glow actually reads: the product of the two.

The three **relic** bands (arcane, apex, mythic) and `--chest-rgb`, the exact
tier tint, are deliberately left alone in every theme. Their look is tier
identity: a player learns that a violet relic chest means tier 7-8 and a burning
cyan one means a mythic, and that promise has to hold everywhere.

`/dev/chest` renders the whole ladder side by side for eyeballing a theme.

## Adding a theme

1. Add the id to `SiteTheme` and an entry to `SITE_THEMES` in `src/lib/settings.ts`
   (label, hint, scheme, swatch, accent). The picker renders from that map, so
   the UI needs no change. Add it to `FLAGSHIP_THEMES` if it is one.
2. Add the `html[data-theme="<id>"]` block in `globals.css`. A tint needs four
   tokens; a flagship needs palette, accent, `--text-on-accent` and the feel
   tokens. Keep the accent in step with the `AccentDef` in `SITE_THEMES` — while
   the accent setting is on "auto", `applyUiPrefs` feeds that one in.
3. For a flagship, add its atmosphere (`html[data-theme="<id>"]::after`, listed
   in the shared `content: ""` rule) and its `.plate` material.
4. For a flagship, add its chest block in `DraftChest.css`.
5. Check contrast with the atmosphere on: body text, secondary text and the
   accent should all clear 4.5:1 on `--surface-panel`, and `--text-on-accent`
   should clear 4.5:1 on the accent fill.
