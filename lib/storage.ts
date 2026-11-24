import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NodeHttpHandler } from '@smithy/node-http-handler';

import { env } from '@/lib/env';

// Without an explicit timeout, a hung R2 connection blocks whichever
// request called into it (e.g. recordUpload's synchronous getObjectBytes)
// indefinitely — the SDK has no default request timeout of its own.
const REQUEST_TIMEOUT_MS = 30_000;
const CONNECTION_TIMEOUT_MS = 10_000;

// Cloudflare R2, accessed through its S3-compatible API — see
// .agents/rules/security.md's Secrets and Configuration section for why
// STORAGE_ENDPOINT is required here (a non-AWS provider) where plain AWS S3
// wouldn't need it. forcePathStyle avoids virtual-hosted-style addressing
// (bucket.endpoint/key), which depends on the provider supporting wildcard
// subdomain DNS — path-style (endpoint/bucket/key) works universally across
// S3-compatible providers, R2 included, and is required for a local dev
// backend like MinIO that has no such DNS.
const client = new S3Client({
  region: 'auto',
  endpoint: env.STORAGE_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.STORAGE_ACCESS_KEY,
    secretAccessKey: env.STORAGE_SECRET_KEY,
  },
  maxAttempts: 3,
  requestHandler: new NodeHttpHandler({
    requestTimeout: REQUEST_TIMEOUT_MS,
    connectionTimeout: CONNECTION_TIMEOUT_MS,
  }),
});

const UPLOAD_URL_EXPIRY_SECONDS = 5 * 60;
const READ_URL_EXPIRY_SECONDS = 15 * 60;

/**
 * A short-lived signed PUT URL the client uploads directly to, so raw
 * design-asset bytes never pass through the app server on the way in.
 */
export function createSignedUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS });
}

/**
 * A short-lived signed GET URL for displaying an asset in the UI. The
 * bucket is never made publicly readable — see security.md's "serve from
 * the storage provider's domain or a CDN" combined with the fact that
 * design assets are confidential business material by default.
 */
export function createSignedReadUrl(key: string): Promise<string> {
  const exampleFile = exampleAssetFile(key);
  if (exampleFile) return Promise.resolve(`/example/${exampleFile}`);
  const command = new GetObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key });
  return getSignedUrl(client, command, { expiresIn: READ_URL_EXPIRY_SECONDS });
}

/** Fetches an object's bytes server-side — used for post-upload validation and to hand image data to the Claude API. */
export async function getObjectBytes(key: string): Promise<Buffer> {
  const exampleFile = exampleAssetFile(key);
  if (exampleFile) return readFile(path.join(process.cwd(), 'public', 'example', exampleFile));
  const command = new GetObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key });
  const response = await client.send(command);
  const byteArray = await response.Body?.transformToByteArray();

  if (!byteArray) {
    throw new Error(`Object not found in storage: ${key}`);
  }

  return Buffer.from(byteArray);
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await client.send(command);
}

export async function deleteObject(key: string): Promise<void> {
  // The example's screens are shared, committed files: never deleted.
  if (exampleAssetFile(key)) return;
  const command = new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key });
  await client.send(command);
}

/**
 * The example handoff's screens are committed files under public/example/,
 * shared by every copy, so its assets point there instead of the bucket:
 * "example:checkout.png". Only lib/example/create.ts writes such a
 * reference; the file name is checked against a strict pattern so a
 * reference can never reach outside public/example/.
 */
export const EXAMPLE_ASSET_PREFIX = 'example:';

export function exampleAssetFile(key: string): string | null {
  if (!key.startsWith(EXAMPLE_ASSET_PREFIX)) return null;
  const file = key.slice(EXAMPLE_ASSET_PREFIX.length);
  return /^[a-z-]+\.png$/.test(file) ? file : null;
}
