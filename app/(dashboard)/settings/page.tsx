import { addMonths } from 'date-fns';
import type { Metadata } from 'next';

import { QuotaUsageDisplay } from '@/components/dashboard/QuotaUsageDisplay';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

import { signOutEverywhere } from './actions';

export const metadata: Metadata = {
  title: 'Settings — BuildBridge',
};

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
        Settings
      </h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-[--color-text-primary]">Account</h2>
        <p className="text-[--color-text-secondary]">{user.email}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[--color-text-primary]">Usage</h2>
        <QuotaUsageDisplay
          used={user.analysisUsageCount}
          quota={user.analysisQuota}
          planTier={user.planTier}
          cycleResetsAt={addMonths(user.billingCycleStart, 1).toISOString()}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[--color-text-primary]">Security</h2>
        <div className="flex flex-col gap-1.5">
          <p className="text-[--color-text-secondary]">
            Signs out every device currently signed in as you, including this one.
          </p>
          <form action={signOutEverywhere}>
            <button
              type="submit"
              className="self-start rounded-[--radius-md] border border-[--color-border] px-3 py-1.5 text-[--color-text-body] hover:bg-[--color-surface] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
            >
              Sign out everywhere
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
