# Passive Effect Pipeline Audit

Scope: why "hundreds of passive cards (mostly Nerfs) marked Passive" show a reveal banner but no consistent per-card visual spawn sequence, even though effect and animation code "exists somewhere." This audit maps the pipeline from card metadata to pixels, ranks verified root causes, records refuted hypotheses so they are not rechased, inventories each dimension, and recommends a fix order.

Audit date: 2026-07-15. All findings below were re-verified against source with file:line evidence.

---

## 1. Pipeline map: from card metadata to pixels

There are two card families and three distinct UI signal channels. Only one channel is per-card choreographed, and it is buff-only.

### 1.1 Two disjoint card families

- Buffs: `interface Buff` (src/engine/buff.ts:493), `kind: passive | instant | activated` (buff.ts:534), optional board motif `fx?: CardFx` (buff.ts:505; CardFx at buff.ts:465). Registered in `BUFF_BY_ID` (src/engine/buffs/library.ts:4590), 867 entries. 410/867 carry an `fx` motif.
- Nerfs: `interface Nerf` (src/engine/nerf.ts:19-72). NO `fx`, `signature`, `effectKey`, `animation`, or `splash` field. Only behavior hooks plus a thin `visual?()` returning fog/water/duck/banned/highlight squares (nerf.ts:44-50). Registered in `IMPLEMENTED_BY_ID` / `ALL_NERFS` (src/engine/nerfs/library.ts:180, 190, 239; implemented.ts:1051), 342 runtime entries, all `NERF_TURN_COST = "passive"` (buff.ts:583). Nerfs are never in `BUFF_BY_ID`.

The two registries are never cross-resolved. 9 ids collide by name (pawn_storm, heavy_boots, no_mans_land, anchored_rooks, scorched_earth, vertigo, king_of_the_hill, cavalry_charge, slowpoke) but each signature entry for those ids is authored for the buff namesake and only fires for the buff.

### 1.2 Three UI signal channels

1. signatureCard {id, key} drives the bespoke cast spectacle / signature VFX in Board.tsx (prop at Board.tsx:557; consumed at the cast effect Board.tsx:2254-2335 and zone path 3051-3105). Set ONLY by `fireSignature`, which hard-gates `if (!BUFF_BY_ID[id]) return;` (game/page.tsx:540; OnlineMatch.tsx:390; game/[id]/page.tsx:539). Buff-only. Never fires for a passive acquisition.
2. nerfReveals -> NerfRevealSplash (Board.tsx:333-389, 2232-2253) is the "YOUR RULE TAKES THE BOARD" text stamp plus a generic tier aura pulse. Built from nerfs only (game/page.tsx:1496-1520; OnlineMatch.tsx:2069-2092). One-shot per color+id, suppressed entirely when motion is off, and NOT wired on the spectator board.
3. againstMe rows -> BoardSplash / useBoardSplash (BoardSplash.tsx) is a text banner when a constraint ActiveEffect lands on you. Only fires for passives that add an ActiveEffect; pure rule/move-filter passives add none.

### 1.3 Two rendering pipelines

- A) Persistent while-held layer: `computeFxVisual(game)` (src/components/effects/fxZones.ts:113-201) reads buff instances with `def.fx` and emits kingSafeSquares, pawnClampSquares, stunSquares, and motifs. Threaded via the Board `visual` prop and rendered as MotifBadge, EmpowerShine, NerfAura, quiet-passive king aura, ShieldMark, PawnFence, StunSwirl inside the 8x8 loop (Board.tsx:1593-1721). Buff-driven only; nerfs contribute nothing here.
- B) One-shot cast/signature layer: driven by signatureCard, resolved by `resolveSignature` (Board.tsx:78-96) as `SIGNATURES ?? PLUGIN_SIGNATURES ?? generated`, rendered by CastSpectacle / SignatureOverlay / GenBurst. Buff-only.

### 1.4 The engine signal for held-card activity

`bs.lastHookMutations` (buff.ts:319-361; populated game.ts:1457-1490) is the only transient that reaches clients for a held buff. It is populated ONLY when a held buff's `onMovePlayed` observably mutated effects, mutations, clockFx, or the board signature (game.ts:1480-1487). Rule-only and move-filter passives never enter it.

