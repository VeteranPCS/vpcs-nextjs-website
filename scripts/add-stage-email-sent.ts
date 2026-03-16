// scripts/add-stage-email-sent.ts
// Adds `stage_email_sent` text attribute to pipelines that send stage-change emails.
// This field tracks which stage emails have been sent to prevent duplicates
// when Attio fires multiple webhook events for the same stage change.
//
// Usage: npx tsx scripts/add-stage-email-sent.ts

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const ATTIO_API_URL = 'https://api.attio.com/v2';
const API_KEY = process.env.ATTIO_API_KEY!;

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${ATTIO_API_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Attio API error: ${res.status} ${error}`);
  }
  return res.json();
}

const LISTS = ['customer_deals', 'agent_onboarding', 'lender_onboarding'];

async function main() {
  if (!API_KEY) {
    throw new Error('ATTIO_API_KEY not set');
  }

  for (const listSlug of LISTS) {
    console.log(`Adding stage_email_sent to ${listSlug}...`);
    try {
      await request(`/lists/${listSlug}/attributes`, {
        method: 'POST',
        body: JSON.stringify({
          data: {
            title: 'Stage Email Sent',
            api_slug: 'stage_email_sent',
            type: 'text',
            description: 'Tracks which stage-change emails have been sent (comma-separated). Used by webhook handler to prevent duplicates.',
            is_required: false,
            is_unique: false,
            is_multiselect: false,
            config: {},
          },
        }),
      });
      console.log(`  ✅ Created on ${listSlug}`);
    } catch (error: any) {
      if (error.message.includes('409') || error.message.includes('already exists')) {
        console.log(`  ⏭️  Already exists on ${listSlug}`);
      } else {
        console.error(`  ❌ Failed on ${listSlug}:`, error.message);
      }
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
