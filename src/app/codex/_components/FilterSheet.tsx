"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Mobile bottom sheet for the filter controls, following the site's drawer
 * mechanics (scrim + panel, close on backdrop click and Escape, body scroll
 * locked while open). The filter chip row collapses behind a trigger button on
 * phones; opening it slides this panel up from the bottom edge.
 */
export function FilterSheet({
  open,
  onClose,
  title,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50"
      />
      <div className="plate-raised absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto overscroll-contain border-t border-[color:var(--edge-strong)] px-4 pb-6 pt-3 shadow-plate">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[16px] text-parchment-50">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="grid h-10 w-10 place-items-center rounded-none text-parchment-300 hover:bg-[color:var(--bg-raised)] hover:text-parchment-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
          >
            <X size={18} />
          </button>
        </div>
        {children}
        {footer && <div className="mt-5 flex items-center gap-3">{footer}</div>}
      </div>
    </div>
  );
}
