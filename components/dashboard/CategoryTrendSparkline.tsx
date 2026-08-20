type CategoryTrendSparklineProps = {
  points: { score: number }[];
  width?: number;
  height?: number;
};

/**
 * Hand-rolled inline SVG — no charting library exists in this codebase and
 * a handful of points doesn't warrant adding one. An area fill under a
 * single emphasized line, a faint zero/hundred baseline, and a highlighted
 * endpoint (the current score) rather than a bare unlabeled squiggle.
 */
export function CategoryTrendSparkline({ points, width = 120, height = 32 }: CategoryTrendSparklineProps) {
  if (points.length < 2) {
    return <span className="text-[--color-text-muted]">Not enough runs yet</span>;
  }

  const stepX = width / (points.length - 1);
  const toY = (score: number) => height - (Math.max(0, Math.min(100, score)) / 100) * height;

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${index * stepX} ${toY(point.score)}`).join(' ');
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  const last = points[points.length - 1] as { score: number };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`Trend over the last ${points.length} runs, currently ${last.score}%`}
    >
      <line x1={0} y1={height} x2={width} y2={height} stroke="var(--color-border)" strokeWidth={1} />
      <path d={areaPath} fill="var(--color-primary-light)" stroke="none" opacity={0.7} />
      <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={toY(last.score)} r={3.5} fill="var(--color-primary)" stroke="var(--color-background)" strokeWidth={1.5} />
    </svg>
  );
}