Net: a passive's activation moment (acquireBuff / pickDraftCard / game-start nerf assignment) emits NO signatureCard. Its only later chances are, for nerfs, the one-shot NerfRevealSplash, and for buffs, a board-mutating `onMovePlayed` feeding lastHookMutations. Passives with no board mutation and no ActiveEffect emit no per-card visual signal on any surface, ever.

### 1.5 The design that would have unified this does not exist

docs/passive-effect-language.md:3 claims `src/components/effects/passiveRegistry.ts` implements the spec and a coverage test enforces it. Both are absent. The doc was committed alone (1485f6c, Jul 15 06:49). Tasks #6 (registry + coverage tests) and #7 (lifecycle + preview harness) are still pending.

---

## 2. Verified root causes, ranked by impact

Ranked by how many cards go visually silent or inconsistent and how visible the gap is to players.

### R1. Nerfs are structurally incapable of a per-card spawn visual (342 cards)

The `Nerf` type has no `fx` / signature / animation field (nerf.ts:19-72), and the signature pipeline is hard-gated on `BUFF_BY_ID` at every stage: fire path `if (!BUFF_BY_ID[id]) return;` (game/page.tsx:540; OnlineMatch.tsx:390; game/[id]/page.tsx:539), cast consumer `const def = BUFF_BY_ID[signatureCard.id]; if (!def) return;` (Board.tsx:2257), zone path re-reads BUFF_BY_ID (Board.tsx:3104-3105), and the resolver fallback hard-returns (Board.tsx:88-89). No code path can route a nerf id into the sigVisuals / cast system. A nerf's entire spawn visual is the generic NerfRevealSplash text stamp plus a tier aura (Board.tsx:333-389), plus for 20 nerfs a static `visual()` board overlay. This is the expected result of the data model, not a wiring bug.

Evidence: nerf.ts:19-72; buff.ts:465, 505 (fx is buff-only); game/page.tsx:540; Board.tsx:2257, 88-89, 333-389.

Impact: all 342 implemented passive nerfs. This is the headline cause of "no per-card visual for the hundreds of Passive cards."

### R2. The banner the owner sees is the older generic NerfRevealSplash, not a per-card effect

"Prima Donna, YOUR RULE TAKES THE BOARD" is the nerf name stamped big (Board.tsx:373-375) plus the subtitle `mine ? "your rule takes the board" : "opponent's rule revealed"` (Board.tsx:382-384). The only per-square art in the splash is `<NerfAura tier={tier} />` (Board.tsx:365) called WITHOUT a cardId, so NerfAura falls back to the generic tier tint (EmpowerAura.tsx:199-203). There is no bespoke-motif branch. So the banner renders reliably while per-card art is absent, which is exactly the reported symptom.

Evidence: Board.tsx:333-389, 365, 373-384; Board.tsx:2244 (suppressed when `motionOff()`); OnlineMatch.tsx:2069-2076.

Impact: explains the owner's exact observation. The 298 bespoke per-nerf "Reveal:" concepts in docs/animation-backlog.md are unimplemented design specs.

### R3. The unified "Passive Effect Language" shipped as documentation only

docs/passive-effect-language.md:1-3 asserts a registry (`src/components/effects/passiveRegistry.ts`) implements the spec, a coverage test enforces it, and "silent no-animation fallback is banned." The file does not exist; `grep -rl passiveRegistry src/` returns only the doc; no test references it; `git show --stat 1485f6c` is the doc alone. Nothing in the runtime reads the spec, and no build gate enforces passive coverage, so gaps are silent, directly contradicting the spec's own claim.

Evidence: docs/passive-effect-language.md:1-3; absence of passiveRegistry.ts anywhere in src/; task list #6/#7 pending.

Impact: the entire spawn/settle/aura/pulse/exit lifecycle the owner expects is designed only, 0% implemented.

### R4. Passive buffs with no board mutation and no ActiveEffect never fire any signature (a large share of 92 passive buffs)

