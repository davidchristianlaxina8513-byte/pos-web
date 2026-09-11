import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Phase 1 tests are pure functions only (no DOM): node env, no setup files.
  // jsdom + @testing-library land with the first component tests (Phase 2).
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
