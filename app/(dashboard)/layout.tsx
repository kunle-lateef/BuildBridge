import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth, signOut } from '@/lib/auth';

// Middleware already gates every path under this group, but a layout that
// assumes a session without checking it is exactly the kind of implicit
// trust architecture.md warns against — check explicitly rather than rely
// solely on the route-level gate.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen">
      <header className="flex h-16 items-center justify-between border-b border-[--color-border] px-6">
        <Link href="/handoffs" className="flex items-center gap-2">
          <Image src="/logo/buildbridge-logo.svg" alt="BuildBridge" width={28} height={28} />
        </Link>

        <div className="flex items-center gap-4">
          <span className="text-[--color-text-secondary]">{session.user.email}</span>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/' });
            }}
          >
            <button
              type="submit"
              className="rounded-[--radius-md] border border-[--color-border] px-3 py-1.5 text-[--color-text-body] hover:bg-[--color-surface] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
