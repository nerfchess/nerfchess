// Board-fraction coordinates: x,y in [0,1] measured across the board crop
// (0,0 = top-left of the crop as RENDERED, i.e. already orientation-resolved).
export type VfxPoint = { x: number; y: number };
export type VfxTravel = "bolt" | "arc" | "beam" | "wave" | "rain" | "chain" | "none";
export type VfxImpact = "burst" | "shatter" | "embers" | "smoke" | "debris" | "sparkle" | "shock";
export type VfxAftermath = "scorch" | "frost" | "sparkle" | "smolder" | "none";
export interface VfxPlay {
  tier: number;                       // drives intensity + cinematic staging (7+ = full ~2s sequence)
  palette: string[];                  // 2-4 css colors, primary first
  source?: VfxPoint;                  // where the effect originates (omitted = center-top of board)
  // Where it lands, staggered. `from` overrides `source` for that one target,
  // which is how a play travels along its real victim order: a sweep rolls
  // square to square and a chain hops victim to victim, instead of every leg
  // firing from one origin. Omitted = start at `source`, the original fan.
  targets: { p: VfxPoint; delayMs?: number; from?: VfxPoint }[];
  travel?: VfxTravel;                 // how it gets there ("none" = impacts only)
  impact?: VfxImpact;
  aftermath?: VfxAftermath;           // lingering residue on target squares (~600ms fade)
  shake?: boolean;                    // ask the host to thump the board on first impact
  squareSize?: number;                // fraction of board width one square occupies (default 1/8)
  intensity?: number;                 // particle-count multiplier from the effects dial (default 1, clamped 0.3-2)
  durationScale?: number;             // stretches/squeezes every lifetime + stagger (Settings > card effect duration; default 1, clamped 0.5-2)
}
