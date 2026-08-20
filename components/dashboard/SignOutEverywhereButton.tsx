'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type SignOutEverywhereButtonProps = {
  action: () => Promise<void>;
};

export function SignOutEverywhereButton({ action }: SignOutEverywhereButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setIsOpen(true)} className="self-start">
        Sign out everywhere
      </Button>
      <ConfirmDialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={() =>
          startTransition(() => {
            void action();
          })
        }
        title="Sign out everywhere?"
        description="This immediately signs out every device currently signed in as you, including this one."
        confirmLabel="Sign out everywhere"
        variant="danger"
        isConfirming={isPending}
      />
    </>
  );
}
