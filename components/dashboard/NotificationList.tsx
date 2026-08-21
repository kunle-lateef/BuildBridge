import Link from 'next/link';

import type { NotificationType } from '@/lib/types';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationListProps = {
  notifications: NotificationItem[];
  onItemClick: (id: string) => void;
  /** The dropdown caps its own height and scrolls internally; a dedicated page has no such constraint. */
  scrollable?: boolean;
};

export function NotificationList({ notifications, onItemClick, scrollable = true }: NotificationListProps) {
  if (notifications.length === 0) {
    return <p className="p-4 text-[--color-text-muted]">No notifications yet.</p>;
  }

  return (
    <ul className={scrollable ? 'flex max-h-96 flex-col overflow-y-auto' : 'flex flex-col'}>
      {notifications.map((notification) => {
        const content = (
          <div className="flex flex-col gap-0.5 px-4 py-3">
            <div className="flex items-center gap-2">
              {!notification.readAt && (
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[--color-primary]" />
              )}
              <span className="font-medium text-[--color-text-primary]">{notification.title}</span>
            </div>
            <span className="text-[--color-text-secondary]">{notification.body}</span>
            <span className="text-[length:var(--font-desktop-caption-regular-size)] text-[--color-text-muted]">
              {new Date(notification.createdAt).toLocaleString()}
            </span>
          </div>
        );

        return (
          <li key={notification.id} className="border-b border-[--color-border] last:border-b-0 hover:bg-[--color-surface]">
            {notification.linkUrl ? (
              <Link href={notification.linkUrl} onClick={() => onItemClick(notification.id)} className="block">
                {content}
              </Link>
            ) : (
              <button type="button" onClick={() => onItemClick(notification.id)} className="block w-full text-left">
                {content}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
