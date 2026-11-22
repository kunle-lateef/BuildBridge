import { differenceInCalendarDays, differenceInHours, differenceInMinutes, format, isToday } from 'date-fns';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Bell, Check, CheckCircle2, CircleDashed, Flag, XCircle } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import type { NotificationType } from '@/lib/types';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  handoffName: string | null;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationListProps = {
  notifications: NotificationItem[];
  onItemClick: (id: string) => void;
  /** The dropdown caps its own height and scrolls internally; a dedicated page has no such constraint. */
  scrollable?: boolean;
  /** The page splits the list into "Today" and "Earlier" (Figma `07 — Notifications`). */
  grouped?: boolean;
  /** Shown when the list is empty. */
  empty?: ReactNode;
};

const TYPE_ICON: Record<NotificationType, ReactNode> = {
  AnalysisRunCompleted: <CheckCircle2 aria-hidden="true" size={16} />,
  AnalysisRunPartiallyCompleted: <CircleDashed aria-hidden="true" size={16} />,
  AnalysisRunFailed: <XCircle aria-hidden="true" size={16} className="text-[--color-error]" />,
  DeveloperFlagReceived: <Flag aria-hidden="true" size={16} />,
  ImplementationMarked: <Check aria-hidden="true" size={16} />,
};

/** "40 min ago", "3 hrs ago", "Yesterday", "2 days ago", then a date. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const minutes = differenceInMinutes(now, date);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (isToday(date)) {
    const hours = differenceInHours(now, date);
    return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`;
  }
  const days = differenceInCalendarDays(now, date);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return format(date, 'MMM d');
}

export function NotificationList({ notifications, onItemClick, scrollable = true, grouped = false, empty }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      empty ?? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <Bell aria-hidden="true" size={18} className="text-[--color-text-secondary]" />
          <span className="text-[14px] font-medium leading-5 text-[--color-text-primary]">No notifications yet</span>
        </div>
      )
    );
  }

  const groups = grouped
    ? [
        { label: 'Today', items: notifications.filter((n) => isToday(new Date(n.createdAt))) },
        { label: 'Earlier', items: notifications.filter((n) => !isToday(new Date(n.createdAt))) },
      ].filter((group) => group.items.length > 0)
    : [{ label: null, items: notifications }];

  return (
    <div className={scrollable ? 'flex max-h-96 flex-col overflow-y-auto' : 'flex flex-col'}>
      {groups.map((group) => (
        <section key={group.label ?? 'all'} aria-label={group.label ?? undefined}>
          {group.label && (
            <h2 className="m-0 border-b border-[--color-border] bg-[--color-background] px-4 py-2.5 text-[12px] font-medium leading-4 text-[--color-text-secondary] [section+section_&]:border-t">
              {group.label}
            </h2>
          )}
          <ul className="m-0 flex list-none flex-col p-0">
            {group.items.map((notification) => (
              <Row key={notification.id} notification={notification} onItemClick={onItemClick} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({ notification, onItemClick }: { notification: NotificationItem; onItemClick: (id: string) => void }) {
  const isUnread = !notification.readAt;
  const content = (
    <div className="flex items-start gap-3 py-4 pl-3 pr-4">
      <span aria-hidden="true" className={cn('mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full', isUnread ? 'bg-[--color-primary]' : 'bg-transparent')} />
      <span className="mt-0.5 shrink-0 text-[--color-text-secondary]">{TYPE_ICON[notification.type]}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-[14px] font-medium leading-5 text-[--color-text-primary]">
            {isUnread && <span className="sr-only">Unread: </span>}
            {notification.title}
          </span>
          <time dateTime={notification.createdAt} className="shrink-0 text-[12px] leading-4 text-[--color-text-secondary]">
            {relativeTime(notification.createdAt)}
          </time>
        </span>
        <span className="text-[14px] leading-5 text-[--color-text-body]">{notification.body}</span>
        {notification.handoffName && (
          <span className="text-[12px] leading-4 text-[--color-primary] underline">{notification.handoffName}</span>
        )}
      </span>
    </div>
  );

  return (
    <li className="border-b border-[--color-border] last:border-b-0 hover:bg-[--color-background]">
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
}
