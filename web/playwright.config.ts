import { readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3001);

/**
 * The Next server loads web/.env.local itself; the test workers need the
 * same values for direct Supabase assertions. Real env wins when set (CI
 * secrets); otherwise fall back to the gitignored local file.
 */
for (const line of readEnvLocal()) {
  const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
  if (match?.[1] && process.env[match[1]] === undefined) {
    process.env[match[1]] = match[2];
  }
}

function readEnvLocal(): string[] {
  try {
    return readFileSync(new URL('./.env.local', import.meta.url), 'utf8').split(
      /\r?\n/,
    );
  } catch {
    return [];
  }
}

/**
 * Smoke tests run against the dev Supabase project (web/.env.local).
 * Port 3001 avoids clashing with a developer's `npm run dev` on 3000.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
