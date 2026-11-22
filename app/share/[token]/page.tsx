import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { DeveloperView } from '@/components/share/DeveloperView';
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
 * The developer's read-only view. Server-rendered from the token alone: the
 * person opening it may not have an account, so it never checks a session;
 * an invalid, expired or revoked token is a 404, never a partial page.
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

  return <DeveloperView projection={projection} shareToken={token} downloadHref={`/api/share/${token}/export`} />;
}
