import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ImageResponse } from 'next/og';

import { db } from '@/lib/db';
import { resolveShareLink } from '@/lib/share';
import { shareTokenSchema } from '@/lib/validators/share';

export const alt = 'A read-only BuildBridge handoff';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#0E1320';
const SECONDARY = '#4A5366';
const ERROR = '#B42424';

/**
 * The card chat apps show when a share link is pasted (Figma `12 — Emails /
 * Share link preview`). It shows only what the share page itself shows
 * above the fold: name, readiness, open critical gaps. An invalid, expired
 * or revoked token gets the plain logo card, never a partial handoff.
 */
export default async function ShareLinkPreview({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [logoSvg, interRegular, interSemiBold] = await Promise.all([
    readFile(path.join(process.cwd(), 'public/logo/buildbridge-logo.svg')),
    readFile(path.join(process.cwd(), 'assets/fonts/Inter-Regular.woff')),
    readFile(path.join(process.cwd(), 'assets/fonts/Inter-SemiBold.woff')),
  ]);
  const logo = `data:image/svg+xml;base64,${logoSvg.toString('base64')}`;

  const parsed = shareTokenSchema.safeParse(token);
  const shareLink = parsed.success ? await resolveShareLink(parsed.data) : null;
  const handoff = shareLink
    ? await db.handoff.findUnique({ where: { id: shareLink.handoffId }, select: { name: true, readinessScore: true } })
    : null;
  const criticalOpen = shareLink
    ? await db.handoffIssue.count({
        where: { handoffId: shareLink.handoffId, severity: 'Critical', status: { in: ['Open', 'InReview'] } },
      })
    : 0;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF', padding: 80, fontFamily: 'Inter' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img only */}
        <img src={logo} width={232} height={44} alt="" />
        <div style={{ flex: 1 }} />
        {handoff && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignSelf: 'flex-start', background: '#F1F3F7', color: SECONDARY, borderRadius: 999, padding: '8px 16px', fontSize: 24 }}>
              Read-only handoff
            </div>
            <div style={{ marginTop: 28, fontSize: 76, fontWeight: 600, color: INK, letterSpacing: -1.5, lineHeight: 1.1 }}>
              {handoff.name.length > 40 ? `${handoff.name.slice(0, 39)}…` : handoff.name}
            </div>
            {handoff.readinessScore !== null && (
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 28, fontSize: 30 }}>
                <span style={{ fontSize: 44, fontWeight: 600, color: INK }}>{handoff.readinessScore}%</span>
                <div style={{ display: 'flex', width: 240, height: 8, borderRadius: 999, background: '#F1F3F7', marginLeft: 24 }}>
                  <div style={{ width: `${handoff.readinessScore}%`, height: 8, borderRadius: 999, background: SECONDARY }} />
                </div>
                <span style={{ marginLeft: 24, color: criticalOpen > 0 ? ERROR : INK }}>
                  {criticalOpen > 0
                    ? `Not ready · ${criticalOpen} critical ${criticalOpen === 1 ? 'gap' : 'gaps'} open`
                    : 'No critical gaps open'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
        { name: 'Inter', data: interSemiBold, weight: 600, style: 'normal' },
      ],
    },
  );
}
