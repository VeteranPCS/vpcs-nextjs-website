import { config } from 'dotenv';

// Next reads .env.local; Vitest does not, so load it explicitly for the gateway key.
config({ path: '.env.local' });

if (!process.env.AI_GATEWAY_API_KEY) {
  throw new Error(
    'Evals require AI_GATEWAY_API_KEY in .env.local (plus Salesforce/Sanity creds for real-tool faithfulness).',
  );
}
