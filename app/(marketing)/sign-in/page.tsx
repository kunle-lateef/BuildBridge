import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';


import { SignInForm } from './SignInForm';

export const metadata: Metadata = {
  title: 'Sign in — BuildBridge',
};

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
          Sign in
        </h1>
        <p className="mt-2 text-[--color-text-secondary]">
          Don&apos;t have an account?{' '}
          <Link href="/sign-up" className="text-[--color-primary] underline">
            Create one
          </Link>
        </p>
      </div>
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </main>
  );
}
