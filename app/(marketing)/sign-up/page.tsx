import type { Metadata } from 'next';

import { AuthLayout } from '@/components/marketing/AuthLayout';

import { SignUpForm } from './SignUpForm';

export const metadata: Metadata = {
  title: 'Sign up — BuildBridge',
};

export default function SignUpPage() {
  return (
    <AuthLayout title="Create your account" description="Next, you’ll create your first handoff." panel="proof">
      <SignUpForm />
    </AuthLayout>
  );
}
