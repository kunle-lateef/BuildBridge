import type { Metadata } from 'next';
import Link from 'next/link';

import { SignUpForm } from './SignUpForm';

export const metadata: Metadata = {
  title: 'Sign up — BuildBridge',
};

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
          Create your account
        </h1>
        <p className="mt-2 text-[--color-text-secondary]">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-[--color-primary] underline">
            Sign in
          </Link>{' '}
          or{' '}
          <Link href="/forgot-password" className="text-[--color-primary] underline">
            reset your password
          </Link>
          .
        </p>
      </div>
      <SignUpForm />
    </main>
  );
}
