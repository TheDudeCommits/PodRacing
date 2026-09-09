import { defineConfig } from 'vitest/config';

// Runtime tests live here. Captured/staged source copies in output/ are review
// evidence and must not be rediscovered as a second, incomplete test project.
export default defineConfig({
  test: { include: ['tests/**/*.test.{ts,mjs}'] },
});
