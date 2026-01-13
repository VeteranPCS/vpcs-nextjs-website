// Add name attribute to agents and lenders objects
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const ATTIO_API_URL = 'https://api.attio.com/v2';

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${ATTIO_API_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${process.env.ATTIO_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Attio API error: ${res.status} ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function addNameAttribute(objectSlug: string) {
  try {
    const result = await request(`/objects/${objectSlug}/attributes`, {
      method: 'POST',
      body: JSON.stringify({
        data: {
          title: 'Name',
          api_slug: 'name',
          type: 'text',
          description: 'Display name (First Last)',
          is_required: false,
          is_unique: false,
          is_multiselect: false,
          config: {},
        }
      })
    });
    console.log(`✓ Added 'name' attribute to ${objectSlug}`);
    return result;
  } catch (error: any) {
    if (error.message.includes('already exists') || error.message.includes('409')) {
      console.log(`⏭️  'name' attribute already exists on ${objectSlug}`);
    } else {
      console.error(`❌ Failed to add 'name' to ${objectSlug}: ${error.message}`);
    }
  }
}

async function main() {
  console.log('Adding name attribute to objects...\n');

  await addNameAttribute('agents');
  await addNameAttribute('lenders');
  await addNameAttribute('customers');

  console.log('\nDone!');
}

main();
