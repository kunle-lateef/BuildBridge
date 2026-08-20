# syntax=docker/dockerfile:1

# Standalone image for workers/analysis-worker.ts — the persistent BullMQ
# consumer for the 5-stage AI analysis pipeline. This does NOT run on
# Vercel: Vercel's serverless functions are request-scoped and can't host a
# long-lived queue consumer, but the worker needs to sit and wait on Redis
# indefinitely (see architecture.md's AI Processing section for why the
# pipeline is queue-based rather than a blocking request/response call).
#
# This image is deployed separately from the Next.js app — to whatever
# platform supports a persistent process (Railway, Render, Fly.io, a plain
# VPS, etc.; not yet decided, see architecture.md). It must be given the
# same production REDIS_URL and DATABASE_URL as the Vercel-hosted app, plus
# every other var lib/env.ts validates at boot (ANTHROPIC_API_KEY,
# STORAGE_*, etc. — see .env.example and security.md's Secrets and
# Configuration section). Build and run from the repo root:
#
#   docker build -f workers/Dockerfile -t buildbridge-worker .
#   docker run --env-file .env buildbridge-worker

FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY lib ./lib
COPY workers ./workers

CMD ["npm", "run", "worker:start"]
