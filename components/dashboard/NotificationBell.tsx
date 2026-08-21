'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { markAllNotificationsRead, markNotificationRead } from '@/app/(dashboard)/notifications/actions';
import { NotificationList, type NotificationItem } from '@/components/dashboard/NotificationList';
import { Button } from '@/components/ui/Button';

type NotificationBellProps = {
  notifications: NotificationItem[];
};

/**
 * Server-fetched notifications passed down (layout.tsx already fetches the
 * session server-side) and re-fetched via router.refresh() after a mutation
 * — no polling/websocket infra, so the bell reflects state as of the last
 * navigation, matching the rest of this app's read model.
 */
export function NotificationBell({ notifications }: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  async function handleItemClick(id: string) {
    setIsOpen(false);
    await markNotificationRead(id);
    router.refresh();
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="relative rounded-[--radius-md] p-2 text-[--color-text-secondary] hover:bg-[--color-surface] hover:text-[--color-text-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
      >
        <Bell aria-hidden="true" size={18} />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[--color-error] px-1 font-mono text-[10px] text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-[--radius-lg] border border-[--color-border] bg-[--color-background] shadow-lg">
          <div className="flex items-center justify-between border-b border-[--color-border] px-4 py-2">
            <span className="text-[--color-text-body]">Notifications</span>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => void handleMarkAllRead()}>
                Mark all read
              </Button>
            )}
          </div>
          <NotificationList notifications={notifications} onItemClick={(id) => void handleItemClick(id)} />
          <Link
            href="/notifications"
            onClick={() => setIsOpen(false)}
            className="block border-t border-[--color-border] px-4 py-2.5 text-center text-[--color-primary] hover:bg-[--color-surface] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