`lastHookMutations` is populated only when a held buff's `onMovePlayed` observably mutates the board (game.ts:1463 `if (!def.onMovePlayed) continue;`, then delta check 1480-1487). Client reporters key entirely off it (game/page.tsx:949-955; OnlineMatch.tsx:404-405; game/[id]/page.tsx:544-548). Draft-pick resolution fires a signature ONLY for `kind === "instant"` (game/page.tsx:2238-2239; OnlineMatch.tsx:1128-1136), and activated cards fire at activation. A passive buff that is neither instant nor activated, and whose effect is a legal-move restriction or a static rule (only ~40 buff files reference `onMovePlayed`; 92 literal `kind:"passive"` defs), can never fire a signatureCard at any point.

Evidence: game.ts:1457-1490; game/page.tsx:949-955, 2238-2239; OnlineMatch.tsx:404-420, 1128-1136.

Impact: the subset of the 92 passive buffs that are pure rule/move-filter passives get only System B's generic aura, never a bespoke spawn.

### R5. The spectator / TV board renders NONE of the persistent passive fx layer

`computeFxVisual` is never imported or called in src/app/game/[id]/page.tsx (present in game/page.tsx:51, 1477 and OnlineMatch.tsx:69, 2058). The spectator Board `visual` object is built only from `zones` (draftZones output, [id]/page.tsx:806-822) and never adds kingSafeSquares, pawnClampSquares, stunSquares, or motifSquares. Board defaults each absent set to empty (Board.tsx:2827, 2830, 2837, 2843), so MotifBadge, EmpowerShine, NerfAura, the quiet-passive king aura, PawnFence, StunSwirl, and the kingSafe ShieldMark branch never mount for spectators. Zone-based marks (shieldedSquares, wardSquares) still render.

Evidence: [id]/page.tsx:806-822, 1392-1400; grep shows no computeFxVisual there; Board.tsx:2827-2845.

Impact: every spectator and the TV/replay view loses the entire per-card passive layer.

### R6. Spectators are never fed nerfReveals, so they get no rule-reveal banner at all

src/app/game/[id]/page.tsx passes only `visual` and `signatureCard` to Board (GameShell render [id]/page.tsx:1392-1400); grep for nerfReveals in that file returns nothing. Both player surfaces build and pass it (game/page.tsx:1496-1520 + 2024/2031; OnlineMatch.tsx:2069-2092 + 2642).

Evidence: [id]/page.tsx:1392-1400; Board.tsx:583, 2232, 383, 4137-4145.

Impact: on the spectator/TV surface a passive nerf becoming known produces no reveal banner. Spectators still get signatureCard-driven played-card flourishes, so this is specific to passive-nerf reveals.

### R7. Quiet-passive king aura is destroyed under reduced motion instead of falling back to a static pose

The motif-less/piece-less passives' only board visual is gated at Board.tsx:1623 with an extra `!motionOff()` JS predicate that fully UNMOUNTS it under animations-off. Sibling auras EmpowerShine (1598), NerfAura (1609), MotifBadge (1643) lack that gate and degrade to a static end-state via CSS (for EmpowerShine/NerfAura, src/app/globals.css:1447-1460 static halo plus 1984-1991 `animation: none !important`). `motionOff()` is an in-app opt-in (`data-anim="off"`, settings.ts:495-498), default off, and does not consult OS prefers-reduced-motion.

Evidence: Board.tsx:1623, 1598, 1609, 1643, 2908-2933; globals.css:1447-1460, 1984-1991; settings.ts:495-498.

Impact: only users who turned animations off are affected, but for them every motif-less, piece-scope-less passive (roughly a third of passives) loses its sole board presence, while the same aura on the motif path stays visible as a static halo. Same game, motion on vs off, inconsistent.

### R8. The Jul 15 quiet-passive aura is a same-day stopgap that collapses many passives into one glow per side

