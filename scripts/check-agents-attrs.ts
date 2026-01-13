// Quick script to check agents attributes
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
  const res = await fetch('https://api.attio.com/v2/objects/agents/attributes', {
    headers: { 'Authorization': `Bearer ${process.env.ATTIO_API_KEY}` }
  });
  const data = await res.json();

  console.log('Agents attributes:');
  for (const attr of data.data) {
    console.log(`  - ${attr.api_slug} (${attr.type})`);
    if (attr.api_slug === 'name') {
      console.log('    *** FOUND NAME ATTRIBUTE ***');
    }
  }

  // Check if there's a primary/title attribute
  const hasName = data.data.some((a: any) => a.api_slug === 'name');
  console.log(`\nHas name attribute: ${hasName}`);
}

main();
