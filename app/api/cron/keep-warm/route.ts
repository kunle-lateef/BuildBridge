import IORedis from 'ioredis';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * Pings Postgres and Redis on a schedule (see vercel.json) so neither free
 * tier auto-pauses/deletes from inactivity, the way both did in production
 * on 2026-11-07. Not a real health check for alerting — just enough
 * traffic to count as "active" to Supabase and Redis Cloud.
 */
export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json(
      { ok: false, error: { code: 'unauthenticated', message: 'Unauthorized.' } },
      { status: 401 },
    );
  }

  const results = { db: false, redis: false };

  try {
    await db.$queryRaw`SELECT 1`;
    results.db = true;
  } catch (error) {
    logger.error('cron.keep_warm.db_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const redis = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });

  try {
    await redis.ping();
    results.redis = true;
  } catch (error) {
    logger.error('cron.keep_warm.redis_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    redis.disconnect();
  }

  logger.info('cron.keep_warm.completed', results);

  return NextResponse.json({ ok: true, data: results });
}
