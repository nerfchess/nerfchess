"use client";

// Zen mode plumbing, shared by the header quick-settings menu, the exit
// affordance and the game pages.
//
// The state itself is an ordinary setting (settings.zenMode), so it persists
// and syncs like every other preference; applyUiPrefs stamps html[data-zen] and
// zen.css does the hiding. These hooks only read it, flip it, and bind the key.

import { useCallback, useEffect, useState } from "react";
import { SETTINGS_CHANGED_EVENT, loadSettings, saveSettings } from "@/lib/settings";

/** True when the caret is somewhere a plain letter is text, not a shortcut. */
function typingInField(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable === true;
}

/** Flip zen mode through the normal settings write path. */
export function setZenMode(on: boolean) {
  const current = loadSettings();
  if (current.zenMode === on) return;
  saveSettings({ ...current, zenMode: on });
}

/** The live zen flag plus a toggle, kept in step with every other surface
 *  through the settings-changed event. */
export function useZenMode(): { zen: boolean; setZen: (on: boolean) => void; toggleZen: () => void } {
  const [zen, setZenState] = useState(false);

  useEffect(() => {
    const sync = () => setZenState(loadSettings().zenMode);
    sync();
    window.addEventListener(SETTINGS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, sync);
  }, []);

  const setZen = useCallback((on: boolean) => setZenMode(on), []);
  const toggleZen = useCallback(() => setZenMode(!loadSettings().zenMode), []);
  return { zen, setZen, toggleZen };
}

/** Bind `z` to zen mode for a game surface. Ignored while typing, and while a
 *  modifier is held, so it never steals a browser or OS shortcut. */
export function useZenHotkey() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "z" && e.key !== "Z") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (typingInField(e.target)) return;
      e.preventDefault();
      setZenMode(!loadSettings().zenMode);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
