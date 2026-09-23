"use client";

// Single-card play stage for /dev/plays?id=<card>. The scriptable half of the
// gallery (docs/polish-pass F228): one card, played on the REAL Board, on the
// anchor square and targets the URL names, for either side, at the speed and
// --fx-dur the URL names. scripts/polish/card-strip.ts drives it through
// window.__cardStage and turns the play into a frame strip.
//
// Why the real Board and not the grid's lone SignatureCut: a card's play in a
// game is several layers at once (the cast spectacle and banner, the lead
// scene on the cast square, one target cut per victim in choreography order
// with its own leg geometry, the canvas VFX, the usage beat), and only Board
// composes them. Reviewing the lead cut alone hides most of what a player sees.
//
// Two drives, reported in the info panel so a strip always says which ran:
//
//   engine  The card is granted to the caster in a sandbox game and used for
//           real (activateBuff with target picks, or acquireBuff for an
//           instant). The board diff, the zones and the outcome are the
//           engine's own, so the strip tells the truth about the rule. Picks
//           prefer the URL's squares (see preferSquare).
//   stage   A synthetic diff for cards the engine cannot fire here (passives,
//           cards with no valid use in the position): the victims are removed,
//           or added to the zone the card's signature config names as its
//           source (frozen, shield, empower...), which is exactly what Board
//           reads to stage the scene. Used as the fallback of drive=auto.
//           A removal-sourced card that is not an attack card plays
//           diff-less (spectacle and lead only) unless the URL names victims.
//
// event=grant swaps the use for an acquisition: the card enters the caster's
// hand, which is what a draft pick shows (the entrance beat; an instant also
// resolves and plays, as it does live).
//
// The game state is cloned (serialize / deserialize) before each play, as a
// wire update would be, so Board sees fresh piece and buff arrays and diffs
// them the way it does in an online game. The engine mutates the board in
// place, so without the clone Board would see no removal at all.

import * as React from "react";
import { Board } from "@/components/Board";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { isRetired } from "@/engine/retired";
import {
  UNRESTRICTED_NERF,
  acquireBuff,
  activateBuff,
  buffNextTarget,
  deserializeGame,
  enableDraftMode,
  newGame,
  serializeGame,
  type NerfGame,
} from "@/engine/game";
import type { Buff, BuffPick } from "@/engine/buff";
import type { Color, PieceType, Square } from "@/engine/types";
import { draftZones } from "@/lib/draftOnline";
import { computeFxVisual, fxVisualFields, type MotifMark } from "@/components/effects/fxZones";
import {
  SIGNATURES,
  prefetchSignatureVisuals,
  signatureVisualsReady,
  whenSignatureVisualsReady,
  type SignatureConfig,
} from "@/components/effects/BoardEffects";
import { CARD_TO_MODULE, PLUGIN_ID_SET, PLUGIN_SIGNATURES } from "@/components/effects/sigPlugins";
import { genSignatureConfig } from "@/components/effects/genSignature";
import type { SigPlaySlot } from "@/components/effects/useSignatureQueue";
import { setFxLevel, type FxLevel } from "@/lib/fxToggle";
import { SETTINGS_CHANGED_EVENT } from "@/lib/settings";
import { LAB_PRESETS, applyPreset, nerfModeOnly } from "../lab/labData";
import { preferSquare, sqDist, sqToName, type StageParams } from "./stageParams";

type BoardVisual = NonNullable<React.ComponentProps<typeof Board>["visual"]>;

const STAGE_SEED = 0x5a9e;

/** What the page tells a script (and a reviewer) about the play it staged. */
export interface StageInfo {
  id: string;
  name: string;
  tier: number;
  category: string;
  mechanic: Buff["kind"];
  retired: boolean;
  /** core = SIGNATURES entry, plugin = a play module, gen = generated fallback. */
  art: "core" | "plugin" | "gen";
  visual: string;
  anchor: string;
  source: string;
  hasLead: boolean;
  ordering: string;
  staggerMs: number;
  drive: "engine" | "stage";
  driveNote: string;
  castSq: string | null;
  targets: string[];
  picks: string[];
  side: Color;
  view: Color;
  anim: StageParams["anim"];
  fx: number;
  live: boolean;
  artReady: boolean;
}

