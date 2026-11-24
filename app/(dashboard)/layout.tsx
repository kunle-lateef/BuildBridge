import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DashboardChrome } from '@/components/dashboard/DashboardChrome';
import { MobileSidebarProvider } from '@/components/dashboard/MobileSidebarProvider';
import { MobileSidebarToggle } from '@/components/dashboard/MobileSidebarToggle';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { Sidebar, type SidebarUsage } from '@/components/dashboard/Sidebar';
import { BrandMark } from '@/components/ui/BrandMark';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { auth, signOut } from '@/lib/auth';
import { db } from '@/lib/db';
import { listNotifications } from '@/lib/notifications';
import { summarizeUsage } from '@/lib/plan-limits';

// Middleware already gates every path under this group, but a layout that
// assumes a session without checking it is exactly the kind of implicit
// trust architecture.md warns against — check explicitly rather than rely
// solely on the route-level gate.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/sign-in');
  }

  const [notifications, handoffs, user] = await Promise.all([
    listNotifications(session.user.id, { limit: 20 }),
    db.handoff.findMany({
      where: { ownerId: session.user.id, status: { not: 'Archived' } },
      select: { id: true, name: true, isExample: true },
      orderBy: { updatedAt: 'desc' },
    }),
    db.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { planTier: true, analysisQuota: true, analysisUsageCount: true, billingCycleStart: true },
    }),
  ]);

  async function handleSignOut() {
    'use server';
    await signOut({ redirectTo: '/' });
  }

  // The example handoff never counts toward the active-handoff cap.
  const activeCount = handoffs.filter((handoff) => !handoff.isExample).length;
  const usage: SidebarUsage = summarizeUsage(user, activeCount);

  const bellNotifications = notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    handoffName: notification.handoff?.name ?? null,
    linkUrl: notification.linkUrl,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  }));

  return (
    <ToastProvider>
      <MobileSidebarProvider>
        <div className="flex min-h-screen bg-[--color-background]">
          <Sidebar
            userName={session.user.name ?? session.user.email ?? ''}
            userEmail={session.user.email ?? ''}
            signOutAction={handleSignOut}
            handoffCount={activeCount}
            usage={usage}
            search={<DashboardChrome handoffs={handoffs} />}
            bell={<NotificationBell notifications={bellNotifications} align="left" />}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            {/* Phones only: the sidebar is a drawer, so its logo and bell live up here. */}
            <header className="sticky top-0 z-20 flex h-[57px] shrink-0 items-center justify-between gap-3 border-b border-[--color-border] bg-white px-4 lg:hidden">
              <div className="flex items-center gap-2">
                <MobileSidebarToggle />
                <Link href="/handoffs">
                  <BrandMark alt="BuildBridge" size={24} />
                </Link>
              </div>
              <NotificationBell notifications={bellNotifications} />
            </header>

            {/* 24px padding beside the icon rail, 40px with the full sidebar (Figma 1280 / 1440). */}
            <main className="w-full px-5 py-8 lg:p-6 min-[1440px]:px-10 min-[1440px]:py-10">{children}</main>
          </div>
        </div>
      </MobileSidebarProvider>
    </ToastProvider>
  );
}
