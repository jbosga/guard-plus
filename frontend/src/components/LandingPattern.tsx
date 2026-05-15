// Abstract "field plate" decorative pattern for the GUARD left panel.
// Deterministic dot lattice with sparse bright nodes and connecting lines —
// evokes an astronomical plate where a corpus reveals constellations.

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const GRAIN_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>";

function FieldPlateSVG({ accent = '#c97a4f', density = 1.0, ink = '#ffffff' }) {
  const W = 1200, H = 900;
  const step = 28 / density;
  const rand = mulberry32(7);
  const dots: { x: number; y: number; r: number; bright: boolean }[] = [];
  const bright: { x: number; y: number }[] = [];

  for (let y = step / 2; y < H; y += step) {
    for (let x = step / 2; x < W; x += step) {
      const jx = (rand() - 0.5) * step * 0.35;
      const jy = (rand() - 0.5) * step * 0.35;
      const px = x + jx, py = y + jy;
      const isBright = rand() < 0.06;
      const r = isBright ? 1.6 + rand() * 1.8 : 0.7;
      dots.push({ x: px, y: py, r, bright: isBright });
      if (isBright) bright.push({ x: px, y: py });
    }
  }

  const lines: [{ x: number; y: number }, { x: number; y: number }][] = [];
  for (let i = 0; i < bright.length; i++) {
    let best = -1, bestD = Infinity;
    for (let j = 0; j < bright.length; j++) {
      if (i === j) continue;
      const dx = bright[i].x - bright[j].x;
      const dy = bright[i].y - bright[j].y;
      const d = Math.hypot(dx, dy);
      if (d < bestD && d < 220) { bestD = d; best = j; }
    }
    if (best > i) lines.push([bright[i], bright[best]]);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <g stroke={ink} strokeOpacity="0.05" strokeWidth="1">
        <line x1="0" y1={H * 0.62} x2={W} y2={H * 0.62} />
        <line x1={W * 0.18} y1="0" x2={W * 0.18} y2={H} />
      </g>
      <g fill={ink} fillOpacity="0.18" fontFamily="JetBrains Mono, monospace" fontSize="9">
        <text x={W * 0.18 + 6} y={14}>α</text>
        <text x={6} y={H * 0.62 - 6}>δ</text>
      </g>
      <g stroke={accent} strokeOpacity="0.55" strokeWidth="0.6">
        {lines.map((seg, i) => (
          <line key={i} x1={seg[0].x} y1={seg[0].y} x2={seg[1].x} y2={seg[1].y} />
        ))}
      </g>
      <g>
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={ink} fillOpacity={d.bright ? 0.95 : 0.22} />
        ))}
      </g>
    </svg>
  );
}

type LandingPatternOverlayProps = {
  accent?: string;
  panelBg?: string;
};

export function LandingPatternOverlay({
  accent = '#c97a4f',
  panelBg = '#1f2328',
}: LandingPatternOverlayProps) {
  return (
    <>
      {/* SVG pattern */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <FieldPlateSVG accent={accent} />
      </div>

      {/* Scrim — radial halo anchored to the text column for legibility */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: `radial-gradient(
          ellipse 720px 560px at 320px 50%,
          color-mix(in oklab, ${panelBg}, transparent 18%) 0%,
          color-mix(in oklab, ${panelBg}, transparent 55%) 40%,
          transparent 75%
        )`,
      }} />

      {/* Film grain */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        opacity: 0.18, mixBlendMode: 'overlay',
        backgroundImage: `url("${GRAIN_SVG}")`,
      }} />
    </>
  );
}
