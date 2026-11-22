import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getOwnedHandoffOrNull } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { DeveloperView } from '@/components/share/DeveloperView';
import { buildDeveloperProjection } from '@/lib/share';


type PreviewPageProps = {
  params: Promise<{ handoffId: string }>;
};

export async function generateMetadata({ params }: PreviewPageProps): Promise<Metadata> {
  const { handoffId } = await params;
  const handoff = await getOwnedHandoffOrNull(handoffId);
  return { title: handoff ? `Preview — ${handoff.name} — BuildBridge` : 'BuildBridge' };
}

/**
 * Exactly what a developer sees on a share link (the same DeveloperView and
 * projection), gated by handoff ownership instead of a token, so the
 * designer can check it without creating a live link. Developer-only tools
 * (mark implemented, flag a value) are off here.
 */
export default async function HandoffPreviewPage({ params }: PreviewPageProps) {
  const { handoffId } = await params;
  const handoff = await getOwnedHandoffOrNull(handoffId);

  if (!handoff) {
    notFound();
  }

  const projection = await buildDeveloperProjection(handoffId);

  return (
    <DeveloperView
      projection={projection}
      downloadHref={`/api/handoffs/${handoffId}/export`}
      notice={
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[--color-border] bg-[--color-surface] px-5 py-2 text-[12px] leading-4 text-[--color-text-body] lg:px-8">
          <span>Preview: this is what a developer sees on your share link. Marking and flagging are turned off here.</span>
          <Link href={`/handoffs/${handoffId}`} className="font-medium text-[--color-primary] underline">
            Back to review
          </Link>
        </div>
      }
    />
  );
}
