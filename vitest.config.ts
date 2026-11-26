import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  envDir: false,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./scripts/lib/mock-network-preload.cjs'],
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', '.next-mock', '.next-sandbox', 'public'],
  },
});
