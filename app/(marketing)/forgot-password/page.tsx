import type { Metadata } from 'next';

import { ForgotPasswordForm } from './ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Forgot password — BuildBridge',
};

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
          Reset your password
        </h1>
        <p className="mt-2 text-[--color-text-secondary]">
          Enter the email on your account and we&apos;ll send you a reset link.
        </p>
      </div>
      <ForgotPasswordForm />
    </main>
  );
}
