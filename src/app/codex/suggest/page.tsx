"use client";

import Link from "next/link";
import { useState } from "react";

// "Suggest a rule": players describe a rule idea and it lands in the site
// owner's inbox (and the rule_suggestions table, so nothing is ever lost).
export default function SuggestRulePage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, contact }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not send your suggestion.");
      setState("sent");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Could not send your suggestion.");
    }
  };

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
        <h1 className="font-display text-5xl mt-1">Suggest a rule</h1>
        <p className="mt-3 text-parchment-200">
          Got an idea for a new secret rule? Describe it and it goes straight to the
          nerfchess team. The best ones get built.
        </p>

        {state === "sent" ? (
          <div className="mt-7 plate gilt p-6 text-center">
            <div className="font-display text-2xl text-gold-leaf">Sent — thank you!</div>
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
            <div>
              <label className="smallcaps text-[11px] text-parchment-400 mb-1 block" htmlFor="rule-name">
                Rule name <span className="opacity-60">(optional)</span>
              </label>
              <input
                id="rule-name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 80))}
                placeholder="e.g. Pawn Pacifist"
                className="bg-ink-900/60 border border-white/15 rounded-full px-4 py-2 text-base font-display w-full focus:outline-none focus:border-gold/60 text-parchment placeholder:text-parchment-400/40"
              />
            </div>

            <div>
              <label className="smallcaps text-[11px] text-parchment-400 mb-1 block" htmlFor="rule-desc">
                The rule
              </label>
              <textarea
                id="rule-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                required
                rows={5}
                placeholder="Describe what the rule does — what it restricts, forces, or how you lose. Example: “Your bishops melt after 3 captures.”"
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
              {state === "sending" ? "Sending…" : "Send suggestion"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
