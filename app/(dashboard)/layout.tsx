import { redirect } from 'next/navigation';

import { DashboardChrome } from '@/components/dashboard/DashboardChrome';
import { MobileSidebarProvider } from '@/components/dashboard/MobileSidebarProvider';
import { MobileSidebarToggle } from '@/components/dashboard/MobileSidebarToggle';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { auth, signOut } from '@/lib/auth';
import { db } from '@/lib/db';
import { listNotifications } from '@/lib/notifications';

// Middleware already gates every path under this group, but a layout that
// assumes a session without checking it is exactly the kind of implicit
// trust architecture.md warns against — check explicitly rather than rely
// solely on the route-level gate.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/sign-in');
  }

  const [notifications, handoffs] = await Promise.all([
    listNotifications(session.user.id, { limit: 20 }),
    db.handoff.findMany({
      where: { ownerId: session.user.id, status: { not: 'Archived' } },
      select: { id: true, name: true },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  async function handleSignOut() {
    'use server';
    await signOut({ redirectTo: '/' });
  }

  return (
    <ToastProvider>
      <MobileSidebarProvider>
        <div className="flex min-h-screen">
          <Sidebar
            userName={session.user.name ?? session.user.email ?? ''}
            userEmail={session.user.email ?? ''}
            signOutAction={handleSignOut}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[--color-border] bg-[--color-background]/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-[--color-background]/80">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <MobileSidebarToggle />
                <DashboardChrome handoffs={handoffs} />
              </div>

              <NotificationBell
                notifications={notifications.map((notification) => ({
                  id: notification.id,
                  type: notification.type,
                  title: notification.title,
                  body: notification.body,
                  linkUrl: notification.linkUrl,
                  readAt: notification.readAt?.toISOString() ?? null,
                  createdAt: notification.createdAt.toISOString(),
                }))}
              />
            </header>

            <main className="mx-auto w-full max-w-5xl px-6 py-10">{children}</main>
          </div>
        </div>
      </MobileSidebarProvider>
    </ToastProvider>
  );
}
