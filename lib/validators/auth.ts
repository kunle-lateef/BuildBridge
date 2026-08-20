import { z } from 'zod';

export const signUpSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.').max(100),
    email: z.string().trim().email('Enter a valid email address.'),
    // 72 bytes is bcrypt's own input limit — bounding it here keeps the
    // validation error in front of the user instead of a silent truncation.
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(72, 'Password must be at most 72 characters.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  // No length bound here beyond "present" — min(8) at sign-in would let an
  // attacker distinguish "wrong length" from "wrong password" for a valid
  // account; that check belongs only where a password is being set.
  password: z.string().min(1, 'Password is required.'),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
});

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(72, 'Password must be at most 72 characters.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
