import type { Metadata } from 'next';

import { AuthLayout } from '@/components/marketing/AuthLayout';

import { ResetLinkExpired, ResetPasswordForm } from './ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Reset password — BuildBridge',
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return <AuthLayout>{token ? <ResetPasswordForm token={token} /> : <ResetLinkExpired />}</AuthLayout>;
}
