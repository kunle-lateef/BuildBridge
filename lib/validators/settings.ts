import { z } from 'zod';

// Same constraint as signUpSchema's name field — one person, one display
// name, no separate "profile name" concept in the schema.
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(100),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// currentPassword has no length/complexity bound beyond "present" — same
// reasoning as signInSchema's password field (see lib/validators/auth.ts):
// a min-length check here would let an attacker distinguish "wrong length"
// from "wrong password" for an account they don't otherwise control.
// newPassword mirrors signUpSchema/resetPasswordSchema's real rule.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(72, 'Password must be at most 72 characters.'),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match.',
    path: ['confirmNewPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
