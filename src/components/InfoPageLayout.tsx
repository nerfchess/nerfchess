import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";

type InfoPageLayoutProps = {
  eyebrow: string;
  title: string;
  // ReactNode (not just string) so a page can pass a glossary-wrapped intro;
  // plain strings, which every other caller passes, remain valid.
  intro: ReactNode;
  children: ReactNode;
};

export function InfoPageLayout({
  eyebrow,
  title,
  intro,
  children,
}: InfoPageLayoutProps) {
  return (
    <main className="min-h-screen pb-20">
      <nav className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-7 sm:px-8">
        <Link href="/" className="font-display text-2xl tracking-tight">
          nerf<span className="text-gold-leaf">chess</span>
        </Link>
        <Link
          href="/play"
          className="btn-ghost press px-4 py-2 font-display text-[13px]"
        >
          Play
        </Link>
      </nav>

      <section className="mx-auto max-w-[1100px] px-6 pt-4 sm:px-8">
        <div className="eyebrow">{eyebrow}</div>
        {/* Fluid display ramp instead of ad-hoc sizes; the prose column below
            stays narrower than the card grid so long lines remain readable. */}
        <h1 className="display-1 mt-2">{title}</h1>
        <p className="mt-5 max-w-3xl text-[16px] leading-[1.7] text-parchment-200">{intro}</p>
        <div className="mt-9 space-y-4">{children}</div>
      </section>

      <SiteFooter />
    </main>
  );
}

export function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="plate p-6 sm:p-7">
      <h2 className="display-3 text-parchment">{title}</h2>
      <div className="mt-3 max-w-3xl space-y-3 text-[15px] leading-relaxed text-parchment-200/90">
        {children}
      </div>
    </section>
  );
}