Commit 47cabf7 (Jul 15 00:38) added quietPassiveAuras (Board.tsx:2919-2944): it skips any inst with `def.fx?.motif || def.fx?.pieces`, requires `kind === "passive"`, and drops at most ONE aura per color on that color's king (`grant ?? hex`, single `m.set` per side). Nerfs are never touched. EmpowerShine/NerfAura do tint per cardId (EmpowerAura.tsx:180-182, 200-202), so the single aura carries some identity, but every quiet passive beyond the first representative per side paints nothing.

Evidence: 47cabf7; Board.tsx:2919-2944, 1623-1642; EmpowerAura.tsx:180-182, 200-202.

Impact: most held quiet passives contribute no distinguishable per-card visual. This is a band-aid written the same day the full spec (R3) was drafted to replace it.

### R9. Simultaneous passive hook-fires are coalesced to a single visible signature on every surface

OnlineMatch.tsx:407-420 uses a `firedSignature` flag so only the first fired card casts. Spectator uses `fired[0]` only (fireHookSignatures, [id]/page.tsx:544-548). Local game/page.tsx:951-955 loops all fired cards, but fireSignature writes one `signatureCard` state slot (page.tsx:519, 546), so React batches to the last id and the key-gated Board effects (2255, 3051) see only that final value.

Evidence: OnlineMatch.tsx:407-420; [id]/page.tsx:544-548; game/page.tsx:519, 546, 951-955; Board.tsx:2255, 3051.

Impact: any move that triggers multiple held passives (mass-effect combos) shows at most one card's animation; the rest activate invisibly.

### R10. Spectator draft-resolved path fires no signature for instant PICKS, and fires only the first hook card

The player path casts instant picks (OnlineMatch.tsx:1128-1136), but the spectator draft handler ([id]/page.tsx:602-631) calls fireSignature only for `draft-used` (line 628) and otherwise relies on fireHookSignatures, which reads lastHookMutations. An instant pick goes through acquireBuff (draftOnline.ts:64), which never sets lastHookMutations, so no signature fires. fireHookSignatures also reads only `fired[0]`.

Evidence: [id]/page.tsx:602-631, 544-548; OnlineMatch.tsx:1128-1136; draftOnline.ts:64; game.ts:1490.

Impact: spectators miss instant-pick spectacles entirely, and multi-hook moves show only fired[0].

---

## 3. Refuted hypotheses (do not rechase)

Each of the following was investigated and refuted with evidence. Recorded so future work does not chase them again.

### X1. "Buff signature coverage is 100% bespoke and the generated fallback is dead code" — REFUTED

Static coverage numbers are right (319 core SIGNATURES + 548 PLUGIN_IDS = 867, no orphans), and in steady state all 548 plugin buffs resolve to bespoke art. But `resolveSignature` resolves against the RUNTIME map `PLUGIN_SIGNATURES` (sigPlugins.tsx:46), which starts EMPTY and is filled only when the lazily-imported sigVisuals chunk evaluates. Prefetch is best-effort (`void import(...).catch(()=>{})`, BoardEffects.tsx:2385-2391; Board.tsx:2042) with no readiness gate. Until the chunk lands, and permanently if it fails, all 548 plugin buffs fall through to `genSignatureConfig` and render GenBurst (Board.tsx:88-95, 4164-4181). So the generated fallback is the live race-window path, not dead code. Note also Board.tsx:4101 marks a card "bespoke" via PLUGIN_ID_SET while resolveSignature still returns a generated config, a divergence that produces generic visuals during the load window.

### X2. "The 9 nerf/buff id collisions cause a nerf to render buff art" — REFUTED

The overlaps are real but the two registries (ALL_NERFS vs BUFF_BY_ID) are never cross-resolved. Every fireSignature caller passes draft-card instance ids, never nerf ids; the nerf banner path (Board.tsx:2231-2253) reads nerf data directly and never touches BUFF_BY_ID. No nerf id ever resolves to a buff via the signature system. The claim itself concedes "low direct impact today," so it does not explain the symptom. It remains a latent trap only if future nerf-visual wiring reuses these ids.

### X3. "acquireBuff emits zero observable signal, so the client has nothing to hang a visual on" — REFUTED

