"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A titled group of settings: an icon + small-caps header with a hairline rule
 * that fills the remaining width, then the rows separated by faint dividers.
 */
export function SettingsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-0.5 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-gold-leaf" strokeWidth={2} />
        <h3 className="smallcaps text-[10.5px] text-parchment-300">{title}</h3>
        <div className="ml-1 h-px flex-1 bg-white/10" />
      </div>
      <div className="divide-y divide-white/[0.06]">{children}</div>
    </section>
  );
}
