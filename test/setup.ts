// test/setup.ts — Global test setup: env vars + framework mocks
import { vi } from 'vitest';

// Set environment variables before any module imports
process.env.ATTIO_API_KEY = 'test-attio-key';
process.env.ATTIO_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.MAGIC_LINK_SECRET = 'test-magic-link-secret-must-be-at-least-32-chars';
process.env.NEXT_PUBLIC_API_BASE_URL = 'https://test.veteranpcs.com';
process.env.MAGIC_LINK_BASE_URL = 'https://test.veteranpcs.com';
process.env.RESEND_API_KEY = 're_test_key';
process.env.RESEND_FROM_EMAIL = 'VeteranPCS Test <test@veteranpcs.com>';
process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
process.env.OPENPHONE_API_KEY = 'test-openphone-key';
process.env.OPENPHONE_FROM_NUMBER = '+15551234567';
process.env.CRON_SECRET = 'test-cron-secret';
process.env.ATTIO_WORKSPACE_ID = 'test-workspace-id';
process.env.NEXT_PUBLIC_BASE_URL = 'https://test.veteranpcs.com';

// Mock next/cache (used by data loaders and webhook handler)
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn: Function) => fn),
}));
