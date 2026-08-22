import { z } from 'zod';

const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
const PASSWORD_NUMBER_REGEX = /[0-9]/;
const PASSWORD_SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/;

/**
 * The single source of truth for sign-up's password strength rules — shared
 * between signUpSchema's own .regex() calls below and
 * PasswordRequirementsChecklist's live per-keystroke UI, so the two can
 * never silently drift apart.
 */
export const PASSWORD_REQUIREMENTS = [
  { label: '8+ characters', test: (value: string) => value.length >= 8 },
  { label: '1 uppercase letter', test: (value: string) => PASSWORD_UPPERCASE_REGEX.test(value) },
  { label: '1 number', test: (value: string) => PASSWORD_NUMBER_REGEX.test(value) },
  { label: '1 special character', test: (value: string) => PASSWORD_SPECIAL_CHAR_REGEX.test(value) },
] as const;

export const signUpSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.').max(100),
    email: z.string().trim().email('Enter a valid email address.'),
    // 72 bytes is bcrypt's own input limit — bounding it here keeps the
    // validation error in front of the user instead of a silent truncation.
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(72, 'Password must be at most 72 characters.')
      .regex(PASSWORD_UPPERCASE_REGEX, 'Password must include at least one uppercase letter.')
      .regex(PASSWORD_NUMBER_REGEX, 'Password must include at least one number.')
      .regex(PASSWORD_SPECIAL_CHAR_REGEX, 'Password must include at least one special character.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const signInSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  // No length bound here beyond "present" — min(8) at sign-in would let an
  // attacker distinguish "wrong length" from "wrong password" for a valid
  // account; that check belongs only where a password is being set.
  password: z.string().min(1, 'Password is required.'),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
});

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
