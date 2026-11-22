type CategoryTrendSparklineProps = {
  points: { score: number }[];
  width?: number;
  height?: number;
};

/**
 * A quiet one-line trend for a category row (Figma `08 — Insights`, "Last
 * 10 analyses"): neutral ink, no fill, scaled to its own range so a small
 * change is still visible; the row's number carries the actual value.
 */
export function CategoryTrendSparkline({ points, width = 96, height = 20 }: CategoryTrendSparklineProps) {
  if (points.length < 2) {
    return <span className="text-[12px] leading-4 text-[--color-text-secondary]">Not enough runs yet</span>;
  }

  const scores = points.map((point) => point.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = Math.max(max - min, 10);
  const stepX = width / (points.length - 1);
  const toY = (score: number) => 2 + (height - 4) * (1 - (score - min) / span);
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${index * stepX} ${toY(point.score)}`).join(' ');
  const first = points[0] as { score: number };
  const last = points[points.length - 1] as { score: number };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`From ${first.score}% to ${last.score}% over the last ${points.length} analyses`}
    >
      <path d={line} fill="none" stroke="var(--color-text-body)" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
