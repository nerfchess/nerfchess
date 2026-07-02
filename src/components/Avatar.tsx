// Circular profile picture with the account's uploaded image, falling back to
// the first letter of the name in the house style. Size the circle (and the
// fallback letter) through className.

export function Avatar({
  name,
  src,
  className = "h-14 w-14 text-2xl",
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URL, not an optimizable asset
      <img
        src={src}
        alt={`${name}'s profile picture`}
        className={`shrink-0 rounded-full border border-gold/40 object-cover ${className}`}
      />
    );
  }
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border border-gold/40 bg-gold/10 font-display text-gold-leaf ${className}`}
    >
      {name ? name[0].toUpperCase() : "?"}
    </span>
  );
}
