"use client";

// Card ideas submitted through the public suggestion forms. The list used to be
// one undifferentiated stream; the chips split it by which pool an idea is aimed
// at, which is how they get read in practice — you sit down to work on Buff mode
// or on Nerf mode, not on both at once.

import { useEffect, useMemo, useState } from "react";
import { ModeBadge } from "@/components/ModeBadge";
import type { Suggestion } from "./types";
import { Empty, FilterChip, Loading, Pill, when, whenShort } from "./ui";

type Pool = "all" | "nerf" | "buff" | "boon";

function poolOf(s: Suggestion): Exclude<Pool, "all"> {
  if (s.kind !== "buff") return "nerf";
  return s.pool === "boon" ? "boon" : "buff";
}

export function IdeasSection() {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [pool, setPool] = useState<Pool>("all");

  useEffect(() => {
    fetch("/api/mod/suggestions").then(async (res) => {
      if (res.ok) setSuggestions(((await res.json()) as { suggestions: Suggestion[] }).suggestions);
    });
  }, []);

  const counts = useMemo(() => {
    const c = { nerf: 0, buff: 0, boon: 0 };
    for (const s of suggestions ?? []) c[poolOf(s)] += 1;
    return c;
  }, [suggestions]);

  if (!suggestions) return <Loading what="player ideas" />;
  if (suggestions.length === 0) return <Empty>No card ideas have been submitted yet.</Empty>;

  const rows = pool === "all" ? suggestions : suggestions.filter((s) => poolOf(s) === pool);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={pool === "all"} onClick={() => setPool("all")}>
          All ({suggestions.length})
        </FilterChip>
        <FilterChip active={pool === "nerf"} onClick={() => setPool("nerf")}>
          Nerf rules ({counts.nerf})
        </FilterChip>
        <FilterChip active={pool === "buff"} onClick={() => setPool("buff")}>
          Buff cards ({counts.buff})
        </FilterChip>
        <FilterChip active={pool === "boon"} onClick={() => setPool("boon")}>
          Nerf-mode boons ({counts.boon})
        </FilterChip>
      </div>

      {rows.length === 0 ? (
        <Empty>Nothing submitted for that pool yet.</Empty>
      ) : (
        <div className="space-y-2">
          {rows.map((s) => (
            <div key={s.id} className="plate p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <ModeBadge mode={s.kind === "buff" ? "buff" : "nerf"} />
                <span className="font-display font-semibold text-gold-leaf">{s.name}</span>
                {s.kind === "buff" && (
                  <Pill>{s.pool === "boon" ? "Nerf-mode boon" : "Buff mode card"}</Pill>
                )}
                <span
                  className="w-full text-parchment-400 sm:ml-auto sm:w-auto"
                  title={when(s.created_at)}
                >
                  by {s.username ?? "anonymous"}
                  {s.contact ? ` (${s.contact})` : ""} · {whenShort(s.created_at)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-parchment-100">{s.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
