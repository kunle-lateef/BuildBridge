// Same thresholds app/(dashboard)/insights/page.tsx already uses for its
// category averages — kept here so every surface that shows a readiness
// number colors it identically instead of drifting.
export function scoreColorClass(score: number): string {
  if (score < 60) return 'text-[--color-error]';
  if (score < 85) return 'text-[--color-warning]';
  return 'text-[--color-success]';
}
