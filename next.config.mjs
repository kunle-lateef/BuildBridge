// Design assets are served via short-lived signed GET URLs from R2, never a
// public bucket (security.md's File Uploads section) — next/image still
// needs the storage host allow-listed to optimize/serve them. Read directly
// from process.env here rather than lib/env.ts, since this file runs
// outside the app's TypeScript/webpack bundle.
const storageHostname = process.env.STORAGE_ENDPOINT
  ? new URL(process.env.STORAGE_ENDPOINT).hostname
  : undefined;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // These are server-only libraries with dynamic/native requires (BullMQ's
  // optional Redis backends, file-type's dynamic format loading, sharp's
  // native bindings) that webpack can't statically analyze — bundling them
  // produces harmless-but-noisy "critical dependency" warnings. Excluding
  // them from the server bundle means they're require()'d from
  // node_modules at runtime instead, which is what these packages expect.
  serverExternalPackages: ['bullmq', 'ioredis', 'sharp', 'file-type'],
  images: {
    remotePatterns: storageHostname ? [{ protocol: 'https', hostname: storageHostname }] : [],
  },
};

export default nextConfig;
