import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ComponentsSection } from '@/components/handoff/ComponentsSection';
import { EdgeCasesSection } from '@/components/handoff/EdgeCasesSection';
import { ImplementationNotesSection } from '@/components/handoff/ImplementationNotesSection';
import { InteractionsSection } from '@/components/handoff/InteractionsSection';
import { OverviewSection } from '@/components/handoff/OverviewSection';
import { ResponsiveSection } from '@/components/handoff/ResponsiveSection';
import { ScreenFlowsSection } from '@/components/handoff/ScreenFlowsSection';
import { ScreenPinProvider } from '@/components/handoff/ScreenPinProvider';
import { ScreensSection } from '@/components/handoff/ScreensSection';
import { SpecificationsSection } from '@/components/handoff/SpecificationsSection';
import { StatesSection } from '@/components/handoff/StatesSection';
import { buildDeveloperProjection } from '@/lib/share';

import { getOwnedHandoffOrNull } from '../actions';

type PreviewPageProps = {
  params: Promise<{ handoffId: string }>;
};

export async function generateMetadata({ params }: PreviewPageProps): Promise<Metadata> {
  const { handoffId } = await params;
  const handoff = await getOwnedHandoffOrNull(handoffId);
  return { title: handoff ? `Preview — ${handoff.name} — BuildBridge` : 'BuildBridge' };
}

/**
 * The same developer-facing documentation as app/share/[token]/page.tsx —
 * same projection, same sections — but gated by handoff ownership instead
 * of a share token, so the designer can see exactly what a developer would
 * see without first creating a real, live share link. See the developer's
 * flow audit: previously the only way to preview this was to generate a
 * share link and open the raw URL.
 */
export default async function HandoffPreviewPage({ params }: PreviewPageProps) {
  const { handoffId } = await params;
  const handoff = await getOwnedHandoffOrNull(handoffId);

  if (!handoff) {
    notFound();
  }

  const projection = await buildDeveloperProjection(handoffId);
  const unresolvedCriticalCount = projection.issues.filter(
    (issue) => issue.severity === 'Critical' && (issue.status === 'Open' || issue.status === 'InReview'),
  ).length;

  return (
    <ScreenPinProvider>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 rounded-[--radius-lg] border border-[--color-primary] bg-[--color-primary-light] px-4 py-3">
          <p className="text-[--color-primary-dark]">
            Preview only — this is what a developer sees on a share link, not a live one.
          </p>
          <Link href={`/handoffs/${handoffId}`} className="text-[--color-primary-dark] underline">
            Back to review
          </Link>
        </div>

        <a
          href={`/api/handoffs/${handoffId}/export`}
          className="self-end text-[--color-primary] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
        >
          Download as Markdown
        </a>

        <OverviewSection
          name={projection.name}
          description={projection.description}
          readinessScore={projection.readinessScore}
          readinessAlgorithmVersion={projection.readinessAlgorithmVersion}
          unresolvedCriticalCount={unresolvedCriticalCount}
        />
        <ScreensSection screens={projection.screens} />
        <ScreenFlowsSection flows={projection.screenFlows} />
        <ComponentsSection components={projection.components} />
        <SpecificationsSection components={projection.components} />
        <InteractionsSection components={projection.components} />
        <ResponsiveSection rules={projection.responsiveRules} />
        <StatesSection components={projection.components} />
        <EdgeCasesSection issues={projection.issues} />
        <ImplementationNotesSection notes={projection.notes} />
      </div>
    </ScreenPinProvider>
  );
}
