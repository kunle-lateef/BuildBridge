import { addMonths } from 'date-fns';
import { AlertTriangle, Bell, Settings as SettingsIcon, Shield, User } from 'lucide-react';
import type { Metadata } from 'next';

import { ChangePasswordForm } from '@/components/dashboard/ChangePasswordForm';
import { DeleteAccountButton } from '@/components/dashboard/DeleteAccountButton';
import { EditProfileForm } from '@/components/dashboard/EditProfileForm';
import { EmailNotificationsToggle } from '@/components/dashboard/EmailNotificationsToggle';
import { QuotaUsageDisplay } from '@/components/dashboard/QuotaUsageDisplay';
import { SettingsTabs } from '@/components/dashboard/SettingsTabs';
import { SignOutEverywhereButton } from '@/components/dashboard/SignOutEverywhereButton';
import { Card } from '@/components/ui/Card';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

import {
  changePassword,
  deleteAccount,
  signOutEverywhere,
  updateEmailNotificationsPreference,
  updateProfile,
} from './actions';

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
      <h1 className="flex items-center gap-3 text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
        <SettingsIcon aria-hidden="true" size={26} className="text-[--color-primary]" />
        Settings
      </h1>

      <SettingsTabs
        tabs={[
          {
            id: 'account',
            label: 'Account',
            content: (
              <div className="flex flex-col gap-8">
                <section className="flex flex-col gap-3">
                  <h2 className="flex items-center gap-2 text-[--color-text-primary]">
                    <User aria-hidden="true" size={18} className="text-[--color-text-secondary]" />
                    Account
                  </h2>
                  <Card className="flex flex-col gap-4">
                    <EditProfileForm initialName={user.name ?? ''} action={updateProfile} />
                    {/* Email is deliberately read-only for now — it's also the sign-in
                        credential, so changing it needs its own verification step
                        (confirm the new address before it takes effect) rather than a
                        plain text field. */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[--color-text-body]">Email</span>
                      <p className="text-[--color-text-secondary]">{user.email}</p>
                    </div>
                  </Card>
                </section>

                <section className="flex flex-col gap-3">
                  <h2 className="flex items-center gap-2 text-[--color-text-primary]">
                    <SettingsIcon aria-hidden="true" size={18} className="text-[--color-text-secondary]" />
                    Usage
                  </h2>
                  <QuotaUsageDisplay
                    used={user.analysisUsageCount}
                    quota={user.analysisQuota}
                    planTier={user.planTier}
                    cycleStartsAt={user.billingCycleStart.toISOString()}
                    cycleResetsAt={addMonths(user.billingCycleStart, 1).toISOString()}
                  />
                </section>
              </div>
            ),
          },
          {
            id: 'notifications',
            label: 'Notifications',
            content: (
              <section className="flex flex-col gap-3">
                <h2 className="flex items-center gap-2 text-[--color-text-primary]">
                  <Bell aria-hidden="true" size={18} className="text-[--color-text-secondary]" />
                  Notifications
                </h2>
                <Card>
                  <EmailNotificationsToggle
                    initialEnabled={user.emailNotificationsEnabled}
                    action={updateEmailNotificationsPreference}
                  />
                </Card>
              </section>
            ),
          },
          {
            id: 'security',
            label: 'Security',
            content: (
              <div className="flex flex-col gap-8">
                <section className="flex flex-col gap-3">
                  <h2 className="flex items-center gap-2 text-[--color-text-primary]">
                    <Shield aria-hidden="true" size={18} className="text-[--color-text-secondary]" />
                    Security
                  </h2>
                  <Card className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3">
                      <span className="text-[--color-text-body]">Change password</span>
                      <ChangePasswordForm action={changePassword} />
                    </div>
                    <div className="flex flex-col gap-1.5 border-t border-[--color-border] pt-4">
                      <p className="text-[--color-text-secondary]">
                        Signs out every device currently signed in as you, including this one.
                      </p>
                      <SignOutEverywhereButton action={signOutEverywhere} />
                    </div>
                  </Card>
                </section>

                <section className="flex flex-col gap-3">
                  <h2 className="flex items-center gap-2 text-[--color-error]">
                    <AlertTriangle aria-hidden="true" size={18} />
                    Danger zone
                  </h2>
                  <Card className="flex flex-col gap-1.5">
                    <p className="text-[--color-text-secondary]">
                      Permanently deletes your account and every handoff you own. This cannot be undone.
                    </p>
                    <DeleteAccountButton action={deleteAccount} />
                  </Card>
                </section>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
