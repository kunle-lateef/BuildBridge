'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { CreateHandoffForm } from '@/components/handoff/CreateHandoffForm';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

/**
 * The dashboard's primary action, kept behind a button + modal instead of a
 * permanently-expanded form sitting above the list — the form only earns
 * its space while someone is actually creating a handoff.
 */
export function CreateHandoffButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="cta" onClick={() => setIsOpen(true)}>
        <Plus aria-hidden="true" size={18} />
        New handoff
      </Button>

      <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Create a handoff">
        <CreateHandoffForm />
      </Modal>
    </>
  );
}