interface StageApi {
  ready: boolean;
  info: StageInfo | null;
  error: string | null;
  playCount: number;
  /** Epoch ms (performance.timeOrigin based) of the commit that started the
   *  latest play, comparable with CDP screencast timestamps. */
  playedAt: number | null;
  play: () => Promise<number>;
  reset: () => void;
}

declare global {
  interface Window {
    __cardStage?: StageApi;
  }
}

// --- Signature config lookup (mirrors Board's resolver) ---------------------

type AnyConfig = SignatureConfig | ReturnType<typeof genSignatureConfig>;

function configOf(def: Buff): { cfg: AnyConfig; art: StageInfo["art"] } {
  const core = SIGNATURES[def.id];
  if (core) return { cfg: core, art: "core" };
  const plug = PLUGIN_SIGNATURES[def.id];
  if (plug) return { cfg: plug, art: "plugin" };
  return { cfg: genSignatureConfig(def.id, def.category, def.tier), art: "gen" };
}

function describe(cfg: AnyConfig, art: StageInfo["art"]) {
  const bespoke = art !== "gen" ? (cfg as SignatureConfig) : null;
  const visual =
    typeof cfg.visual === "string"
      ? cfg.visual
      : `gen:${(cfg.visual as { family?: string }).family ?? "?"}`;
  return {
    visual,
    anchor: bespoke ? (bespoke.anchor ?? "board") : "board",
    source: bespoke?.source ?? "removal",
    hasLead: cfg.hasLead,
    ordering: String(cfg.ordering),
    staggerMs: cfg.staggerMs,
  };
}

// --- Sandbox ------------------------------------------------------------------

function cloneGame(g: NerfGame): NerfGame {
  const next = deserializeGame(structuredClone(serializeGame(g)));
  if (!next) throw new Error("deserializeGame returned null");
  return next;
}

function baseGame(p: StageParams, def: Buff, pos: string = p.pos ?? "opening"): NerfGame {
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, STAGE_SEED);
  enableDraftMode(g, STAGE_SEED + 1, { mode: nerfModeOnly(def) ? "nerf" : "buff" });
  if (g.buffs) {
    g.buffs.players.w.offer = null;
    g.buffs.players.b.offer = null;
  }
  applyPreset(g.board, LAB_PRESETS.find((x) => x.id === pos) ?? LAB_PRESETS[0]);
  for (const e of p.place) g.board.pieces[e.sq] = e.piece ? { ...e.piece } : null;
  g.board.turn = p.side;
  return g;
}

/** Walk the card's target steps with the URL's preferred squares. */
function planPicks(g: NerfGame, color: Color, index: number, requested: Square[]): BuffPick[] | null {
  const picks: BuffPick[] = [];
  const used: Square[] = [];
  let prev: Square | null = null;
  for (let step = 0; step < 16; step++) {
    const t = buffNextTarget(g, color, index, picks);
    if (!t) return picks;
    if (t.kind === "square") {
      const pick = preferSquare(t.squares, requested, used, prev);
      if (pick == null) return t.finishable && picks.length > 0 ? picks : null;
      // A finishable step past the requested squares ends the walk: the URL
      // asked for this many targets, so a "pick up to 3" card uses as many
      // squares as were named (all of them when none were).
      if (t.finishable && requested.length > 0 && used.length >= requested.length) return picks;
      picks.push({ square: pick });
      used.push(pick);
      prev = pick;
    } else {
      if (t.options.length === 0) return picks.length > 0 ? picks : null;
      picks.push({ buffIndex: t.options[0].index });
    }
  }
  return picks;
}

const FRIENDLY_SOURCES = new Set(["shield", "kingSafe", "empower", "rally", "summon"]);

/** Default victims for the synthetic drive: pieces of the side the source
 *  touches, of the config's victim types when it names some, nearest the
 *  cast square (or the board centre). */
