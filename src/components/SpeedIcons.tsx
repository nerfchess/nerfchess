import type { CSSProperties, ReactNode } from "react";

// Original speed glyphs in the Lichess iconography language: a bullet for
// Bullet, a lightning bolt for Blitz, a rabbit for Rapid, a tortoise for
// Classical, and a flame for UltraBullet. Drawn from scratch (Lichess's own
// font glyphs are GPL, so nothing is copied) in the lucide stroke style:
// 24 viewBox, stroke 2, currentColor, round caps. They slot in anywhere a
// lucide icon renders, e.g. <Icon size={14} style={{ color }} />.

export interface SpeedIconProps {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number | string;
  color?: string;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

function SpeedSvg({ children, size = 24, strokeWidth = 2, ...rest }: SpeedIconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Bullet: a round-nosed slug streaking up-right, with two speed lines. */
export function BulletIcon(props: SpeedIconProps) {
  return (
    <SpeedSvg {...props}>
      <path d="M7 13 14 6a2.83 2.83 0 0 1 4 4l-7 7z" />
      <path d="M5 15.5 2.5 18" />
      <path d="M8.5 19l-2 2" />
    </SpeedSvg>
  );
}

/** Blitz: the classic lightning bolt. */
export function BlitzIcon(props: SpeedIconProps) {
  return (
    <SpeedSvg {...props}>
      <path d="M14 2 5.5 13h5L9 22l9.5-12h-5L16 2z" />
    </SpeedSvg>
  );
}

/** Rapid: a rabbit; two tall ears over a round face. */
export function RapidIcon(props: SpeedIconProps) {
  return (
    <SpeedSvg {...props}>
      <path d="M10.6 9.8C8.6 8 7 4.6 8.4 3.1c1.4-1.5 3 1.5 3.1 6.5" />
      <path d="M13.4 9.8c2-1.8 3.6-5.2 2.2-6.7-1.4-1.5-3 1.5-3.1 6.5" />
      <circle cx="12" cy="15.5" r="6" />
    </SpeedSvg>
  );
}

/** Classical: a tortoise; domed shell, plates, head, and feet. */
export function ClassicalIcon(props: SpeedIconProps) {
  return (
    <SpeedSvg {...props}>
      <path d="M5.5 14.5a6.5 6.5 0 0 1 13 0" />
      <path d="M3 14.5h16" />
      <circle cx="20.6" cy="13" r="1.7" />
      <path d="M8 14.5v3" />
      <path d="M15 14.5v3" />
      <path d="M10 8.7v5.8" />
      <path d="M14 8.7v5.8" />
    </SpeedSvg>
  );
}

/** UltraBullet: a flame; the whole game burns down in seconds. */
export function UltraBulletIcon(props: SpeedIconProps) {
  return (
    <SpeedSvg {...props}>
      <path d="M12 2.5c.4 4.3 5 6.4 5 11.3a5 5 0 0 1-10 0c0-4.9 4.6-7 5-11.3z" />
      <path d="M12 12.2c1.5 1.6 2.4 2.6 2.4 4.1a2.4 2.4 0 0 1-4.8 0c0-1.5.9-2.5 2.4-4.1z" />
    </SpeedSvg>
  );
}
