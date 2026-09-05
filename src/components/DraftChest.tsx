"use client";

import "./DraftChest.css";

// The draft treasure chest: every offer arrives sealed inside a dungeon chest
// whose material climbs with the best card inside — worn oak at the bottom of
// the ladder, iron-bound, gilded vault, arcane relic, apex crown, and the
// mythic star chest at the top. The chest is pure CSS layers (no images),
// transform/opacity animation only, and both faces of the lifecycle are owned
// here: the sealed idle (breathing, seam light, rune orbit) and the opening
// (quake -> hasp pops -> lid swings -> light floods -> motes climb).
//
// The caller owns the stage machine ("sealed" | "tearing") and unmounts the
// chest once the cards deal; `calm` (FX dial at Off/Calm) strips the particle
// and ray layers while keeping the chest itself readable.

export type ChestBand = "wood" | "iron" | "gilded" | "arcane" | "apex" | "mythic";

export function chestBand(tier: number): ChestBand {
  if (tier >= 10) return "mythic";
  if (tier >= 9) return "apex";
  if (tier >= 7) return "arcane";
  if (tier >= 5) return "gilded";
  if (tier >= 3) return "iron";
  return "wood";
}

const BAND_NAME: Record<ChestBand, string> = {
  wood: "Worn oak chest",
  iron: "Iron-bound chest",
  gilded: "Gilded vault chest",
  arcane: "Arcane relic chest",
  apex: "Apex crown chest",
  mythic: "Mythic star chest",
};

interface Props {
  /** Highest tier in the offer: decides the chest material and tint. */
  tier: number;
  /** Number of cards inside (the numeral on the plaque). */
  count: number;
  /** "Buff pack · draft #4"-style caption under the numeral. */
  label: string;
  stage: "sealed" | "tearing";
  onOpen: () => void;
  /** Compact variant for the minimized side panel. */
  mini?: boolean;
  /** FX dial at Off/Calm: no motes, rays, or orbiting runes. */
  calm?: boolean;
  /** Reduced motion: render a static closed chest (the caller usually skips
   *  the sealed stage entirely under reduced motion; this is the fallback). */
  still?: boolean;
}

export function DraftChest({ tier, count, label, stage, onOpen, mini, calm, still }: Props) {
  const band = chestBand(tier);
  const opening = stage === "tearing";
  const showAura = !calm && !still;
  // Ray fan + rune orbit are the relic-grade dressings (arcane and up).
  const relic = band === "arcane" || band === "apex" || band === "mythic";

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open the ${BAND_NAME[band].toLowerCase()} (${count} cards)`}
      data-band={band}
      data-tier={tier}
      className={
        "chest-shell mx-auto block" +
        (mini ? " chest-shell--mini" : "") +
        (opening ? " chest-shell--opening" : "") +
        (still ? " chest-shell--still" : "")
      }
    >
      <span aria-hidden className="chest-scene">
        {/* Floor pool: the chest sits in its own light. */}
        <i className="chest-underglow" />
        {/* Relic dressing: a slow god-ray fan behind the chest. */}
        {showAura && relic && <i className="chest-rays" />}
        {/* Orbiting rune seal for relic chests, echoing the pack's old seal. */}
        {showAura && relic && (
          <i className="chest-runes">
            {Array.from({ length: 8 }).map((_, i) => (
              <b key={i} style={{ ["--ra" as string]: `${i * 45}deg` }} />
            ))}
          </i>
        )}
        {/* The light shaft that erupts when the lid swings. */}
        <i className="chest-shaft" />
        <i className="chest-burst" />

        {/* The box has depth: two side faces rotated out of the front plane,
            and the lid carries an inner face so the swing shows its underside. */}
        <i className="chest-side chest-side--l" />
        <i className="chest-side chest-side--r" />
        <i className="chest-wedge" />

        {/* Lid: arched plank slab hinged at its back edge. */}
        <i className="chest-lid">
          <b className="chest-lid__planks" />
          <b className="chest-lid__strap chest-lid__strap--l" />
          <b className="chest-lid__strap chest-lid__strap--r" />
          <b className="chest-lid__rim" />
          <b className="chest-lid__inner" />
        </i>

        {/* Seam light: leaks while sealed on gilded+, floods on open. */}
        <i className="chest-seam" />

        {/* Body: plank front, corner brackets, straps, plaque. */}
        <i className="chest-body">
          <b className="chest-body__planks" />
          <b className="chest-body__strap chest-body__strap--l" />
          <b className="chest-body__strap chest-body__strap--r" />
          <b className="chest-body__bracket chest-body__bracket--tl" />
          <b className="chest-body__bracket chest-body__bracket--tr" />
          <b className="chest-body__bracket chest-body__bracket--bl" />
          <b className="chest-body__bracket chest-body__bracket--br" />
          <b className="chest-plaque">
            <span className="chest-plaque__numeral font-display">{count}</span>
          </b>
        </i>

        {/* Hasp + keyhole gem: flares, pops, and drops on open. */}
        <i className="chest-lock">
          <b className="chest-lock__plate" />
          <b className="chest-lock__gem" />
        </i>

        {/* Rising motes while opening (and a faint idle drift on relics). */}
        {showAura && (
          <i className="chest-motes">
            {Array.from({ length: relic ? 12 : 7 }).map((_, i) => (
              <b
                key={i}
                style={{
                  ["--mx" as string]: `${10 + ((i * 61) % 80)}%`,
                  ["--md" as string]: `${(i % 5) * 90}ms`,
                  ["--mt" as string]: `${900 + ((i * 97) % 500)}ms`,
                  ["--ms" as string]: `${0.6 + ((i * 29) % 5) / 10}`,
                }}
              />
            ))}
          </i>
        )}
      </span>

      <span className="chest-caption">
        <span className="chest-caption__band">{BAND_NAME[band]}</span>
        <span className="chest-caption__label">{label}</span>
        {stage === "sealed" && <span className="chest-caption__hint">Tap to open</span>}
      </span>
    </button>
  );
}
