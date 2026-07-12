"use client";

// Moderator card editor: every buff and nerf card in the code libraries, with
// inline-editable metadata overrides (name, description, flavor, tier,
// enabled) stored in the card_overrides table. Card logic stays in code; this
// page only edits the overlay. Server-side authorization happens in
// /api/mod/cards; like /mod, this page just hides itself from non-mods.

import { ALL_BUFFS } from "@/engine/buffs/library";
import { ALL_NERFS } from "@/engine/nerfs/library";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AccountUser, fetchMe } from "@/lib/authClient";

type Kind = "buff" | "nerf";

interface CodeCard {
  id: string;
  kind: Kind;
  name: string;
  description: string;
  flavor: string | null;
  tier: number;
  category: string | null;
  implemented: boolean;
}

interface OverrideRow {
  id: string;
  kind: Kind;
  name: string | null;
  description: string | null;
  flavor: string | null;
  tier: number | null;
  enabled: number;
  updated_at: number | null;
}

// The code-defined catalog, assembled once. Overrides layer on top of this.
const CODE_CARDS: CodeCard[] = [
  ...ALL_NERFS.map((d) => ({
    id: d.id,
    kind: "nerf" as Kind,
    name: d.name,
    description: d.description,
    flavor: d.flavor ?? null,
    tier: d.tier as number,
    category: null,
    implemented: d.implemented,
  })),
  ...ALL_BUFFS.map((b) => ({
    id: b.id,
    kind: "buff" as Kind,
    name: b.name,
    description: b.description,
    flavor: b.flavor ?? null,
    tier: b.tier as number,
    category: b.category,
    implemented: b.implemented,
  })),
];

const LIST_CAP = 120;

interface Draft {
  name: string;
  description: string;
  flavor: string;
  tier: string; // "" = no override (code tier)
  enabled: boolean;
}

function draftFrom(card: CodeCard, o: OverrideRow | undefined): Draft {
  return {
    name: o?.name ?? "",
    description: o?.description ?? "",
    flavor: o?.flavor ?? "",
    tier: o?.tier != null ? String(o.tier) : "",
    enabled: o ? o.enabled !== 0 : true,
  };
}

