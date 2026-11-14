import 'dotenv/config';

/**
 * Single source of truth for runtime config.
 * Values come from env vars (.env locally, CI secrets in a pipeline) with safe defaults
 * because the target site is a public practice site.
 */
const PREFIX_PATTERN = /^[a-z0-9]{3,12}$/;

function readPrefix(): string {
  const prefix = process.env.TEST_DATA_PREFIX ?? 'qashow';
  // Cleanup deletes by prefix, so a weak prefix could delete data we did not create.
  if (!PREFIX_PATTERN.test(prefix)) {
    throw new Error(`TEST_DATA_PREFIX must match ${PREFIX_PATTERN}, got "${prefix}"`);
  }
  return prefix;
}

export const env = {
  baseUrl: process.env.BASE_URL ?? 'https://demoqa.com',
  dataPrefix: readPrefix(),
  dbPath: process.env.DB_PATH ?? './test-data.db',
} as const;
