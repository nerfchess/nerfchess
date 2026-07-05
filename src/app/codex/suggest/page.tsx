"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Kind = "nerf" | "buff";
type Pool = "buff" | "boon";

// "Suggest a nerf or a buff": players describe a card idea and it lands in
// the site owner's inbox (and the rule_suggestions table, so nothing is ever
// lost). One form serves both kinds; buff ideas also say which draft pool
// they are meant for (a Buff mode card or a Nerf-mode relief boon).
export default function SuggestRulePage() {
  const [kind, setKind] = useState<Kind>("nerf");
  const [pool, setPool] = useState<Pool>("buff");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Links can preselect the kind (the buff library links to ?kind=buff).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("kind") === "buff") setKind("buff");
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          contact,
          kind,
          ...(kind === "buff" ? { pool } : {}),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not send your suggestion.");
      setState("sent");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Could not send your suggestion.");
    }
  };

  const noun = kind === "nerf" ? "nerf" : "buff";

  return (
    <main className="min-h-screen pb-20">
      <nav className="flex items-center justify-between px-6 sm:px-10 py-6 sm:py-7">
        <Link href="/" className="font-display text-2xl tracking-tight">
          nerf<span className="text-gold-leaf">chess</span>
        </Link>
        <Link href="/codex" className="px-3 py-1.5 rounded-full text-sm font-display hover:bg-white/5 text-parchment">
          ← All the rules
        </Link>
      </nav>

      <section className="max-w-2xl mx-auto px-6">
        <div className="smallcaps text-[11px] text-parchment-400">workshop</div>
        <h1 className="font-display text-5xl mt-1">
          {kind === "nerf" ? "Suggest a nerf" : "Suggest a buff"}
        </h1>
        <p className="mt-3 text-parchment-200">
          {kind === "nerf"
            ? "Got an idea for a new secret rule? Describe it and it goes straight to the nerfchess team. The best ones get built."
            : "Got an idea for a new draft card? Describe it and it goes straight to the nerfchess team. The best ones get built."}
        </p>

        {/* Kind toggle: nerf ideas wear the warm nerf identity, buff ideas the blue. */}
        <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="What are you suggesting?">
          <button
            type="button"
            onClick={() => setKind("nerf")}
            aria-pressed={kind === "nerf"}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-display text-sm transition ${
              kind === "nerf"
                ? "border border-mode-nerf/50 bg-mode-nerf/10 text-mode-nerfGlow"
                : "btn-ghost"
            }`}
          >
            Nerf
          </button>
          <button
            type="button"
            onClick={() => setKind("buff")}
            aria-pressed={kind === "buff"}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-display text-sm transition ${
              kind === "buff"
                ? "border border-mode-buff/50 bg-mode-buff/10 text-mode-buffGlow"
                : "btn-ghost"
            }`}
          >
            Buff
          </button>
        </div>

        {state === "sent" ? (
          <div className="mt-7 plate gilt p-6 text-center">
            <div className="font-display text-2xl text-gold-leaf">Sent. Thank you!</div>
            <p className="mt-2 text-sm text-parchment-200">
              Your idea is in the queue. If it makes the cut you&apos;ll see it in the Codex.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setName("");
                  setDescription("");
                  setState("idle");
                }}
                className="btn-ghost px-5 py-2.5 font-display text-sm"
              >
                Suggest another
              </button>
              <Link href="/codex" className="btn-leaf px-5 py-2.5 font-display text-sm font-semibold inline-flex items-center">
                Back to the rules
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 plate p-5 sm:p-6 space-y-5">
            {kind === "buff" && (
              <div>
                <span className="smallcaps text-[11px] text-parchment-400 mb-1 block">
                  Which pool is it for?
                </span>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Which pool is the buff for?">
                  <button
                    type="button"
                    onClick={() => setPool("buff")}
                    aria-pressed={pool === "buff"}
                    className={`inline-flex items-center px-3.5 py-1.5 rounded-full font-display text-xs transition ${
                      pool === "buff"
                        ? "border border-mode-buff/50 bg-mode-buff/10 text-mode-buffGlow"
                        : "btn-ghost"
                    }`}
                  >
                    Buff mode card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPool("boon")}
                    aria-pressed={pool === "boon"}
                    className={`inline-flex items-center px-3.5 py-1.5 rounded-full font-display text-xs transition ${
                      pool === "boon"
                        ? "border border-mode-buff/50 bg-mode-buff/10 text-mode-buffGlow"
                        : "btn-ghost"
                    }`}
                  >
                    Nerf-mode boon
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-parchment-400">
                  {pool === "buff"
                    ? "A card players draft in Buff mode."
                    : "A relief card offered mid-game in Nerf mode."}
                </p>
              </div>
            )}

            <div>
              <label className="smallcaps text-[11px] text-parchment-400 mb-1 block" htmlFor="rule-name">
                {kind === "nerf" ? "Nerf name" : "Buff name"} <span className="opacity-60">(optional)</span>
              </label>
              <input
                id="rule-name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 80))}
                placeholder={kind === "nerf" ? "e.g. Pawn Pacifist" : "e.g. Second Wind"}
                className="bg-ink-900/60 border border-white/15 rounded-full px-4 py-2 text-base font-display w-full focus:outline-none focus:border-gold/60 text-parchment placeholder:text-parchment-400/40"
              />
            </div>

            <div>
              <label className="smallcaps text-[11px] text-parchment-400 mb-1 block" htmlFor="rule-desc">
                {kind === "nerf" ? "The nerf" : "The buff"}
              </label>
              <textarea
                id="rule-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                required
                rows={5}
                placeholder={
                  kind === "nerf"
                    ? "Describe what the rule does: what it restricts, forces, or how you lose. Example: “Your bishops melt after 3 captures.”"
                    : "Describe what the card lets you do: the boost, when it triggers, any cost. Example: “Once per game, move a pawn two squares sideways.”"
                }
                className="bg-ink-900/60 border border-white/15 rounded-2xl px-4 py-3 text-sm w-full focus:outline-none focus:border-gold/60 text-parchment placeholder:text-parchment-400/40 resize-y"
              />
              <div className="mt-1 text-right font-mono text-[10px] text-parchment-400/60">
                {description.length}/1000
              </div>
            </div>

            <div>
              <label className="smallcaps text-[11px] text-parchment-400 mb-1 block" htmlFor="rule-contact">
                How to credit / reach you <span className="opacity-60">(optional)</span>
              </label>
              <input
                id="rule-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value.slice(0, 120))}
                placeholder="username, email, discord…"
                className="bg-ink-900/60 border border-white/15 rounded-full px-4 py-2 text-sm w-full focus:outline-none focus:border-gold/60 text-parchment placeholder:text-parchment-400/40"
              />
            </div>

            {error && <div className="text-sm text-oxblood-glow">{error}</div>}

            <button
              type="submit"
              disabled={state === "sending" || description.trim().length < 10}
              className="btn-leaf btn-cta w-full px-6 py-3 font-display text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state === "sending" ? "Sending…" : `Send ${noun} suggestion`}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
