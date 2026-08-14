import { PrismaClient } from '@prisma/client';

// Singleton Prisma client. Never instantiate `new PrismaClient()` anywhere
// else — multiple clients exhaust the connection pool in development, where
// Next.js's module hot-reloading would otherwise create a new client on
// every edit. See .agents/rules/architecture.md's Database Access section.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
