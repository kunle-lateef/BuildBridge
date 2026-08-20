import type { Metadata } from 'next';

import { AuthLayout } from '@/components/marketing/AuthLayout';

import { ForgotPasswordForm } from './ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Forgot password — BuildBridge',
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Forgot your password?"
      description="Enter the email on your account and we'll send you a reset link."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
