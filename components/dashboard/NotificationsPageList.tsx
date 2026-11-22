'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { markAllNotificationsRead, markNotificationRead } from '@/app/(dashboard)/notifications/actions';
import { NotificationList, type NotificationItem } from '@/components/dashboard/NotificationList';
import { Bell } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

type NotificationsPageListProps = {
  notifications: NotificationItem[];
};

/**
 * The Notifications page (Figma `07 — Notifications`): the full history
 * behind the bell, split into Today and Earlier, with an All / Unread
 * switch and "Mark all read" when anything is unread.
 */
export function NotificationsPageList({ notifications }: NotificationsPageListProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;
  const shown = filter === 'unread' ? notifications.filter((notification) => !notification.readAt) : notifications;

  async function handleItemClick(id: string) {
    await markNotificationRead(id);
    router.refresh();
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    router.refresh();
  }

  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="m-0 text-[28px] font-semibold leading-9 text-[--color-text-primary]">Notifications</h1>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/settings?tab=notifications" className="text-[14px] leading-5 text-[--color-text-body] underline">
            Email settings
          </Link>
          <div role="group" aria-label="Show" className="flex rounded-[8px] bg-[--color-surface] p-0.5">
            {(['all', 'unread'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-[6px] px-3 py-1 text-[14px] leading-5',
                  filter === value
                    ? 'bg-white font-medium text-[--color-text-primary] shadow-sm'
                    : 'text-[--color-text-secondary] hover:text-[--color-text-primary]',
                )}
              >
                {value === 'all' ? 'All' : 'Unread'}
                {value === 'unread' && unreadCount > 0 && <span>{unreadCount}</span>}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button type="button" onClick={() => void handleMarkAllRead()} className="text-[14px] leading-5 text-[--color-primary] underline">
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[--color-border] bg-white">
        <NotificationList
          notifications={shown}
          onItemClick={(id) => void handleItemClick(id)}
          scrollable={false}
          grouped
          empty={
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <Bell aria-hidden="true" size={20} className="text-[--color-text-secondary]" />
              <span className="text-[16px] font-medium leading-6 text-[--color-text-primary]">
                {filter === 'unread' && notifications.length > 0 ? 'Nothing unread' : 'No notifications yet'}
              </span>
              <span className="text-[14px] leading-5 text-[--color-text-secondary]">
                {filter === 'unread' && notifications.length > 0
                  ? 'You’re caught up.'
                  : 'Analysis results, developer flags and implemented findings will show up here.'}
              </span>
            </div>
          }
        />
      </div>
    </div>
  );
}
