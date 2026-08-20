import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthLayout } from '@/components/marketing/AuthLayout';

import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Reset password — BuildBridge',
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <AuthLayout title="Set a new password">
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-center text-[--color-text-secondary]">
          This link is missing its reset token.{' '}
          <Link href="/forgot-password" className="text-[--color-primary] underline">
            Request a new one
          </Link>
          .
        </p>
      )}
    </AuthLayout>
  );
}
