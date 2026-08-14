import { ReadinessScoreDisplay } from '@/components/review/ReadinessScoreDisplay';

type OverviewSectionProps = {
  name: string;
  description: string | null;
  readinessScore: number | null;
  readinessAlgorithmVersion: number | null;
  unresolvedCriticalCount: number;
};

export function OverviewSection({
  name,
  description,
  readinessScore,
  readinessAlgorithmVersion,
  unresolvedCriticalCount,
}: OverviewSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-[length:var(--font-desktop-heading-1-semi-bold-size)] font-semibold text-[--color-text-primary]">
        {name}
      </h1>
      {description && <p className="text-[--color-text-secondary]">{description}</p>}
      {readinessScore !== null && readinessAlgorithmVersion !== null && (
        <ReadinessScoreDisplay
          score={readinessScore}
          hasUnresolvedCritical={unresolvedCriticalCount > 0}
          unresolvedCriticalCount={unresolvedCriticalCount}
          algorithmVersion={readinessAlgorithmVersion}
        />
      )}
    </section>
  );
}
