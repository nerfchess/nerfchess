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
    <Link href={href} className={`group inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} className="shrink-0 transition-transform duration-200 group-hover:-rotate-6" />
      <span className="font-display text-xl sm:text-2xl tracking-tight font-bold leading-none">
        nerf<span className="text-gold-leaf">chess</span>
      </span>
    </Link>
  );
}
