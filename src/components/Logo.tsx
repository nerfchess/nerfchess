import Link from "next/link";

export function LogoMark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="dcPlateNav" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2b2926" />
          <stop offset="1" stopColor="#161512" />
        </linearGradient>
        <linearGradient id="dcKnightNav" x1="20" y1="10" x2="44" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#eceae6" />
          <stop offset="1" stopColor="#a9a6a1" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="0"
        fill="url(#dcPlateNav)"
        stroke="#3692e7"
        strokeOpacity="0.6"
        strokeWidth="2"
      />
      <path
        d="M40.5 52H17.5c0-3.4 1.3-5.6 3.6-7.4 5.2-4 8.4-8.3 9.1-13.7l-3.7 2.9c-1.6 1.3-3.9 1-5-.6-.9-1.3-.8-3 .2-4.3l4.6-5.7c1.5-1.9 3.4-3.5 5.6-4.7l-1.2-3.1c-.5-1.2.1-2.6 1.3-3l1.4-.5c.9-.3 1.9 0 2.5.8l1.7 2.2c5.6.7 9.9 5.5 9.9 11.2V46c0 3.3 1 5 3 6Z"
        fill="url(#dcKnightNav)"
      />
      <circle cx="33.5" cy="22.5" r="1.4" fill="#161512" />
    </svg>
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
