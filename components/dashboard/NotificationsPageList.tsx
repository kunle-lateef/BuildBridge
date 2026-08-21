'use client';

import { useRouter } from 'next/navigation';

import { markAllNotificationsRead, markNotificationRead } from '@/app/(dashboard)/notifications/actions';
import { NotificationList, type NotificationItem } from '@/components/dashboard/NotificationList';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type NotificationsPageListProps = {
  notifications: NotificationItem[];
};

/**
 * The full-history counterpart to NotificationBell's dropdown — same
 * mark-read/mark-all-read actions, same NotificationList rendering, just
 * un-capped (scrollable={false}) and with the page's own room for a
 * "Mark all read" control instead of squeezing it into a dropdown header.
 */
export function NotificationsPageList({ notifications }: NotificationsPageListProps) {
  const router = useRouter();
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  async function handleItemClick(id: string) {
    await markNotificationRead(id);
    router.refresh();
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-[--color-text-secondary]">
            {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
          </p>
          <Button variant="ghost" size="sm" onClick={() => void handleMarkAllRead()}>
            Mark all read
          </Button>
        </div>
      )}
      <Card className="flex flex-col p-0">
        <NotificationList
          notifications={notifications}
          onItemClick={(id) => void handleItemClick(id)}
          scrollable={false}
        />
      </Card>
    </div>
  );
}
