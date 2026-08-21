import type { Metadata } from 'next';

import { AuthLayout } from '@/components/marketing/AuthLayout';

import { SignUpForm } from './SignUpForm';

export const metadata: Metadata = {
  title: 'Sign up — BuildBridge',
};

export default function SignUpPage() {
  return (
    <AuthLayout
      title="See what's actually confirmed"
      description="Review AI findings labeled by confidence, before a developer ever sees them."
    >
      <SignUpForm />
    </AuthLayout>
  );
}