export default function ModCardsPage() {
  const [me, setMe] = useState<AccountUser | null | undefined>(undefined);
  const [overrides, setOverrides] = useState<Map<string, OverrideRow>>(new Map());
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [onlyOverridden, setOnlyOverridden] = useState(false);
  const [editing, setEditing] = useState<string | null>(null); // "kind:id"
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchMe().then(setMe);
  }, []);

  const isMod = me && (me.role === "mod" || me.role === "admin");

  const loadOverrides = async () => {
    const res = await fetch("/api/mod/cards");
    if (!res.ok) return;
    const data = (await res.json()) as { overrides?: OverrideRow[] };
    const map = new Map<string, OverrideRow>();
    for (const o of data.overrides ?? []) map.set(`${o.kind}:${o.id}`, o);
    setOverrides(map);
  };

  useEffect(() => {
    if (isMod) void (async () => { await loadOverrides(); })();
  }, [isMod]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = CODE_CARDS.filter((c) => {
      if (kind !== "all" && c.kind !== kind) return false;
      const o = overrides.get(`${c.kind}:${c.id}`);
      if (onlyOverridden && !o) return false;
      if (q === "") return true;
      const name = (o?.name ?? c.name).toLowerCase();
      return c.id.toLowerCase().includes(q) || name.includes(q) || c.name.toLowerCase().includes(q);
    });
    list.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
    return list;
  }, [search, kind, onlyOverridden, overrides]);

  const startEdit = (card: CodeCard) => {
    const key = `${card.kind}:${card.id}`;
    setEditing(key);
    setDraft(draftFrom(card, overrides.get(key)));
    setNotice(null);
  };

  const save = async (card: CodeCard) => {
    if (!draft) return;
    setBusy(true);
    const tier = draft.tier === "" ? null : Number(draft.tier);
    const res = await fetch("/api/mod/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: card.id,
        kind: card.kind,
        name: draft.name.trim() === "" ? null : draft.name.trim(),
        description: draft.description.trim() === "" ? null : draft.description.trim(),
        flavor: draft.flavor.trim() === "" ? null : draft.flavor.trim(),
        tier,
        enabled: draft.enabled,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setNotice(data.error ?? "Save failed.");
      return;
    }
    setNotice(null);
    setEditing(null);
    setDraft(null);
    await loadOverrides();
  };

  const reset = async (card: CodeCard) => {
    setBusy(true);
    const res = await fetch(`/api/mod/cards?id=${encodeURIComponent(card.id)}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setNotice("Reset failed.");
      return;
    }
    setNotice(null);
    setEditing(null);
    setDraft(null);
    await loadOverrides();
  };

  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-5 sm:px-10 py-6">
        <Link href="/" className="font-display text-2xl tracking-tight">
          nerf<span className="text-gold-leaf">chess</span>
        </Link>
        <div className="flex items-center gap-3 text-sm font-medium">
          <Link href="/mod" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Moderation</Link>
          <Link href="/codex" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Codex</Link>
        </div>
      </nav>

      <section className="max-w-5xl mx-auto px-6 py-8">
        {me === undefined ? (
          <div className="text-parchment-300">Loading…</div>
        ) : !isMod ? (
          <>
            <h1 className="font-display text-4xl">Card editor</h1>
            <p className="mt-3 text-parchment-200">
              This page is for moderators.{" "}
              {!me && (
                <Link href="/login" className="text-gold-leaf hover:underline">Sign in</Link>
              )}
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl">Card editor</h1>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by id or name"
                className="w-64 max-w-full bg-ink-900/70 border border-white/15 rounded-[1px] px-3 py-1.5 text-sm text-parchment placeholder:text-parchment-400/60 focus:outline-none focus:border-gold/60"
              />
              {(["all", "buff", "nerf"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  aria-pressed={kind === k}
                  className={`px-3 py-1.5 rounded-[1px] text-sm capitalize ${
                    kind === k ? "border border-gold/60 bg-gold/10 text-gold-leaf" : "btn-ghost"
                  }`}
                >
                  {k === "all" ? "All" : `${k}s`}
                </button>
              ))}
              <label className="flex items-center gap-2 text-sm text-parchment-300 ml-1">
                <input
                  type="checkbox"
                  checked={onlyOverridden}
                  onChange={(e) => setOnlyOverridden(e.target.checked)}
                />
                Overridden only
              </label>
            </div>

            {notice && <p className="mt-3 text-sm text-red-400">{notice}</p>}

            <div className="mt-4 plate p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left smallcaps text-[10px] text-parchment-400 border-b border-white/10">
                    <th className="px-3 py-2 font-normal">Card</th>
                    <th className="px-3 py-2 font-normal">Kind</th>
                    <th className="px-3 py-2 font-normal">Tier</th>
                    <th className="px-3 py-2 font-normal">Enabled</th>
                    <th className="px-3 py-2 font-normal"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, LIST_CAP).map((card) => {
                    const key = `${card.kind}:${card.id}`;
                    const o = overrides.get(key);
                    const isEditing = editing === key;
                    const effectiveName = o?.name ?? card.name;
                    const effectiveTier = o?.tier ?? card.tier;
                    const enabled = o ? o.enabled !== 0 : true;
                    return (
                      <FragmentRow
                        key={key}
                        card={card}
                        overridden={!!o}
                        effectiveName={effectiveName}
                        effectiveTier={effectiveTier}
                        enabled={enabled}
                        isEditing={isEditing}
                        draft={isEditing ? draft : null}
                        setDraft={setDraft}
                        busy={busy}
                        onEdit={() => startEdit(card)}
                        onCancel={() => {
                          setEditing(null);
                          setDraft(null);
                        }}
                        onSave={() => save(card)}
                        onReset={() => reset(card)}
                      />
                    );
                  })}
                </tbody>
              </table>
              {rows.length === 0 && (
                <p className="px-3 py-6 text-center text-parchment-400">No cards match.</p>
              )}
              {rows.length > LIST_CAP && (
                <p className="px-3 py-3 text-xs text-parchment-400 border-t border-white/10">
                  Showing {LIST_CAP} of {rows.length} cards. Refine the search to see the rest.
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function FragmentRow({
  card,
  overridden,
  effectiveName,
  effectiveTier,
  enabled,
  isEditing,
  draft,
  setDraft,
  busy,
  onEdit,
  onCancel,
  onSave,
  onReset,
}: {
  card: CodeCard;
  overridden: boolean;
  effectiveName: string;
  effectiveTier: number;
  enabled: boolean;
  isEditing: boolean;
  draft: Draft | null;
  setDraft: (d: Draft) => void;
  busy: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const patch = (p: Partial<Draft>) => draft && setDraft({ ...draft, ...p });
  return (
    <>
      <tr className="border-b border-white/5 align-top">
        <td className="px-3 py-2">
          <span className={enabled ? "text-parchment-100" : "text-parchment-400 line-through"}>
            {effectiveName}
          </span>
          {overridden && (
            <span className="ml-2 smallcaps text-[9px] px-1.5 py-0.5 border border-gold/50 text-gold-leaf rounded-[1px]">
              override
            </span>
          )}
          {!card.implemented && (
            <span className="ml-2 smallcaps text-[9px] text-parchment-400">stub</span>
          )}
          <div className="text-[11px] text-parchment-400">{card.id}</div>
        </td>
        <td className="px-3 py-2 capitalize text-parchment-300">{card.kind}</td>
        <td className="px-3 py-2 text-parchment-300">
          {effectiveTier}
          {effectiveTier !== card.tier && (
            <span className="ml-1 text-[10px] text-parchment-400">(code {card.tier})</span>
          )}
        </td>
        <td className="px-3 py-2 text-parchment-300">{enabled ? "Yes" : "No"}</td>
        <td className="px-3 py-2 text-right whitespace-nowrap">
          {isEditing ? (
            <button onClick={onCancel} className="btn-ghost px-3 py-1 rounded-[1px] text-xs" disabled={busy}>
              Cancel
            </button>
          ) : (
            <>
              <button onClick={onEdit} className="btn-ghost px-3 py-1 rounded-[1px] text-xs">
                Edit
              </button>
              {overridden && (
                <button
                  onClick={onReset}
                  className="ml-2 btn-ghost px-3 py-1 rounded-[1px] text-xs"
                  disabled={busy}
                  title="Delete the override and fall back to the code definition"
                >
                  Reset to code
                </button>
              )}
            </>
          )}
        </td>
      </tr>
      {isEditing && draft && (
        <tr className="border-b border-white/5 bg-white/[0.02]">
          <td colSpan={5} className="px-3 py-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="smallcaps text-[10px] text-parchment-400">Name</span>
                <input
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder={card.name}
                  className="bg-ink-900/70 border border-white/15 rounded-[1px] px-3 py-1.5 text-sm text-parchment placeholder:text-parchment-400/60 focus:outline-none focus:border-gold/60"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="smallcaps text-[10px] text-parchment-400">Tier (blank = code tier {card.tier})</span>
                <select
                  value={draft.tier}
                  onChange={(e) => patch({ tier: e.target.value })}
                  className="bg-ink-900/70 border border-white/15 rounded-[1px] px-3 py-1.5 text-sm text-parchment focus:outline-none focus:border-gold/60"
                >
                  <option value="" className="bg-ink-900 text-parchment">Code ({card.tier})</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
                    <option key={t} value={t} className="bg-ink-900 text-parchment">{t}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="smallcaps text-[10px] text-parchment-400">Description</span>
                <textarea
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder={card.description}
                  rows={2}
                  className="bg-ink-900/70 border border-white/15 rounded-[1px] px-3 py-1.5 text-sm text-parchment placeholder:text-parchment-400/60 focus:outline-none focus:border-gold/60"
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="smallcaps text-[10px] text-parchment-400">Flavor</span>
                <textarea
                  value={draft.flavor}
                  onChange={(e) => patch({ flavor: e.target.value })}
                  placeholder={card.flavor ?? "No flavor text in code"}
                  rows={1}
                  className="bg-ink-900/70 border border-white/15 rounded-[1px] px-3 py-1.5 text-sm text-parchment placeholder:text-parchment-400/60 focus:outline-none focus:border-gold/60"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-parchment-200">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) => patch({ enabled: e.target.checked })}
                />
                Enabled (unchecked = never offered in drafts or dealt as a nerf)
              </label>
              <div className="flex items-center justify-end gap-2">
                <button onClick={onSave} className="btn-glass px-4 py-1.5 rounded-[1px] text-sm" disabled={busy}>
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
