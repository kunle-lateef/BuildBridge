'use client';

import { useId, useState } from 'react';

export type TrendPoint = { analysisRunId: string; runDate: string; score: number };

type PortfolioTrendChartProps = {
  points: TrendPoint[];
  height?: number;
};

/**
 * A bigger, smoother sibling of CategoryTrendSparkline — a hand-rolled
 * smoothed-curve area chart (quadratic bezier through midpoints, the same
 * technique real charting libraries use for a "smooth line" look) with a
 * hover tooltip, matching the reference dashboards' portfolio-trend charts.
 * Still no charting library: this is one more SVG component, not a new
 * dependency, consistent with CategoryTrendSparkline's own reasoning.
 */
export function PortfolioTrendChart({ points, height = 220 }: PortfolioTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const gradientId = useId();
  const width = 800;
  const paddingTop = 16;
  const paddingBottom = 28;
  const chartHeight = height - paddingTop - paddingBottom;

  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center text-[--color-text-muted]" style={{ height }}>
        Not enough analysis runs yet to chart a trend.
      </div>
    );
  }

  const stepX = width / (points.length - 1);
  const toY = (score: number) => paddingTop + chartHeight - (Math.max(0, Math.min(100, score)) / 100) * chartHeight;
  const toX = (index: number) => index * stepX;

  // Smooth the line through each point's midpoint to the next, rather than
  // straight segments — the same "quadratic through midpoints" trick most
  // charting libraries use for a curved look without full spline math.
  let linePath = `M ${toX(0)} ${toY(points[0]?.score ?? 0)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (!prev || !curr) continue;
    const midX = (toX(i - 1) + toX(i)) / 2;
    linePath += ` Q ${toX(i - 1)} ${toY(prev.score)} ${midX} ${(toY(prev.score) + toY(curr.score)) / 2}`;
    linePath += ` Q ${midX} ${(toY(prev.score) + toY(curr.score)) / 2} ${toX(i)} ${toY(curr.score)}`;
  }
  const areaPath = `${linePath} L ${width} ${height - paddingBottom} L 0 ${height - paddingBottom} Z`;

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={`Portfolio readiness trend over ${points.length} runs, currently ${points[points.length - 1]?.score}%`}
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const relativeX = ((event.clientX - rect.left) / rect.width) * width;
          const index = Math.round(relativeX / stepX);
          setHoverIndex(Math.max(0, Math.min(points.length - 1, index)));
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Gridlines at 0/50/100% */}
        {[0, 50, 100].map((mark) => (
          <line
            key={mark}
            x1={0}
            y1={toY(mark)}
            x2={width}
            y2={toY(mark)}
            stroke="var(--color-border)"
            strokeWidth={1}
            strokeDasharray={mark === 0 ? undefined : '3 3'}
          />
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth={2.5} strokeLinecap="round" />

        {points.map((point, index) => (
          <circle
            key={point.analysisRunId}
            cx={toX(index)}
            cy={toY(point.score)}
            r={index === hoverIndex ? 5 : index === points.length - 1 ? 3.5 : 0}
            fill="var(--color-primary)"
            stroke="var(--color-background)"
            strokeWidth={1.5}
          />
        ))}

        {hoverIndex !== null && (
          <line
            x1={toX(hoverIndex)}
            y1={paddingTop}
            x2={toX(hoverIndex)}
            y2={height - paddingBottom}
            stroke="var(--color-text-muted)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}
      </svg>

      {hovered && hoverIndex !== null && (
        <div
          className="pointer-events-none absolute top-2 flex -translate-x-1/2 flex-col gap-0.5 rounded-[--radius-md] border border-[--color-border] bg-[--color-background] px-3 py-2 shadow-lg"
          style={{ left: `${(toX(hoverIndex) / width) * 100}%` }}
        >
          <span className="font-mono text-[length:var(--font-desktop-body-small-semi-bold-size)] font-semibold text-[--color-text-primary]">
            {hovered.score}%
          </span>
          <span className="whitespace-nowrap text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-muted]">
            {new Date(hovered.runDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>
      )}

      <div className="mt-1 flex justify-between text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-muted]">
        <span>{new Date(points[0]?.runDate ?? '').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        <span>
          {new Date(points[points.length - 1]?.runDate ?? '').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
}
