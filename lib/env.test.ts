import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const REQUIRED_ENV = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  ANTHROPIC_API_KEY: 'sk-ant-test',
  AUTH_SECRET: 'test-secret',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  STORAGE_ACCESS_KEY: 'test-access-key',
  STORAGE_SECRET_KEY: 'test-secret-key',
  STORAGE_BUCKET: 'test-bucket',
  STORAGE_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
};

describe('lib/env', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('loads successfully when all required variables are present', async () => {
    process.env = { ...process.env, ...REQUIRED_ENV };

    const { env } = await import('./env');

    expect(env.DATABASE_URL).toBe(REQUIRED_ENV.DATABASE_URL);
    expect(env.NEXT_PUBLIC_APP_URL).toBe(REQUIRED_ENV.NEXT_PUBLIC_APP_URL);
  });

  it('throws with a descriptive message when a required variable is missing', async () => {
    process.env = { ...process.env, ...REQUIRED_ENV };
    delete process.env.ANTHROPIC_API_KEY;

    await expect(import('./env')).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });

  it('throws when a variable expected to be a URL is not one', async () => {
    process.env = { ...process.env, ...REQUIRED_ENV, REDIS_URL: 'not-a-url' };

    await expect(import('./env')).rejects.toThrow(/REDIS_URL/);
  });
});