acquireBuff's push to `ps.buffs` (game.ts:1677) IS observable, and the client observes it (game/page.tsx:2226-2230 diffs `buffs.slice(before)` into `gained`). The reason passives get no visual at pick is a deliberate client-side filter: both pick handlers fire a signature only for `kind === "instant"` (game/page.tsx:2238-2239; OnlineMatch.tsx:1128-1136), deferring other kinds to activation or hook time. The defect is the firing policy (captured as R4), not a silent engine event.

### X4. "Draft-pick fires signature only for instants, therefore passives are visually inert forever" — PARTLY REFUTED

The instant-only pick gate is correct by design: instants resolve at pick, passives resolve later. Passives DO fire choreography at the ply their hook observably mutates the board (game.ts:1457-1490 -> game/page.tsx:955), and activated cards fire at activation (page.tsx:1125, 1358-1360). The genuine residual gap is narrower and is captured in R4: board-inert, non-activated passives. Do not restate this as "all passives are inert."

### X5. "reportedHooksRef / nerfRevealSeenRef once-ever keys suppress re-announcement of a re-activating passive's visual" — REFUTED

Both refs gate ANNOUNCEMENTS, not visuals. reportedHooksRef (`${color}:${index}`, game/page.tsx:957-960) dedups only the bot's textual play-feed line; the visual `fireSignature` runs unconditionally one line earlier (955) with an ever-incrementing key, so re-activations re-trigger the Board cast/vfx/zone effects. nerfRevealSeenRef (`${r.color}:${r.id}`, Board.tsx:2236) is the by-design once-per-rule reveal banner (the banner that already works). Neither sits on the per-card visual path.

### X6. "Passive spawn only fires from lastHookMutations, so the trigger is fundamentally removal/mutation shaped" — REFUTED as stated

signatureCard.key is bumped from multiple sites, not only lastHookMutations: instant picks (game/page.tsx:632, 2239; OnlineMatch.tsx:1133), activations (1125, 1360; OnlineMatch.tsx:1162), a direct held-play replay (page.tsx:554; OnlineMatch.tsx:537), and hook mutations (955). More importantly, nerfs do not use this machinery at all; they animate via `visual()`/highlightSquares (nerf.ts:44-50, Board.tsx:2948) and the nerfReveals banner. The only defensible narrow point is R4 (a passive buff, being neither instant nor activated and firing only when its onMovePlayed produces an observable change).

### X7. "motifShown suppression cascade silently hides a card's badge when another effect overlaps" — REFUTED

Board.tsx:3681-3690 motifShownFor is an intentional same-concept dedupe: each suppressed motif is replaced by a coarser related visual on the same piece (freeze/walnut art, ChainJail 1584, PawnFence 1593, shield ring 1687) and the effect is named in the hover popover. It only affects squares carrying BOTH a CardFx motif AND a walnut/freeze/jail/clamp/shield, so it is narrow and not the root cause. Passives without a CardFx motif never enter motifBySquare (Board.tsx:2841).

### X8. "fxRunning liveness makes conditional passives flicker in and out of the motif layer" — REFUTED