function defaultVictims(g: NerfGame, p: StageParams, cfg: AnyConfig, source: string): Square[] {
  const mine = FRIENDLY_SOURCES.has(source);
  const owner: Color = mine ? p.side : p.side === "w" ? "b" : "w";
  const types = cfg.victims === "all" ? null : new Set<PieceType>(cfg.victims);
  const anchor = p.sq ?? (p.side === "w" ? 36 : 28); // e5 / e4: the far side's centre
  const want = (sq: number, strictType: boolean) => {
    const pc = g.board.pieces[sq];
    if (!pc || pc.color !== owner) return false;
    if (source === "kingSafe" || source === "stun") return pc.type === "k";
    if (pc.type === "k") return false;
    return !strictType || !types || types.has(pc.type);
  };
  const pickFrom = (strict: boolean) =>
    Array.from({ length: 64 }, (_, i) => i)
      .filter((sq) => want(sq, strict))
      .sort((a, b) => sqDist(a, anchor) - sqDist(b, anchor) || a - b);
  let out = pickFrom(true);
  if (out.length === 0) out = pickFrom(false);
  const n = source === "kingSafe" || source === "stun" ? 1 : p.n;
  return out.slice(0, n);
}

interface Plan {
  drive: "engine" | "stage";
  /** event=grant: the play is the card being acquired (entrance beat). */
  grant: boolean;
  note: string;
  /** Engine drive: index of the granted instance (activated cards). */
  index: number;
  picks: BuffPick[];
  targets: Square[];
  castSq: Square | null;
  source: string;
  summonType: PieceType;
}

function makePlan(p: StageParams, def: Buff, cfg: AnyConfig, source: string): { game: NerfGame; plan: Plan } {
  const requested = [...(p.sq != null ? [p.sq] : []), ...p.targets];
  if (p.event === "grant" || (p.drive !== "stage" && def.kind === "instant")) {
    // The card is acquired during the play. An instant resolves on
    // acquisition (the grant IS its play, and live surfaces fire its
    // signature then); any other card shows its entrance beat, which is all a
    // draft pick of a passive ever shows.
    const note =
      def.kind === "instant"
        ? "instant: resolves when acquired"
        : "grant: the card enters the caster's hand (entrance beat, no play)";
    return {
      game: baseGame(p, def),
      plan: { drive: "engine", grant: true, note, index: -1, picks: [], targets: [], castSq: p.sq, source, summonType: "p" },
    };
  }
  const wantEngine = p.drive !== "stage" && def.kind === "activated";
  if (wantEngine) {
    // A card with a precondition ("two pawns on your 5th rank") has no use in
    // the opening. Unless the URL pinned a position, try the other presets
    // before settling for a synthetic diff: a real use anywhere beats a fake
    // one here.
    const order = p.pos ? [p.pos] : ["opening", ...LAB_PRESETS.map((x) => x.id).filter((id) => id !== "opening")];
    for (const pos of order) {
      const g = baseGame(p, def, pos);
      const index = g.buffs!.players[p.side].buffs.length;
      acquireBuff(g, p.side, def.id, def.tier);
      if (g.buffs!.players[p.side].buffs.length <= index) continue;
      // Plan on a throwaway clone: targets() may read (and some cards write)
      // state, and the live sandbox must stay exactly as the first frame.
      const picks = planPicks(cloneGame(g), p.side, index, requested);
      if (!picks) continue;
      const squares = picks.flatMap((k) => (k.square != null ? [k.square] : []));
      const where = pos === "opening" ? "" : ` (position: ${pos})`;
      return {
        game: g,
        plan: {
          drive: "engine",
          grant: false,
          note: (picks.length ? `activated with ${picks.length} pick(s)` : "activated, no targets") + where,
          index,
          picks,
          targets: squares,
          castSq: p.sq ?? squares[0] ?? null,
          source,
          summonType: "p",
        },
      };
    }
    if (p.drive === "engine") throw new Error("engine drive: the card has no valid use in this position");
  }
  // Synthetic drive. A removal-sourced config removes victims only when the
  // card plausibly removes pieces (an attack card) or the URL named the
  // victims; anything else plays diff-less (cast spectacle and lead only),
  // which is what Board shows for such a card when no zone or piece changes,
  // rather than inventing a capture the rule never makes.
  const g = baseGame(p, def);
  const diffless = source === "removal" && def.category !== "attack" && p.targets.length === 0;
  let targets = p.targets.length ? [...p.targets] : diffless ? [] : defaultVictims(g, p, cfg, source);
  const mine = FRIENDLY_SOURCES.has(source);
  const summonType: PieceType =
    cfg.victims !== "all" && cfg.victims.length && cfg.victims[0] !== "k" ? cfg.victims[0] : "p";
  if (source === "summon") {
    // Summons land on empty squares: clear the targets first, or pick empty
    // squares next to the cast square when none were named.
    if (!p.targets.length) {
      const anchor = p.sq ?? (p.side === "w" ? 27 : 35);
      targets = Array.from({ length: 64 }, (_, i) => i)
        .filter((sq) => !g.board.pieces[sq])
        .sort((a, b) => sqDist(a, anchor) - sqDist(b, anchor) || a - b)
        .slice(0, p.n);
    }
    for (const sq of targets) g.board.pieces[sq] = null;
  } else {
    // Every victim needs a piece for the diff to act on.
    const owner: Color = mine ? p.side : p.side === "w" ? "b" : "w";
    for (const sq of targets) {
      if (!g.board.pieces[sq]) g.board.pieces[sq] = { type: source === "kingSafe" || source === "stun" ? "k" : "n", color: owner };
    }
  }
  const why =
    p.drive === "stage"
      ? "stage drive requested"
      : def.kind === "passive"
        ? "passive: no use event, synthetic diff"
        : "no valid use in this position, synthetic diff";
  const what = diffless ? "diff-less: no zone source, not an attack" : `${source} diff`;
  return {
    game: g,
    plan: {
      drive: "stage",
      grant: false,
      note: `${why}, ${what}`,
      index: -1,
      picks: [],
      targets,
      castSq: p.sq ?? targets[0] ?? null,
      source,
      summonType,
    },
  };
}

