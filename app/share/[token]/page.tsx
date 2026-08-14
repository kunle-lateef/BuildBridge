import type { Metadata } from 'next';
import { notFound } from 'next/navigation';


import { ComponentsSection } from '@/components/handoff/ComponentsSection';
import { EdgeCasesSection } from '@/components/handoff/EdgeCasesSection';
import { ImplementationNotesSection } from '@/components/handoff/ImplementationNotesSection';
import { InteractionsSection } from '@/components/handoff/InteractionsSection';
import { OverviewSection } from '@/components/handoff/OverviewSection';
import { ResponsiveSection } from '@/components/handoff/ResponsiveSection';
import { ScreensSection } from '@/components/handoff/ScreensSection';
import { SpecificationsSection } from '@/components/handoff/SpecificationsSection';
import { StatesSection } from '@/components/handoff/StatesSection';
import { db } from '@/lib/db';
import { buildDeveloperProjection, resolveShareLink } from '@/lib/share';
import { shareTokenSchema } from '@/lib/validators/share';

type SharePageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { token } = await params;
  const parsedToken = shareTokenSchema.safeParse(token);

  if (!parsedToken.success) {
    return { title: 'BuildBridge' };
  }

  const shareLink = await resolveShareLink(parsedToken.data);

  if (!shareLink) {
    return { title: 'BuildBridge' };
  }

  const handoff = await db.handoff.findUnique({
    where: { id: shareLink.handoffId },
    select: { name: true },
  });

  return { title: handoff ? `${handoff.name} — BuildBridge` : 'BuildBridge' };
}

/**
 * Server-rendered, read-only, no client-side fetch before showing anything
 * meaningful — see architecture.md's Rendering Rules. The person opening
 * this may not even be a BuildBridge account holder, so it never checks a
 * session; it checks the ShareLink token instead (lib/share.ts). An
 * invalid, expired, or revoked token is a 404 — never a partial response.
 */
export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const parsedToken = shareTokenSchema.safeParse(token);

  if (!parsedToken.success) {
    notFound();
  }

  const shareLink = await resolveShareLink(parsedToken.data);

  if (!shareLink) {
    notFound();
  }

  const projection = await buildDeveloperProjection(shareLink.handoffId);
  const unresolvedCriticalCount = projection.issues.filter(
    (issue) => issue.severity === 'Critical' && (issue.status === 'Open' || issue.status === 'InReview'),
  ).length;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12">
      <OverviewSection
        name={projection.name}
        description={projection.description}
        readinessScore={projection.readinessScore}
        readinessAlgorithmVersion={projection.readinessAlgorithmVersion}
        unresolvedCriticalCount={unresolvedCriticalCount}
      />
      <ScreensSection screens={projection.screens} />
      <ComponentsSection components={projection.components} />
      <SpecificationsSection components={projection.components} />
      <InteractionsSection components={projection.components} />
      <ResponsiveSection rules={projection.responsiveRules} />
      <StatesSection components={projection.components} />
      <EdgeCasesSection issues={projection.issues} />
      <ImplementationNotesSection notes={projection.notes} />
    </main>
  );
}
