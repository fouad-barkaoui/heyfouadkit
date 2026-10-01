/**
 * The KANZ wordmark — custom-drawn letters, not a font.
 *
 * Kanz (كنز) is Arabic for "treasure". The A has no crossbar: in its place
 * sits an eight-pointed star, the khatam of Moroccan zellige, as the jewel
 * kept inside. Everything else stays heavy, flat and quiet so the star is
 * the one thing you remember.
 *
 * Drawn on a 380 × 100 grid (cap height 100). Letters take `currentColor`,
 * so the mark follows the text colour of wherever it sits; the star takes
 * `gem` (the app's accent token by default, which already switches between
 * the dark and light themes).
 */

const K = '0,0 23,0 23,42 57,0 85,0 45,47 86,100 58,100 30,62 23,70 23,100 0,100';
const A = '98,100 135,0 157,0 194,100 170,100 146,34 122,100';
const N = '206,100 206,0 230,0 266,62 266,0 290,0 290,100 266,100 230,38 230,100';
const Z = '302,0 380,0 380,20 332,80 380,80 380,100 302,100 302,80 350,20 302,20';

/** Points of an eight-pointed star (two squares, one turned 45°). */
function khatam(cx: number, cy: number, r: number): string {
  const inner = r * (Math.SQRT1_2 / Math.cos(Math.PI / 8));
  const pts: string[] = [];
  for (let i = 0; i < 16; i += 1) {
    const rad = i % 2 === 0 ? r : inner;
    const a = (Math.PI / 8) * i - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

const STAR = khatam(146, 80, 11);

export const KANZ_VIEWBOX = { width: 380, height: 100 } as const;

export function KanzWordmark({
  height = 20,
  gem = 'var(--color-accent, #e4f222)',
  title = 'Kanz',
  className,
}: {
  /** Rendered cap height in px; width follows the 3.8 : 1 ratio. */
  height?: number;
  /** Colour of the star inside the A. */
  gem?: string;
  /** Accessible name. Pass '' when the name is already written next to it. */
  title?: string;
  className?: string;
}): JSX.Element {
  return (
    <svg
      viewBox={`0 0 ${KANZ_VIEWBOX.width} ${KANZ_VIEWBOX.height}`}
      height={height}
      width={(height * KANZ_VIEWBOX.width) / KANZ_VIEWBOX.height}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <g fill="currentColor">
        <polygon points={K} />
        <polygon points={A} />
        <polygon points={N} />
        <polygon points={Z} />
      </g>
      <polygon points={STAR} fill={gem} />
    </svg>
  );
}

/** The star alone, for tight spots (badges, a loading mark). */
export function KanzStar({ size = 16, color = 'var(--color-accent, #e4f222)', className }: { size?: number; color?: string; className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden focusable="false">
      <polygon points={khatam(16, 16, 15)} fill={color} />
    </svg>
  );
}
