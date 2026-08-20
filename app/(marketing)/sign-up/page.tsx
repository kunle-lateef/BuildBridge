import type { Metadata } from 'next';

import { AuthLayout } from '@/components/marketing/AuthLayout';

import { SignUpForm } from './SignUpForm';

export const metadata: Metadata = {
  title: 'Sign up — BuildBridge',
};

export default function SignUpPage() {
  return (
    <AuthLayout title="Welcome!" description="Create an account to get started.">
      <SignUpForm />
    </AuthLayout>
  );
}
