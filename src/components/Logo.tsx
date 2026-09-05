import Link from "next/link";

export function LogoMark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.svg" alt="" width={size} height={size} className={className} aria-hidden />
  );
}

export function Logo({
  href = "/",
  className = "",
  size = 34,
}: {
  href?: string;
  className?: string;
  size?: number;
}) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 no-underline ${className}`}>
      <LogoMark size={size} className="shrink-0" />
      {/* Lichess's wordmark: one weight, one colour, 24px, no accent split. */}
      <span className="hidden font-display text-[24px] font-medium leading-none tracking-tight text-parchment-100 sm:inline">
        nerfchess
      </span>
    </Link>
  );
}
