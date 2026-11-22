'use client';

import { useState, type ComponentProps } from 'react';

import { ShareLinkPanel } from '@/components/handoff/ShareLinkPanel';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

/**
 * "Share handoff" in the Review header (Figma `04 — Handoff` → "Review —
 * Share dialog"): opens the existing share-link panel in a dialog instead
 * of a section at the bottom of the page.
 */
export function ShareHandoffButton({
  variant = 'secondary',
  ...props
}: ComponentProps<typeof ShareLinkPanel> & { variant?: 'primary' | 'secondary' }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button type="button" variant={variant} onClick={() => setIsOpen(true)}>
        Share handoff
      </Button>
      <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Share handoff" className="max-w-lg">
        <ShareLinkPanel {...props} />
      </Modal>
    </>
  );
}
