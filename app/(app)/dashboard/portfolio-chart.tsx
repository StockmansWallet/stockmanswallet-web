// Projected portfolio growth curve — deterministic SVG area chart
const GROWTH_FACTORS = [0.72, 0.74, 0.78, 0.76, 0.82, 0.85, 0.83, 0.88, 0.91, 0.94, 0.97, 1.0];

interface PortfolioChartProps {
  value: number;
}

export function PortfolioChart({ value }: PortfolioChartProps) {
  if (value <= 0) return null;

  const data = GROWTH_FACTORS.map((f) => value * f);
  const W = 500;
  const H = 100;
  const PAD = 4;

  const max = Math.max(...data);
  const min = Math.min(...data) * 0.97;
  const range = max - min || 1;

  const pts = data.map((v, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - (v - min) / range) * (H - PAD * 2),
  }));

  // Catmull-Rom to cubic bezier for smooth curve
  function catmullRom(points: { x: number; y: number }[]): string {
    if (points.length < 2) return "";
    let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }

  const line = catmullRom(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  const area = `${line} L${last.x.toFixed(1)},${H} L${first.x.toFixed(1)},${H} Z`;

  return (
    <div className="h-24 w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D9762F" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#D9762F" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#portfolioGrad)" />
        <path
          d={line}
          fill="none"
          stroke="#D9762F"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={last.x} cy={last.y} r="4" fill="#D9762F" />
      </svg>
    </div>
  );
}