/** The zone and piece props Board reads, derived the way OnlineMatch does. */
function visualOf(g: NerfGame, viewer: Color): BoardVisual {
  const zone = draftZones(g, viewer);
  return {
    bannedSquares: zone.barred,
    frozenSquares: zone.frozen,
    frozenSkins: zone.frozenSkin,
    effectTurns: zone.turns,
    shieldedSquares: zone.shielded,
    wardSquares: zone.ward,
    strikeSquares: zone.strike,
    walnutSquares: zone.walnut,
    bananaSquares: zone.banana,
    trapSquares: zone.traps,
    doomSquares: zone.doom,
    lockedSquares: zone.locked,
    barredSquares: zone.barred,
    ...fxVisualFields(computeFxVisual(g)),
  };
}

/** Synthetic drive: add the victims to the zone the card's source names. */
function syntheticVisual(base: BoardVisual, plan: Plan, def: Buff): BoardVisual {
  const t = plan.targets;
  const v: BoardVisual = { ...base };
  const add = (xs: number[] | undefined) => [...(xs ?? []), ...t.filter((s) => !(xs ?? []).includes(s))];
  switch (plan.source) {
    case "frozen":
      v.frozenSquares = add(v.frozenSquares);
      break;
    case "walnut":
      v.walnutSquares = add(v.walnutSquares);
      break;
    case "shield":
      v.shieldedSquares = add(v.shieldedSquares);
      break;
    case "kingSafe":
      v.kingSafeSquares = add(v.kingSafeSquares);
      break;
    case "stun":
      v.stunSquares = [...(v.stunSquares ?? []), ...t.map((sq) => ({ sq, n: 1 }))];
      break;
    case "empower":
    case "rally":
    case "slow":
    case "blindfold": {
      const marks: MotifMark[] = t.map((sq) => ({
        sq,
        motif: plan.source as MotifMark["motif"],
        id: def.id,
        name: def.name,
        description: def.description,
        tier: def.tier,
        category: def.category,
        turns: null,
      }));
      v.motifSquares = [...(v.motifSquares ?? []).filter((m) => !t.includes(m.sq)), ...marks];
      break;
    }
  }
  return v;
}

