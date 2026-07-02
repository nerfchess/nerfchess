"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadProfile,
  saveUsername,
  PROFILE_CHANGED_EVENT,
  USERNAME_MAX_LENGTH,
} from "@/lib/profile";

// Avatar + username chip for the site nav. Reads the local profile on mount
// (and again whenever it changes, including from another tab) so the name
// survives page refreshes. Clicking it opens a small editor.
export function ProfileChip() {
  const [username, setUsername] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sync = () => setUsername(loadProfile().username);
    sync();
    window.addEventListener(PROFILE_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROFILE_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node)) return;
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const submit = () => {
    saveUsername(draft);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setDraft(username ?? "");
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        title={username ? "Edit your profile" : "Set your username"}
        className="btn-ghost flex items-center gap-2 px-2 py-1.5 sm:px-2.5"
      >
        <span
          aria-hidden
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-gold/60 bg-gold/20 font-display text-[11px] font-semibold text-gold-leaf"
        >
          {username ? (
            username.charAt(0).toUpperCase()
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )}
        </span>
        <span className="hidden max-w-[9rem] truncate sm:inline">
          {username ?? "Set username"}
        </span>
      </button>

      {open && (
        <div className="plate absolute right-0 top-full z-30 mt-2 w-64 p-3 shadow-2xl">
          <div className="smallcaps text-[10px] text-parchment-400">Username</div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="mt-2 flex gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={USERNAME_MAX_LENGTH}
              placeholder="Your name"
              autoFocus
              className="min-w-0 flex-1 rounded-sm border border-white/15 bg-ink-900/60 px-2.5 py-1.5 text-sm text-parchment placeholder:text-parchment-400/40 focus:border-gold/60 focus:outline-none"
            />
            <button type="submit" className="btn-leaf px-3 py-1.5 font-display text-sm">
              Save
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
