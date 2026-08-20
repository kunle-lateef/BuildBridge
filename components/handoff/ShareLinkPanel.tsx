'use client';

import { AlertCircle, Check, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  createShareLink,
  revokeShareLink,
} from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';

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

export function ShareLinkPanel({ handoffId, shareLinks }: ShareLinkPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreateConfirmOpen, setIsCreateConfirmOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  async function confirmCreate() {
    setIsCreating(true);
    setCreateError(null);

    const result = await createShareLink({ handoffId });

    setIsCreating(false);
    setIsCreateConfirmOpen(false);

    if (!result.ok) {
      setCreateError(result.error.message);
      return;
    }

    setShareUrl(`${window.location.origin}/share/${result.data.rawToken}`);
    router.refresh();
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    setIsRevoking(true);
    await revokeShareLink(revokeTarget);
    setIsRevoking(false);
    setRevokeTarget(null);
    toast('Share link revoked.');
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
      <div className="flex items-center gap-3">
        <Button type="button" variant="cta" disabled={isCreating} onClick={() => setIsCreateConfirmOpen(true)}>
          {isCreating ? 'Creating…' : 'Share Handoff'}
        </Button>
        <a
          href={`/api/handoffs/${handoffId}/export`}
          className="text-[--color-primary] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
        >
          Download as Markdown
        </a>
      </div>

      {createError && (
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={16} />
          {createError}
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void copyLink()}
              aria-label="Copy share link"
            >
              {copied ? <Check aria-hidden="true" size={14} /> : <Copy aria-hidden="true" size={14} />}
            </Button>
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
                <Button type="button" variant="secondary" size="sm" onClick={() => setRevokeTarget(link.id)}>
                  Revoke
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={isCreateConfirmOpen}
        onClose={() => setIsCreateConfirmOpen(false)}
        onConfirm={() => void confirmCreate()}
        title="Share this handoff?"
        description="Anyone with the link can view the confirmed specs, components, and states — no BuildBridge account required. You can revoke it any time."
        confirmLabel="Share"
        isConfirming={isCreating}
      />

      <ConfirmDialog
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => void confirmRevoke()}
        title="Revoke this share link?"
        description="Anyone with this link will immediately lose access. This can't be undone — you can create a new link afterward."
        confirmLabel="Revoke"
        variant="danger"
        isConfirming={isRevoking}
      />
    </div>
  );
}
