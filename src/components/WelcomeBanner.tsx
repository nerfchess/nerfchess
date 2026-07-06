"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

// A first-visit welcome: a first-timer landing on the live-TV hero has no idea
// what a "nerf" is, so state the one-minute idea plainly, once. It is a single
// slim line (never a blocking wizard), the two mode words carry the seam colors
// so the split identity registers immediately, and it self-dismisses to
// localStorage so returning players never see it again.
const KEY = "nerfchess:welcomed";

export function WelcomeBanner() {
  // Render nothing until mounted so the server HTML and first client paint
  // agree (localStorage is client-only).
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {}
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setShow(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-5 sm:px-6 pt-4">
      <div className="plate animate-reveal relative flex items-center gap-3 p-3 px-4">
        <p className="flex-1 text-sm leading-relaxed text-parchment-200">
          <span className="font-semibold text-parchment-50">New here?</span> Nerf Chess is
          normal chess with one twist: in{" "}
          <span className="font-semibold text-mode-nerfGlow">Nerf</span> mode you each carry a
          secret handicap; in <span className="font-semibold text-mode-buffGlow">Buff</span>{" "}
          mode you both draft power-ups as you play. There is no checkmate: you win by
          capturing the king.
        </p>
        <Link
          href="/tutorial"
          className="btn-ghost press hidden shrink-0 px-3 py-1.5 font-display text-xs font-semibold sm:inline-flex"
        >
          How it works
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss welcome"
          className="nav-icon-btn grid h-7 w-7 shrink-0 place-items-center text-parchment-400 hover:text-parchment-100"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
