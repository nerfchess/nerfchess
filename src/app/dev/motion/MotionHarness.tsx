"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";

// The dock rows carry their lifecycle classes (.dock-arrive and friends) from
// the draft stylesheet, which BuffDock imports in a real game.
import "@/components/DraftOverlay.css";

import type { BuffInstance } from "@/engine/buff";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import type { BoardEval } from "@/components/EvalBar";
import { EvalBar, EvalStrip } from "@/components/EvalBar";
import { DraftNotice } from "@/components/DraftNotice";
import { GodPanelNotice, type GodPanelNoticeItem } from "@/components/GodPanelNotice";
import { DockRow } from "@/components/dock/DockRow";
import { PresenceBadge } from "@/components/PresenceBadge";
import { TourCoachOverlay, type CoachStep } from "@/components/tutorial/TourCoachOverlay";

const IDS = Object.values(BUFF_BY_ID)
  .filter((b) => b.kind === "activated")
  .slice(0, 12)
  .map((b) => b.id);

function inst(i: number): BuffInstance {
  const id = IDS[i % IDS.length];
  return { id, tier: BUFF_BY_ID[id].tier, state: {} };
}

function reading(cp: number): BoardEval {
  return {
    board: {} as BoardEval["board"],
    cpWhite: cp,
    depth: 8,
    best: null,
    costMs: 1,
    thread: "worker",
    settled: true,
  };
}

const STEPS: CoachStep[] = [
  { id: "a", kicker: "Step one", title: "The first target", body: "A small box.", targetSelectors: ["[data-spot='a']"] },
  { id: "b", kicker: "Step two", title: "The second target", body: "A wide box.", targetSelectors: ["[data-spot='b']"] },
];

export function MotionHarness() {
  const [oppBuffs, setOppBuffs] = useState<BuffInstance[]>([]);
  const [god, setGod] = useState<GodPanelNoticeItem[]>([]);
  const godKey = useRef(0);
  const [rows, setRows] = useState<BuffInstance[]>([inst(0), inst(1)]);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [cp, setCp] = useState(0);
  const [tour, setTour] = useState<number | null>(null);
  // Framer gate (F186): a one second framer fade that replays on each click.
  // With Animations off, src/lib/motion.ts (installed by SettingsBootstrap)
  // makes framer land on the end state instead of running.
  const [framerRun, setFramerRun] = useState(0);

  const addGod = () => {
    const key = godKey.current++;
    setGod((cur) => [...cur, { key, by: "Tester", action: "summoned a card", leaving: false }]);
    window.setTimeout(() => setGod((cur) => cur.map((n) => (n.key === key ? { ...n, leaving: true } : n))), 1200);
    window.setTimeout(() => setGod((cur) => cur.filter((n) => n.key !== key)), 1600);
  };

  const btn = "border border-[color:var(--edge)] px-3 py-1.5 text-[13px] text-parchment-200";

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6 text-parchment-200">
      <h1 className="font-display text-xl">Motion harness</h1>

      <section className="space-y-2">
        <button type="button" data-testid="framer-replay" className={btn} onClick={() => setFramerRun((n) => n + 1)}>
          Framer fade
        </button>
        {framerRun > 0 && (
          <motion.div
            key={framerRun}
            data-testid="framer-probe"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, ease: "linear" }}
            className="h-6 w-40 bg-[color:var(--bg-raised)]"
          />
        )}
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" data-testid="draft-notice" className={btn} onClick={() => setOppBuffs((b) => [...b, inst(b.length + 3)])}>
            Opponent drafts
          </button>
          <button type="button" data-testid="god-notice" className={btn} onClick={addGod}>
            God panel used
          </button>
        </div>
        <div data-clip="notices" className="relative mt-28 h-16 w-[26rem] border border-[color:var(--edge)]">
          <DraftNotice buffs={oppBuffs} banked={false} />
          <div className="absolute inset-x-0 top-0">
            <div className="relative">
              <GodPanelNotice notices={god} />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" data-testid="dock-add" className={btn} onClick={() => setRows((r) => [...r, inst(r.length + 5)])}>
            Card lands in the dock
          </button>
          <button
            type="button"
            data-testid="dock-use"
            className={btn}
            onClick={() => setRows((r) => r.map((x, i) => (i === 0 ? { ...x, usedActivation: true } : x)))}
          >
            Use the first card
          </button>
        </div>
        <div data-clip="dock" className="w-80 space-y-1">
          {rows.map((r, i) => (
            <DockRow
              key={i}
              inst={r}
              index={i}
              count={1}
              owner="mine"
              open={!!open[i]}
              onToggle={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
              flash={i === rows.length - 1 && rows.length > 2}
            />
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" data-testid="eval-swing" className={btn} onClick={() => setCp((c) => (c > 0 ? -400 : 400))}>
            Swing the eval
          </button>
        </div>
        <div data-clip="eval" className="flex h-48 items-stretch gap-4">
          <EvalBar result={reading(cp)} className="h-full" />
          <div className="w-72">
            <EvalStrip result={reading(cp)} />
          </div>
        </div>
      </section>

      <section className="flex items-center gap-4" data-clip="presence">
        <PresenceBadge state="searching" />
        <PresenceBadge state="online" />
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" data-testid="tour-start" className={btn} onClick={() => setTour(0)}>
            Start tour
          </button>
        </div>
        <div className="flex items-start gap-10">
          <div data-spot="a" className="h-12 w-12 border border-[color:var(--edge)]" />
          <div data-spot="b" className="h-24 w-72 border border-[color:var(--edge)]" />
        </div>
      </section>

      {tour !== null && (
        <TourCoachOverlay
          step={STEPS[tour]}
          index={tour}
          count={STEPS.length}
          onNext={tour < STEPS.length - 1 ? () => setTour(tour + 1) : () => setTour(null)}
          onBack={tour > 0 ? () => setTour(tour - 1) : undefined}
          onSkip={() => setTour(null)}
        />
      )}
    </main>
  );
}
