import gsap from 'gsap';

const COLORS = ['#e4f222', '#d0d6e0', '#27a644', '#8b5cf6'];

/**
 * Completion burst. Fired from the checkbox that was just ticked — a short,
 * physical confirmation rather than a toast the user has to read.
 */
export function completionBurst(origin: HTMLElement, count = 16): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const rect = origin.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:60;';
  document.body.appendChild(layer);

  const particles: HTMLSpanElement[] = [];
  for (let i = 0; i < count; i += 1) {
    const p = document.createElement('span');
    const size = 2 + Math.random() * 3.5;
    p.style.cssText = [
      'position:absolute',
      `left:${cx}px`,
      `top:${cy}px`,
      `width:${size}px`,
      `height:${size}px`,
      'border-radius:9999px',
      `background:${COLORS[i % COLORS.length]}`,
      'will-change:transform,opacity',
    ].join(';');
    layer.appendChild(p);
    particles.push(p);
  }

  const ring = document.createElement('span');
  ring.style.cssText = [
    'position:absolute',
    `left:${cx}px`,
    `top:${cy}px`,
    'width:10px',
    'height:10px',
    'margin:-5px 0 0 -5px',
    'border-radius:9999px',
    'border:1px solid rgba(228,242,34,0.7)',
  ].join(';');
  layer.appendChild(ring);

  const tl = gsap.timeline({ onComplete: () => layer.remove() });

  tl.to(ring, { scale: 5.5, opacity: 0, duration: 0.55, ease: 'power2.out' }, 0);

  particles.forEach((p, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const distance = 26 + Math.random() * 42;
    tl.to(
      p,
      {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 10,
        opacity: 0,
        scale: 0.3,
        duration: 0.6 + Math.random() * 0.25,
        ease: 'power2.out',
      },
      0,
    );
  });
}
