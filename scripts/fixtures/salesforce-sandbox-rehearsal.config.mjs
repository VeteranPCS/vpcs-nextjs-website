import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const require = createRequire(import.meta.url);

export default defineConfig({
    envDir: false,
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('../..', import.meta.url)),
            'server-only': join(dirname(require.resolve('server-only')), 'empty.js'),
        },
    },
    test: {
        include: ['scripts/fixtures/salesforce-sandbox-rehearsal.test.ts'],
        testTimeout: 90_000,
        hookTimeout: 45_000,
    },
});
