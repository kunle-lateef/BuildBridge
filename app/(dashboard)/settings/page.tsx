import type { Metadata } from 'next';

import { ChangePasswordForm } from '@/components/dashboard/ChangePasswordForm';
import { DeleteAccountButton } from '@/components/dashboard/DeleteAccountButton';
import { EditProfileForm } from '@/components/dashboard/EditProfileForm';
import { EmailNotificationsToggle } from '@/components/dashboard/EmailNotificationsToggle';
import { QuotaUsageDisplay } from '@/components/dashboard/QuotaUsageDisplay';
import { SettingsRow, SettingsTabs } from '@/components/dashboard/SettingsTabs';
import { SignOutEverywhereButton } from '@/components/dashboard/SignOutEverywhereButton';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { summarizeUsage } from '@/lib/plan-limits';

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

/** Figma `06 — Settings`: Account, Notifications and Security tabs, each a stack of labelled rows. */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const userId = session.user.id;
  const [user, handoffs, activeShareLinks] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.handoff.findMany({ where: { ownerId: userId }, select: { status: true, isExample: true } }),
    db.shareLink.count({
      where: {
        status: 'Active',
        handoff: { ownerId: userId },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    }),
  ]);

  const archivedHandoffs = handoffs.filter((handoff) => handoff.status === 'Archived').length;
  const activeHandoffs = handoffs.length - archivedHandoffs;
  // The example handoff never counts toward the active-handoff cap.
  const usage = summarizeUsage(user, handoffs.filter((handoff) => handoff.status !== 'Archived' && !handoff.isExample).length);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="m-0 text-[28px] font-semibold leading-9 text-[--color-text-primary]">Settings</h1>

      <SettingsTabs
        initialId={tab}
        tabs={[
          {
            id: 'account',
            label: 'Account',
            content: (
              <>
                <SettingsRow title="Profile" description="Shown in your account menu. Developers on a share link never see it.">
                  <EditProfileForm initialName={user.name ?? ''} email={user.email} action={updateProfile} />
                </SettingsRow>
                <SettingsRow
                  title="Plan and usage"
                  description="Analyses reset each billing cycle. Running analysis again on a handoff that hasn’t changed doesn’t use one."
                >
                  <QuotaUsageDisplay {...usage} />
                </SettingsRow>
              </>
            ),
          },
          {
            id: 'notifications',
            label: 'Notifications',
            content: (
              <SettingsRow title="Email" description="In-app notifications are always on. Choose whether we also email you.">
                <EmailNotificationsToggle
                  initialEnabled={user.emailNotificationsEnabled}
                  action={updateEmailNotificationsPreference}
                />
              </SettingsRow>
            ),
          },
          {
            id: 'security',
            label: 'Security',
            content: (
              <>
                <SettingsRow
                  title="Password"
                  description="Use at least 8 characters, with an uppercase letter, a number and a special character."
                >
                  <ChangePasswordForm action={changePassword} />
                </SettingsRow>
                <SettingsRow title="Sessions" description="Signed in somewhere you don’t recognize? End every session at once.">
                  <p className="m-0 text-[14px] leading-5 text-[--color-text-body]">
                    This signs out every device signed in as you, including this one.
                  </p>
                  <SignOutEverywhereButton action={signOutEverywhere} />
                </SettingsRow>
                <SettingsRow
                  title="Delete account"
                  isDanger
                  description="Permanently deletes your account and every handoff you own: screens, analysis, notes and share links. This can’t be undone."
                >
                  <DeleteAccountButton
                    action={deleteAccount}
                    activeHandoffs={activeHandoffs}
                    archivedHandoffs={archivedHandoffs}
                    activeShareLinks={activeShareLinks}
                  />
                </SettingsRow>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
