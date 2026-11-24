'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { markAllNotificationsRead, markNotificationRead } from '@/app/(dashboard)/notifications/actions';
import { NotificationList, type NotificationItem } from '@/components/dashboard/NotificationList';
import { Button } from '@/components/ui/Button';
import { Bell } from '@/components/ui/icons';

type NotificationBellProps = {
  notifications: NotificationItem[];
  /** Which edge the panel lines up with: left in the desktop sidebar, right in the phone top bar. */
  align?: 'left' | 'right';
};

/**
 * Server-fetched notifications passed down (layout.tsx already fetches the
 * session server-side) and re-fetched via router.refresh() after a mutation
 * — no polling/websocket infra, so the bell reflects state as of the last
 * navigation, matching the rest of this app's read model.
 */
export function NotificationBell({ notifications, align = 'right' }: NotificationBellProps) {
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
        className="relative flex h-11 w-11 items-center justify-center rounded-[--radius-md] text-[--color-text-primary] hover:bg-[--color-surface] lg:h-8 lg:w-8"
      >
        <Bell aria-hidden="true" size={18} />
        {unreadCount > 0 && (
          <>
            {/* Phones show a dot (Figma "Handoffs — Mobile 390"), the sidebar a count. */}
            <span aria-hidden="true" className="absolute left-[26px] top-[11px] h-2 w-2 rounded-full bg-[--color-primary] lg:hidden" />
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 hidden h-4 min-w-4 items-center justify-center rounded-full bg-[--color-primary] px-1 text-[10px] font-semibold text-white lg:flex"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </>
        )}
      </button>

      {isOpen && (
        // Phones: the page dims under the top bar (Figma "…, notifications open").
        <div
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
          className="fixed inset-x-0 bottom-0 top-[69px] z-40 bg-[rgba(14,19,32,0.4)] lg:hidden"
        />
      )}

      {isOpen && (
        <div
          className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} z-50 mt-2 w-80 rounded-[--radius-lg] border border-[--color-border] bg-white shadow-lg max-lg:fixed max-lg:inset-x-4 max-lg:top-[77px] max-lg:mt-0 max-lg:w-auto`}
        >
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
            className="block border-t border-[--color-border] px-4 py-3 text-center text-[--color-primary] hover:bg-[--color-surface] hover:underline"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
