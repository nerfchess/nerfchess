// Public entry point for the passive visual effect engine.

export * from "./spec";
export * from "./registry";
export { PRIMITIVES, PRIMITIVE_MANIFEST, CompositionLayers } from "./primitives";
export type { PrimitiveProps, PrimitiveManifestEntry } from "./primitives";
export * from "./contract";
export {
  activationId,
  hasPlayedActivation,
  markActivationPlayed,
  resetPassiveActivations,
  useReducedMotion,
} from "./runtime";
export { PassiveSpawn } from "./PassiveSpawn";
export type { PassiveSpawnProps } from "./PassiveSpawn";
export { PassiveAura } from "./PassiveAura";
export { PassivePulse } from "./PassivePulse";
export type { PassivePulseProps } from "./PassivePulse";
export { PassiveExit } from "./PassiveExit";
export type { PassiveExitProps } from "./PassiveExit";