/** Apply the play to `game` (mutated) and return the zones Board should see. */
function runPlay(game: NerfGame, base: BoardVisual, plan: Plan, def: Buff, p: StageParams): BoardVisual {
  if (plan.grant) {
    acquireBuff(game, p.side, def.id, def.tier);
    return visualOf(game, p.view);
  }
  if (plan.drive === "engine") {
    if (!activateBuff(game, p.side, plan.index, plan.picks)) throw new Error("activateBuff returned false");
    return visualOf(game, p.view);
  }
  for (const sq of plan.targets) {
    if (plan.source === "summon") game.board.pieces[sq] = { type: plan.summonType, color: p.side };
    else if (plan.source === "removal") game.board.pieces[sq] = null;
  }
  return syntheticVisual(base, plan, def);
}

// --- Document state (anim, fx) -------------------------------------------------

function applyDocMotion(p: StageParams) {
  const html = document.documentElement;
  html.dataset.anim = p.anim;
  html.style.setProperty("--fx-dur", String(p.fx));
  // applyUiPrefs zeroes the piece glide when motion is off; mirror it.
  if (p.anim === "off") html.style.setProperty("--piece-anim-ms", "0");
}

// --- Component -------------------------------------------------------------------

interface Snapshot {
  game: NerfGame;
  visual: BoardVisual;
}

