'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { createExampleHandoff } from '@/lib/example/create';

/**
 * "Open the example" on the empty dashboard (Figma `03 — Dashboard / First
 * run`). Creates the signed-in user's copy of the example handoff, or
 * opens the one they already have, then goes to it.
 */
export async function openExampleHandoff(): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const { handoffId } = await createExampleHandoff(session.user.id);
  revalidatePath('/handoffs');
  redirect(`/handoffs/${handoffId}`);
}
