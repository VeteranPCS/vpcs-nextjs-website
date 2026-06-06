import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'server-only': path.resolve(__dirname, 'evals/lib/server-only-stub.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['evals/**/*.eval.ts'],
    exclude: ['node_modules', '.next', 'public'],
    setupFiles: ['evals/lib/setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
