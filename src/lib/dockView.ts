"use client";

// Which hand the buff dock shows, You or Them, as one shared module store.
//
// The dock mounts up to three times on a match page (desktop rail, phone
// stack, tablet drawer), so the view lives here rather than in component
// state: every instance reads the same value and the hotkeys flip all of
// them at once. Plain module state plus useSyncExternalStore, no context.

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type DockView = "you" | "them";

let view: DockView = "you";
const listeners = new Set<() => void>();

function emit() {
  for (const fn of [...listeners]) fn();
}

export function setDockView(next: DockView) {
  if (view === next) return;
  view = next;
  emit();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const getSnapshot = () => view;
const getServerSnapshot = (): DockView => "you";

/** The live dock view plus a setter, shared by every mounted dock. */
export function useDockView(): [DockView, (v: DockView) => void] {
  const v = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const set = useCallback((next: DockView) => setDockView(next), []);
  return [v, set];
}

/** True when the caret is somewhere a plain letter is text, not a shortcut. */
function typingInField(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable === true;
}

// One window listener however many docks mount: refcounted.
let hotkeyUsers = 0;
let hotkeyHandler: ((e: KeyboardEvent) => void) | null = null;

/** `y` shows your cards, `t` the opponent's. Registered once per page. */
export function useDockHotkeys() {
  useEffect(() => {
    if (hotkeyUsers++ === 0) {
      hotkeyHandler = (e: KeyboardEvent) => {
        if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
        if (typingInField(e.target)) return;
        const k = e.key.toLowerCase();
        if (k === "y") setDockView("you");
        else if (k === "t") setDockView("them");
        else return;
        e.preventDefault();
      };
      window.addEventListener("keydown", hotkeyHandler);
    }
    return () => {
      if (--hotkeyUsers === 0 && hotkeyHandler) {
        window.removeEventListener("keydown", hotkeyHandler);
        hotkeyHandler = null;
      }
    };
  }, []);
}