The only passive whose `status` can return null, Time Prison (library.ts:3819), sets `state.active = true` at init and never clears it; it ends by going spent (excluded at fxZones.ts:161), never dormant-null, so the null branch is unreachable while live. Genuinely conditional passives (Fan Club, Union Rules, Guardian Angel) deliberately return non-null status in every branch. No card exhibits the described flicker. (Separately, Endless Turn's motif never renders at all because it is an activated card with no sq/turns/charges, a different, always-absent defect.)

### X9. "The Jul 8 fix (4ae51ca) proves the visual layer keys off board mutations, wrong trigger for passives" — REFUTED as stated

The commit is a genuine prior "built but never fired" instance, patched narrowly. But post-fix the trigger is a surfaced play event (signatureCard.key advancing), and the zone path reads STATIC zone membership, not a diff; a category cast banner plus a UNIVERSAL FLOOR burst (Board.tsx:2287, 2305-2320) cover quiet passives when signatureCard fires. And this whole system is buffs-only; the nerf symptom lives in the separate nerfReveals path. The real residual is the event-trigger gap for board-inert passive buffs (R4), not a diff-shaped trigger.

### X10. "Play path has a build-time coverage gate, passive path has none, so passive gaps ship silently" — REFUTED as stated

check-sig-plugins.cjs is real and in test:rules, but it only verifies the static PLUGIN_IDS array mirrors the plugin PLAYS keys; it does no coverage check over ALL_BUFFS. The play-path per-card guarantee is a RUNTIME fallback (resolveSignature, Board.tsx:78-96), not CI. runGenSelfCheck is dev-only, try/catch-swallowed, and only warns on collisions (Board.tsx:101-105; genSignature.tsx:1676). Passives do render (quiet king aura; own motif). The operative driver of "inconsistent" passive visuals is the deliberate one-aura-per-king collapse (R8), a rendering choice, not a missing CI gate.

---

## 4. Per-dimension inventory notes

### Metadata

- Nerfs: `Nerf` type (nerf.ts:19-72) has no visual-effect metadata beyond the thin `visual?()` overlay hook (20 nerfs implement it) and `icon` (217/342). `NERF_TURN_COST = "passive"` always (buff.ts:583). ALL_NERFS == ALL_IMPLEMENTED (342); the ~131-entry STUBS catalog contributes zero net cards because every stub id is shadowed by an implemented nerf (library.ts:180-188). prima_donna is one such stub (library.ts:29) shadowed by the implemented PRIMA_DONNA (more.ts:143-144).
- Buffs: `interface Buff` (buff.ts:493), `CardFx` (buff.ts:465) attached at buff.ts:505. 867 buffs; runtime kind split passive 251 / activated 399 / instant 217; 410/867 carry `fx`.
- Signature registries: SIGNATURES (BoardEffects.tsx:1683, 319) + PLUGIN_IDS (sigPlugins.tsx:69-176, 548) = 867 = every buff exactly, 0 generated-fallback in steady state, 0 orphans. But PLUGIN_SIGNATURES is lazy-populated (see X1). Resolver Board.tsx:77-98.

### Events

- Three channels (section 1.2). signatureCard is buff-keyed only. lastHookMutations (game.ts:1457-1490) is the only transient reaching clients for held-buff activity, populated only on observable board mutation. Nerfs emit no signatureCard by any path.
- Counts: 92 literal `kind:"passive"` buff defs, ~40 buff files reference onMovePlayed. Nerfs: 0 literal kind fields (separate type). NERF_REVEAL_SKIP = {none, noop, nerf_removed} (Board.tsx:590).

### Renderer

- Pipeline A (persistent): computeFxVisual (fxZones.ts:113-201) -> Board `visual` prop -> per-square Sets/Maps (Board.tsx:2808-2845) -> MotifBadge, EmpowerShine, NerfAura, quiet-passive king aura, ShieldMark, PawnFence, StunSwirl. MotifKind union = 8. ~51 quiet passives declare no fx.motif and no fx.pieces (Board.tsx:2894-2933).
- Pipeline B (one-shot): signatureCard -> cast state -> CastSpectacle + PlayAnnouncement; resolveSignature -> SignatureOverlay (React.lazy sigVisuals) or GenBurst.
- CSS: effects.css imported eagerly (BoardEffects.tsx:26); godPlays.css rides the lazy sigVisuals chunk (not a bug). Board crop is overflow-hidden (Board.tsx:4016). z-order: motifs z-10/z-20, sig leads z-30, cast z-40.
- Spectator surface omits pipeline A entirely (R5).

### Settings

- The only settings lever that materially changes passive visuals is `motionOff()` (`data-anim="off"`, settings.ts:495-498), default off, no OS prefers-reduced-motion consultation. It suppresses NerfRevealSplash outright (Board.tsx:2244) and, via the R7 asymmetric gate (Board.tsx:1623), fully unmounts the quiet-passive aura while sibling motif auras degrade to a static pose. `fxHiddenPref` hides the fx layer wholesale. No other setting default hides effects. (Dimension input was a placeholder; this is the verified settings surface.)

### Spectate

- Spectator/TV (src/app/game/[id]/page.tsx) is the most degraded surface: no computeFxVisual (R5), no nerfReveals (R6), instant-pick signatures missing and only fired[0] hooks fire (R10). It does still receive signatureCard for actively played buff cards, so played-card flourishes appear; passive presence does not. (Dimension input was a placeholder; this is the verified spectate surface.)

### History

- Two effect systems confirmed: (A) played-card signature choreography (SIGNATURES + PLUGIN_SIGNATURES + genSignature fallback, CastSpectacle, ~9 *Plays.tsx + sigVisuals.tsx 641KB + vfxSpecs.ts, CI drift check) and (B) persistent while-held aura layer (EmpowerAura, fx.motif/fx.pieces badges, quietPassiveAuras, NerfRevealSplash), no coverage enforcement. A THIRD system, the unified passive language, is designed but 0% implemented (R3).
- Timeline: Jul 6 signature system born; Jul 8 4ae51ca "make ~175 built animations actually fire"; Jul 13-14 module upgrades + acquire entrances + motion gating + PLUGIN_IDS drift check; Jul 15 00:38 quietPassiveAuras stopgap (47cabf7); Jul 15 06:49 passive-effect-language spec (1485f6c). CHANGELOG turn-cost badge distribution: 155 "Uses your turn", 12 "Free action", 129 Instant, 123 Passive.
- Key docs: docs/passive-effect-language.md, docs/animation-design-brief.md, docs/animation-backlog.md (521-card catalog, 298-card NERFS section of unbuilt "Reveal:" concepts), docs/CHANGELOG.md.

---

## 5. Recommended fix order

Ordered to restore the most visible, broadest coverage first, then structural correctness, then the long-term unification.

1. Decide the nerf visual contract (unblocks R1, R2, the 342-card headline). Nerfs currently cannot express a per-card spawn. Either (a) add a signature/effectKey field to the `Nerf` type and a nerf-aware fire path and resolver that are NOT gated on BUFF_BY_ID, or (b) formally accept banner-plus-overlay as the nerf visual language and invest in making the NerfRevealSplash per-card (pass cardId into NerfAura at Board.tsx:365, add a per-nerf motif/highlight from `visual()`). Option (b) is far cheaper and matches the existing data model.

2. Fix the reduced-motion regression R7 (small, high-value, affects a third of passives for motion-off users). Remove the extra `!motionOff()` at Board.tsx:1623 and give the quiet aura a static CSS end-state parallel to EmpowerShine/NerfAura (globals.css:1447-1460 pattern), so it degrades instead of vanishing.

3. Wire the spectator surface R5 and R6 (restores an entire surface). Call computeFxVisual in src/app/game/[id]/page.tsx and merge its four square sets into the `visual` object (mirror game/page.tsx:1477 / 2017-2020); build and pass nerfReveals; add the instant-pick cast branch and multi-hook iteration (R10) to match the player handlers.

4. Close the event-trigger gap R4 for board-inert passive buffs. Give passive acquisition (or first relevance) an explicit signature trigger not dependent on onMovePlayed board mutation, since acquireBuff is already observable client-side (X3). Coalesce carefully to avoid R9 by queueing multiple fired signatures rather than overwriting one state slot (Board.tsx:519/546, 2255, 3051).

5. Replace the R8 quietPassiveAuras stopgap once a real per-card passive layer exists, so multiple held quiet passives are each represented rather than collapsed to one king glow.

6. Harden the lazy-chunk path from X1 (prevents intermittent generic buff visuals). Await or gate PLUGIN_SIGNATURES readiness before allowing the first cast, or surface a visible retry instead of silently rendering GenBurst; do not swallow the import catch (BoardEffects.tsx:2385-2391).

7. Build the designed passive registry and coverage test R3 (long-term). Implement src/components/effects/passiveRegistry.ts and the build-failing coverage gate the spec already promises, so future passive gaps fail CI instead of shipping silent. This subsumes steps 4 and 5 into an enforced system.

Do NOT spend effort on: id-collision remapping (X2), removing motifShown dedupe (X7), fxRunning flicker (X8), or once-ever announcement keys (X5). None affect the per-card visual path.
