'use client';

import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';

type CommandPaletteProps = {
  handoffs: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const STATIC_DESTINATIONS = [
  { label: 'Handoffs', href: '/handoffs' },
  { label: 'Insights', href: '/insights' },
  { label: 'Drift', href: '/drift' },
  { label: 'Settings', href: '/settings' },
];

/**
 * ⌘K / Ctrl+K anywhere in the dashboard, or the visible search trigger in
 * the top bar — open state is controlled by the parent (DashboardChrome)
 * so both entry points share one source of truth. Handoff names are passed
 * down from the server-rendered layout (same pattern as NotificationBell)
 * rather than client-fetched — no new data-fetching path, just reused data
 * the layout already has reason to know about.
 */
export function CommandPalette({ handoffs, open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command palette"
      overlayClassName="fixed inset-0 z-40 bg-black/30"
      contentClassName="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-[--radius-lg] border border-[--color-border] bg-[--color-background] shadow-lg"
    >
      <Command.Input
        placeholder="Find a handoff or page…"
        className="w-full border-b border-[--color-border] bg-transparent px-4 py-3 text-[--color-text-body] focus-visible:outline-none"
      />
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-2 py-4 text-[--color-text-muted]">No results found.</Command.Empty>

        <Command.Group
          heading="Go to"
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[--color-text-muted]"
        >
          {STATIC_DESTINATIONS.map((dest) => (
            <Command.Item
              key={dest.href}
              value={dest.label}
              onSelect={() => go(dest.href)}
              className="cursor-pointer rounded-[--radius-sm] px-2 py-1.5 text-[--color-text-body] aria-selected:bg-[--color-surface]"
            >
              {dest.label}
            </Command.Item>
          ))}
        </Command.Group>

        {handoffs.length > 0 && (
          <Command.Group
            heading="Handoffs"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[--color-text-muted]"
          >
            {handoffs.map((handoff) => (
              <Command.Item
                key={handoff.id}
                value={handoff.name}
                onSelect={() => go(`/handoffs/${handoff.id}`)}
                className="cursor-pointer rounded-[--radius-sm] px-2 py-1.5 text-[--color-text-body] aria-selected:bg-[--color-surface]"
              >
                {handoff.name}
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
