"use client";

import "./DraftVault.css";

// The draft vault: every offer arrives sealed inside a floating six-sided
// sigil vault, a real CSS 3D prism (six faces, two caps) hovering over a pair
// of counter-rotating rune rings. Its material climbs with the best card
// inside, from rough slate at the bottom of the ladder to the mythic
// star-glass at the top. On open the rings flare and lift, the prism spins up,
// its faces shear away from the core and burn out, and the light inside blooms
// into a flash and a shockwave; the cards deal out of that light.
//
// Pure CSS layers, no images, transform/opacity only. The caller owns the stage
// machine ("sealed" | "tearing") and unmounts the vault once the cards deal.
// `calm` (FX dial at Off/Calm) strips the motes and the ring spin while keeping
// the vault readable; `still` renders a static sealed vault.

export type VaultBand = "slate" | "iron" | "gilt" | "arcane" | "apex" | "mythic";

export function vaultBand(tier: number): VaultBand {
  if (tier >= 10) return "mythic";
  if (tier >= 9) return "apex";
  if (tier >= 7) return "arcane";
  if (tier >= 5) return "gilt";
  if (tier >= 3) return "iron";
  return "slate";
}

const BAND_NAME: Record<VaultBand, string> = {
  slate: "Slate vault",
  iron: "Iron vault",
  gilt: "Gilt vault",
  arcane: "Arcane vault",
  apex: "Apex vault",
  mythic: "Mythic vault",
};

/** Total length of the opening choreography (spin-up through flash), so the
 *  caller can time the deal to land as the light peaks. */
export const VAULT_OPEN_MS = 920;

interface Props {
  /** Highest tier in the offer: decides the vault material and tint. */
  tier: number;
  /** Number of cards inside (the numeral on the front face). */
  count: number;
  /** "Buff pack · draft #4"-style caption under the vault. */
  label: string;
  stage: "sealed" | "tearing";
  onOpen: () => void;
  /** Compact variant for the minimized corner panel. */
  mini?: boolean;
  /** FX dial at Off/Calm: no motes, no ring spin. */
  calm?: boolean;
  /** Reduced motion: a static sealed vault (the caller usually skips the
   *  sealed stage entirely under reduced motion; this is the fallback). */
  still?: boolean;
}

const FACES = [0, 60, 120, 180, 240, 300];

export function DraftVault({ tier, count, label, stage, onOpen, mini, calm, still }: Props) {
  const band = vaultBand(tier);
  const opening = stage === "tearing";
  const showAura = !calm && !still;
  const relic = band === "arcane" || band === "apex" || band === "mythic";

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open the ${BAND_NAME[band].toLowerCase()} (${count} cards)`}
      data-band={band}
      data-tier={tier}
      className={
        "vault-shell mx-auto block" +
        (mini ? " vault-shell--mini" : "") +
        (opening ? " vault-shell--opening" : "") +
        (still ? " vault-shell--still" : "") +
        (calm ? " vault-shell--calm" : "")
      }
    >
      <span aria-hidden className="vault-scene">
        {/* Floor pool: the vault hangs in its own light. */}
        <i className="vault-floor" />

        {/* Two rune rings lying flat under the prism, counter-rotating. */}
        <i className="vault-ring vault-ring--outer" />
        <i className="vault-ring vault-ring--inner" />

        {/* The light inside: hidden behind the faces until they shear away. */}
        <i className="vault-core" />
        <i className="vault-flash" />
        <i className="vault-shock" />
        {relic && <i className="vault-shock vault-shock--2" />}

        {/* The prism: six faces around a hexagon, a cap top and bottom. */}
        <i className="vault-prism">
          {FACES.map((deg, i) => (
            <b
              key={deg}
              className={"vault-face" + (i === 0 ? " vault-face--front" : "")}
              style={{ ["--fa" as string]: `${deg}deg`, ["--fi" as string]: String(i) }}
            >
              {i === 0 ? (
                <span className="vault-face__numeral font-display">{count}</span>
              ) : (
                <span className="vault-face__glyph" />
              )}
            </b>
          ))}
          <b className="vault-cap vault-cap--top" />
          <b className="vault-cap vault-cap--bottom" />
        </i>

        {/* Rising motes: a faint idle drift on relic vaults, a column on open. */}
        {showAura && (
          <i className="vault-motes">
            {Array.from({ length: relic ? 14 : 8 }).map((_, i) => (
              <b
                key={i}
                style={{
                  ["--mx" as string]: `${12 + ((i * 53) % 76)}%`,
                  ["--md" as string]: `${(i % 6) * 70}ms`,
                  ["--mt" as string]: `${800 + ((i * 89) % 500)}ms`,
                  ["--ms" as string]: `${0.6 + ((i * 31) % 5) / 10}`,
                }}
              />
            ))}
          </i>
        )}
      </span>

      <span className="vault-caption">
        <span className="vault-caption__band">{BAND_NAME[band]}</span>
        <span className="vault-caption__label">{label}</span>
        {stage === "sealed" && <span className="vault-caption__hint">Tap to open</span>}
      </span>
    </button>
  );
}
