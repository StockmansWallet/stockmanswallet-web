import type { WeeklyPoint } from "../_constants";

interface SparklineProps {
  points: WeeklyPoint[];
  width?: number;
  height?: number;
  positive?: boolean;
}

export function Sparkline({ points, width = 120, height = 36, positive }: SparklineProps) {
  if (points.length < 2) {
    return <div className="h-9 w-[120px]" aria-hidden />;
  }
  const values = points.map((p) => p.avg_price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = height - ((p.avg_price - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
  const area = `${path} L${coords[coords.length - 1].x.toFixed(2)},${height} L0,${height} Z`;

  const isPositive = positive ?? values[values.length - 1] >= values[0];
  const stroke = isPositive ? "#34d399" : "#f87171";
  const fill = isPositive ? "rgba(52,211,153,0.14)" : "rgba(248,113,113,0.14)";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden>
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