export function CardStage({ params }: { params: StageParams }) {
  const p = params;
  const def = BUFF_BY_ID[p.id] as Buff | undefined;
  const [artReady, setArtReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [plan, setPlan] = React.useState<Plan | null>(null);
  const [info, setInfo] = React.useState<StageInfo | null>(null);
  const [snap, setSnap] = React.useState<Snapshot | null>(null);
  const [sig, setSig] = React.useState<SigPlaySlot | null>(null);
  const [epoch, setEpoch] = React.useState(0);
  const [grantTick, setGrantTick] = React.useState(0);
  const initialRef = React.useRef<Snapshot | null>(null);
  const keyRef = React.useRef(0);
  const playCountRef = React.useRef(0);
  const playedAtRef = React.useRef<number | null>(null);
  const pendingPlayRef = React.useRef<{ resolve: (t: number) => void; reject: (e: Error) => void } | null>(null);
  const armedRef = React.useRef(false);

  // Motion settings: applied after SettingsBootstrap and re-applied whenever it
  // re-stamps the document, so the URL always wins on this page.
  React.useEffect(() => {
    applyDocMotion(p);
    if (p.level != null) setFxLevel(p.level as FxLevel);
    const again = () => applyDocMotion(p);
    window.addEventListener(SETTINGS_CHANGED_EVENT, again);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, again);
  }, [p]);

  // Warm exactly this card's art: the signature-visuals chunk and its module.
  React.useEffect(() => {
    let live = true;
    prefetchSignatureVisuals([p.id]);
    // loadPluginModule, not loadPluginModulesForCards: the prefetch above has
    // already started this module, and ForCards resolves at once for a module
    // that is merely in flight, which used to let the plan read the generated
    // fallback config before the card's own config had published.
    const modName = CARD_TO_MODULE[p.id];
    const mod = modName
      ? import("@/components/effects/sigPluginsMerged").then((m) => m.loadPluginModule(modName))
      : Promise.resolve();
    void Promise.all([whenSignatureVisualsReady(30_000), mod]).then(() => {
      if (live) setArtReady(true);
    });
    return () => {
      live = false;
    };
  }, [p.id]);

  // Build the sandbox and the plan once the art is resolvable (the plugin
  // config, and so the card's source and anchor, lives in its module).
  React.useEffect(() => {
    if (!artReady) return;
    queueMicrotask(() => {
      try {
        if (!def) throw new Error(`unknown card id "${p.id}"`);
        if (!def.implemented) throw new Error(`"${p.id}" is not implemented`);
        // Never stage a plugin card on the generated fallback: that would be
        // a strip of the wrong art presented as the card's.
        if (PLUGIN_ID_SET.has(def.id) && !SIGNATURES[def.id] && !PLUGIN_SIGNATURES[def.id]) {
          throw new Error(`the play module for "${def.id}" did not load (${CARD_TO_MODULE[def.id] ?? "no module"})`);
        }
        const { cfg, art } = configOf(def);
        const d = describe(cfg, art);
        const built = makePlan(p, def, cfg, d.source);
        const first: Snapshot = { game: built.game, visual: visualOf(built.game, p.view) };
        initialRef.current = first;
        setPlan(built.plan);
        setSnap(first);
        setInfo({
          id: def.id,
          name: def.name,
          tier: def.tier,
          category: def.category,
          mechanic: def.kind,
          retired: isRetired(def.id),
          art,
          ...d,
          drive: built.plan.drive,
          driveNote: built.plan.note,
          castSq: built.plan.castSq != null ? sqToName(built.plan.castSq) : null,
          targets: built.plan.targets.map(sqToName),
          picks: built.plan.picks.map((k) => (k.square != null ? sqToName(k.square) : `card#${k.buffIndex}`)),
          side: p.side,
          view: p.view,
          anim: p.anim,
          fx: p.fx,
          live: p.live,
          artReady: signatureVisualsReady() && (!PLUGIN_ID_SET.has(def.id) || !!PLUGIN_SIGNATURES[def.id]),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }, [artReady, def, p]);

  // Fire the play against the current (fresh) snapshot.
  const fire = React.useCallback(() => {
    const cur = initialRef.current;
    if (!cur || !plan || !def) return;
    try {
      // inplace mirrors the local bot game: the engine mutates the live
      // object and the surface re-renders a shallow copy, so Board receives
      // the same board and piece array it already holds.
      const next = p.inplace ? cur.game : cloneGame(cur.game);
      const visual = runPlay(next, cur.visual, plan, def, p);
      keyRef.current += 1;
      setSnap({ game: p.inplace ? ({ ...next } as NerfGame) : next, visual });
      // A grant of a non-instant is only an arrival: no play fires, exactly
      // as on a live board. A tick still advances so play() resolves.
      if (plan.grant && def.kind !== "instant") {
        setGrantTick(keyRef.current);
      } else {
        setSig({
          id: def.id,
          key: keyRef.current,
          caster: p.live ? undefined : p.side,
          sq: p.live ? undefined : (plan.castSq ?? undefined),
        });
      }
    } catch (e) {
      const msg = `play failed: ${e instanceof Error ? e.message : String(e)}`;
      setError(msg);
      // A script awaiting play() must hear about it rather than hang.
      pendingPlayRef.current?.reject(new Error(msg));
      pendingPlayRef.current = null;
    }
  }, [plan, def, p]);

  // A replay remounts Board on the initial snapshot (fresh refs, no leftover
  // overlays), then fires on the next frame.
  React.useEffect(() => {
    if (epoch === 0 || !armedRef.current) return;
    armedRef.current = false;
    const id = window.requestAnimationFrame(() => fire());
    return () => window.cancelAnimationFrame(id);
  }, [epoch, fire]);

  // Stamp the moment the play committed; resolve the script's play() promise.
  React.useLayoutEffect(() => {
    if (!sig && grantTick === 0) return;
    const t = performance.timeOrigin + performance.now();
    playedAtRef.current = t;
    playCountRef.current += 1;
    pendingPlayRef.current?.resolve(t);
    pendingPlayRef.current = null;
  }, [sig, grantTick]);

  const ready = !!(plan && snap && info && !error);

  const play = React.useCallback((): Promise<number> => {
    if (p.inplace && playCountRef.current > 0) {
      return Promise.reject(new Error("inplace stages are single-shot: reload to replay"));
    }
    return new Promise((resolve, reject) => {
      pendingPlayRef.current = { resolve, reject };
      if (playCountRef.current === 0 && keyRef.current === 0) {
        fire();
        return;
      }
      armedRef.current = true;
      setSig(null);
      setGrantTick(0);
      setSnap(initialRef.current);
      setEpoch((e) => e + 1);
    });
  }, [fire, p.inplace]);

  const reset = React.useCallback(() => {
    setSig(null);
    setGrantTick(0);
    setSnap(initialRef.current);
    setEpoch((e) => e + 1);
  }, []);

  // The scripting surface.
  React.useEffect(() => {
    window.__cardStage = {
      ready,
      info,
      error,
      playCount: playCountRef.current,
      playedAt: playedAtRef.current,
      play,
      reset,
    };
  });
  React.useEffect(() => () => {
    delete window.__cardStage;
  }, []);

  // Autoplay once ready.
  React.useEffect(() => {
    if (!ready || !p.autoplay) return;
    const t = window.setTimeout(() => void play(), p.delay);
    return () => window.clearTimeout(t);
    // Only the transition to ready should autoplay, never a later replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const board = snap?.game.board;
  return (
    <div className={p.bare ? "p-3" : "mx-auto max-w-5xl px-4 py-6"}>
      {!p.bare && (
        <div className="mb-3">
          <h1 className="font-display text-xl font-bold text-parchment-100">
            {def ? def.name : p.id}{" "}
            <span className="text-sm font-normal text-parchment-400">
              {p.id}
              {def ? ` · T${def.tier} · ${def.category} · ${def.kind}` : ""}
            </span>
          </h1>
          {def && <p className="mt-1 max-w-3xl text-sm text-parchment-300">{def.description}</p>}
        </div>
      )}
      <div className="flex flex-wrap items-start gap-4">
        <div
          data-card-stage={ready ? "ready" : error ? "error" : "loading"}
          style={{ width: p.size, maxWidth: "100%" }}
        >
          {board && snap ? (
            <Board
              key={`stage-${epoch}`}
              board={board}
              fxBoard={board}
              legalMoves={[]}
              orientation={p.view}
              onMove={() => {}}
              myColor={p.view}
              visual={snap.visual}
              lastMove={null}
              buffs={snap.game.buffs}
              passiveBuffs={snap.game.buffs}
              signatureCard={sig}
              showCoordinates
            />
          ) : (
            <div
              className="grid aspect-square place-items-center border border-white/15 text-sm text-parchment-400"
              style={{ width: p.size, maxWidth: "100%" }}
            >
              {error ?? "Loading the card's art..."}
            </div>
          )}
        </div>
        {!p.bare && (
          <div className="min-w-[240px] flex-1 text-[13px] text-parchment-300">
            <div className="mb-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!ready}
                onClick={() => void play()}
                className="rounded-[3px] border border-gold/60 bg-gold/15 px-3 py-1 text-parchment-100 disabled:opacity-50"
              >
                Play
              </button>
              <button
                type="button"
                disabled={!ready}
                onClick={reset}
                className="rounded-[3px] border border-white/15 px-3 py-1 text-parchment-200 disabled:opacity-50"
              >
                Reset
              </button>
            </div>
            {error && <p className="mb-2 text-[#e0a39a]">{error}</p>}
            {info && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                {(
                  [
                    ["drive", `${info.drive} (${info.driveNote})`],
                    ["art", `${info.art} · ${info.visual}`],
                    ["anchor", info.anchor],
                    ["source", info.source],
                    ["cast sq", info.castSq ?? "none (board centre)"],
                    ["targets", info.targets.join(" ") || "none"],
                    ["side / view", `${info.side} / ${info.view}`],
                    ["anim / fx", `${info.anim} / ${info.fx}`],
                    ["live", info.live ? "yes (no sq, no caster)" : "no"],
                    ["inplace", p.inplace ? "yes (local bot game update path)" : "no (cloned, as online)"],
                    ["retired", info.retired ? "YES" : "no"],
                  ] as const
                ).map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt className="text-parchment-400">{k}</dt>
                    <dd className="text-parchment-100">{v}</dd>
                  </React.Fragment>
                ))}
              </dl>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
