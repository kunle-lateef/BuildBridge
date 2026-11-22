'use client';

import { useState } from 'react';

export type TrendPoint = { analysisRunId: string; runDate: string; score: number };

type PortfolioTrendChartProps = {
  points: TrendPoint[];
  height?: number;
};

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/**
 * Figma `08 — Insights` "Average readiness": one thin primary line on a
 * 0–100% grid, the latest value labelled, and a hover crosshair with a
 * "<date> analysis" tooltip. Hand-rolled SVG; no charting library.
 */
export function PortfolioTrendChart({ points, height = 200 }: PortfolioTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 1000;
  const left = 0;
  const right = 24;
  const top = 12;
  const bottom = 12;
  const plotHeight = height - top - bottom;

  if (points.length < 2) {
    return (
      <p className="m-0 py-10 text-center text-[14px] leading-5 text-[--color-text-secondary]">
        Run a few more analyses and the trend shows up here.
      </p>
    );
  }

  const stepX = (width - left - right) / (points.length - 1);
  const toX = (index: number) => left + index * stepX;
  const toY = (score: number) => top + plotHeight - (Math.max(0, Math.min(100, score)) / 100) * plotHeight;
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(point.score)}`).join(' ');
  const lastIndex = points.length - 1;
  const last = points[lastIndex] as TrendPoint;
  const hovered = hoverIndex !== null ? points[hoverIndex] : undefined;
  // Up to four evenly spaced date labels, always including both ends.
  const labelIndexes = [...new Set([0, Math.round(lastIndex / 3), Math.round((2 * lastIndex) / 3), lastIndex])];

  return (
    <div className="flex gap-3">
      <div className="flex shrink-0 flex-col justify-between text-[11px] leading-4 text-[--color-text-secondary]" style={{ height, paddingTop: top - 8, paddingBottom: bottom - 8 }}>
        <span>100%</span>
        <span>50%</span>
        <span>0%</span>
      </div>
      <div className="relative min-w-0 flex-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          width="100%"
          height={height}
          role="img"
          aria-label={`Average readiness over the last ${points.length} analyses, now ${last.score}%`}
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * width;
            setHoverIndex(Math.max(0, Math.min(lastIndex, Math.round((x - left) / stepX))));
          }}
        >
          {[0, 25, 50, 75, 100].map((mark) => (
            <line key={mark} x1={0} x2={width} y1={toY(mark)} y2={toY(mark)} stroke="var(--color-border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          {hoverIndex !== null && (
            <line x1={toX(hoverIndex)} x2={toX(hoverIndex)} y1={top} y2={height - bottom} stroke="var(--color-text-secondary)" strokeDasharray="3 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          )}
          <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {/* Dots and labels sit in HTML so they stay round and crisp when the SVG stretches. */}
        {[lastIndex, ...(hoverIndex !== null && hoverIndex !== lastIndex ? [hoverIndex] : [])].map((index) => (
          <span
            key={index}
            aria-hidden="true"
            className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[--color-primary]"
            style={{ left: `${(toX(index) / width) * 100}%`, top: toY(points[index]?.score ?? 0) }}
          />
        ))}
        <span
          className="absolute -translate-x-full -translate-y-full pb-1.5 pr-1 text-[12px] font-semibold leading-4 text-[--color-text-primary]"
          style={{ left: `${(toX(lastIndex) / width) * 100}%`, top: toY(last.score) }}
        >
          {last.score}%
        </span>
        {hovered && hoverIndex !== null && hoverIndex !== lastIndex && (
          <div
            className="pointer-events-none absolute flex flex-col gap-0.5 rounded-[6px] border border-[--color-border] bg-white px-3 py-2 shadow-sm"
            style={{ left: `calc(${(toX(hoverIndex) / width) * 100}% + 10px)`, top: toY(hovered.score) + 8 }}
          >
            <span className="whitespace-nowrap text-[12px] leading-4 text-[--color-text-secondary]">{shortDate(hovered.runDate)} analysis</span>
            <span className="text-[14px] font-semibold leading-5 text-[--color-text-primary]">{hovered.score}%</span>
          </div>
        )}
        <div className="relative mt-1 h-4 text-[12px] leading-4 text-[--color-text-secondary]">
          {labelIndexes.map((index) => (
            <span
              key={index}
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${(toX(index) / width) * 100}%` }}
            >
              {shortDate(points[index]?.runDate ?? '')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
