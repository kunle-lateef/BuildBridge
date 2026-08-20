import Redis from 'ioredis';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

/** Dev-only fixed-window limiter. State is lost on process restart. */
class InMemoryStore implements RateLimitStore {
  private hits = new Map<string, { count: number; resetAt: number }>();

  async increment(key: string, windowMs: number) {
    const now = Date.now();
    const existing = this.hits.get(key);

    if (!existing || existing.resetAt <= now) {
      const entry = { count: 1, resetAt: now + windowMs };
      this.hits.set(key, entry);
      return entry;
    }

    existing.count += 1;
    return existing;
  }
}

/** Redis-backed fixed-window limiter, shared across all server instances. */
class RedisStore implements RateLimitStore {
  private client: Redis;

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
    this.client.on('error', (error: Error) => {
      logger.error('rate_limit.redis_error', { error: error.message });
    });
  }

  async increment(key: string, windowMs: number) {
    const windowSeconds = Math.ceil(windowMs / 1000);
    const count = await this.client.incr(key);

    if (count === 1) {
      await this.client.expire(key, windowSeconds);
    }

    const ttl = await this.client.ttl(key);
    const resetAt = Date.now() + Math.max(ttl, 0) * 1000;

    return { count, resetAt };
  }
}

const store: RateLimitStore =
  process.env.NODE_ENV === 'production' ? new RedisStore(env.REDIS_URL) : new InMemoryStore();

/**
 * Best-effort client IP from the `x-forwarded-for` header set by the
 * platform's reverse proxy — used only as a rate-limit key, never trusted
 * for anything security-critical like access control. Shared between
 * middleware.ts (the authenticated-route matcher) and any route handler on
 * the public, unauthenticated share-link boundary that needs an IP-scoped
 * limit of its own (e.g. app/api/share/[token]/flags/route.ts).
 */
export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

/**
 * Fixed-window rate limiter. `key` should uniquely identify the actor plus
 * the action being limited, e.g. `login:${ip}` or `analysis-run:${userId}`.
 * See .agents/rules/security.md's Rate Limiting section for which routes
 * and actions this is required on.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const { count, resetAt } = await store.increment(key, windowMs);

  return {
    success: count <= limit,
    limit,
    remaining: Math.max(limit - count, 0),
    resetAt,
  };
}
