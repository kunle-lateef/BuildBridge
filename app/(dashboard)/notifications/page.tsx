import type { Metadata } from 'next';

import { NotificationsPageList } from '@/components/dashboard/NotificationsPageList';
import { auth } from '@/lib/auth';
import { listNotifications } from '@/lib/notifications';

export const metadata: Metadata = {
  title: 'Notifications — BuildBridge',
};

// The bell dropdown caps at 20 with no way to see past it — this is that
// escape hatch, so a higher ceiling here is the whole point. Still a cap,
// not true pagination, since nothing in this codebase's notification volume
// today justifies building pagination for a list this size.
const PAGE_LIMIT = 100;

export default async function NotificationsPage() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const notifications = await listNotifications(session.user.id, { limit: PAGE_LIMIT });

  return (
    <NotificationsPageList
      notifications={notifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        handoffName: notification.handoff?.name ?? null,
        linkUrl: notification.linkUrl,
        readAt: notification.readAt?.toISOString() ?? null,
        createdAt: notification.createdAt.toISOString(),
      }))}
    />
  );
}
