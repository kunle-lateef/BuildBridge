import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AuthLayout } from '@/components/marketing/AuthLayout';

import { SignInForm } from './SignInForm';

export const metadata: Metadata = {
  title: 'Sign in — BuildBridge',
};

export default function SignInPage() {
  return (
    <AuthLayout title="Sign in to BuildBridge" panel="share">
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </AuthLayout>
  );
}
