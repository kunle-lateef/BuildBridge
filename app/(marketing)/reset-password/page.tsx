import type { Metadata } from 'next';
import Link from 'next/link';


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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
          Set a new password
        </h1>
      </div>

      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-[--color-text-secondary]">
          This link is missing its reset token.{' '}
          <Link href="/forgot-password" className="text-[--color-primary] underline">
            Request a new one
          </Link>
          .
        </p>
      )}
    </main>
  );
}
