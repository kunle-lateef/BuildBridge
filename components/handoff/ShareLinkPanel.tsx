'use client';

import { AlertCircle, Check, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useState } from 'react';

import {
  createShareLink,
  revokeShareLink,
} from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import type { ActionResult } from '@/lib/types';

export type ShareLinkItem = {
  id: string;
  status: 'Active' | 'Revoked';
  createdAt: string;
  expiresAt: string | null;
};

type ShareLinkPanelProps = {
  handoffId: string;
  shareLinks: ShareLinkItem[];
};

type CreateResult = ActionResult<{ shareLinkId: string; rawToken: string; expiresAt: string | null }> | null;

export function ShareLinkPanel({ handoffId, shareLinks }: ShareLinkPanelProps) {
  const router = useRouter();
  const [createState, createFormAction, isCreating] = useActionState<CreateResult>(
    async (_prevState: CreateResult) => createShareLink({ handoffId }),
    null,
  );
  const [copied, setCopied] = useState(false);

  const shareUrl =
    createState?.ok && typeof window !== 'undefined'
      ? `${window.location.origin}/share/${createState.data.rawToken}`
      : null;

  async function handleRevoke(shareLinkId: string) {
    await revokeShareLink(shareLinkId);
    router.refresh();
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3">
      <form action={createFormAction}>
        <button
          type="submit"
          disabled={isCreating}
          className="rounded-[--radius-md] bg-[--gradient-primary] px-4 py-2 font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] disabled:opacity-60"
        >
          {isCreating ? 'Creating…' : 'Share Handoff'}
        </button>
      </form>

      {createState && !createState.ok && (
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={16} />
          {createState.error.message}
        </p>
      )}

      {shareUrl && (
        <div className="flex flex-col gap-1.5 rounded-[--radius-lg] border border-[--color-primary] bg-[--color-primary-light] p-3">
          <p className="text-[--color-primary-dark]">
            Copy this link now — it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-[--radius-sm] bg-[--color-background] px-2 py-1 font-mono text-[--color-text-body]">
              {shareUrl}
            </code>
            <button
              type="button"
              onClick={() => void copyLink()}
              aria-label="Copy share link"
              className="rounded-[--radius-sm] border border-[--color-border] p-1.5 hover:bg-[--color-surface] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
            >
              {copied ? <Check aria-hidden="true" size={14} /> : <Copy aria-hidden="true" size={14} />}
            </button>
          </div>
        </div>
      )}

      {shareLinks.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {shareLinks.map((link) => (
            <li
              key={link.id}
              className="flex items-center justify-between rounded-[--radius-md] border border-[--color-border] px-3 py-2"
            >
              <span className="text-[--color-text-secondary]">
                {link.status} — created {new Date(link.createdAt).toLocaleDateString()}
                {link.expiresAt && ` — expires ${new Date(link.expiresAt).toLocaleDateString()}`}
              </span>
              {link.status === 'Active' && (
                <button
                  type="button"
                  onClick={() => void handleRevoke(link.id)}
                  className="rounded-[--radius-sm] border border-[--color-border] px-2 py-1 text-[--color-text-body] hover:bg-[--color-surface] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
