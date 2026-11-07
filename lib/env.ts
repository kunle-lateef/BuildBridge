import { z } from 'zod';

/**
 * Validates required environment variables at boot. The app refuses to
 * start rather than run in a half-configured state — see
 * .agents/rules/security.md's Secrets and Configuration section.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  ANTHROPIC_API_KEY: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_ENDPOINT: z.string().url(),
  // Password-reset emails only — see lib/email.ts. Never exposed to the
  // client.
  RESEND_API_KEY: z.string().min(1),
  // Authenticates app/api/cron/keep-warm's GET requests — Vercel sends
  // this as a Bearer token automatically when a Cron Job hits a route on a
  // project that has this var set. Optional locally; no cron runs in dev.
  CRON_SECRET: z.string().optional(),
  // Dev-only switch: routes lib/ai/client.ts to canned fixture responses
  // instead of calling Anthropic — see the implementation plan's Fixture /
  // Mock Strategy section. Optional; defaults to off (real API calls).
  USE_AI_FIXTURES: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
});

type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return parsed.data;
}

export const env = loadEnv();
