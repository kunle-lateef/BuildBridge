// Loads .env before any test module imports lib/env.ts — tests that mock
// away everything touching env.ts (e.g. lib/share.test.ts, which mocks
// lib/db and lib/storage) don't need this, but any test that imports a
// module transitively depending on the real lib/db.ts, lib/storage.ts, or
// lib/queue.ts does. Centralized here rather than per-test-file so this
// doesn't have to be remembered every time.
import 'dotenv/config';
