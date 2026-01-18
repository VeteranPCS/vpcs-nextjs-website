// scripts/rebuild-mappings.ts
// Rebuilds mapping files from current Attio data
// This is needed when migrations were run across multiple sessions

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Type for CSV rows - they all have SalesforceId and ContactId columns
interface CsvRow {
  SalesforceId: string;
  ContactId: string;
}

async function rebuildMappings() {
  console.log('='.repeat(60));
  console.log('Rebuild Mappings from Attio');
  console.log('='.repeat(60));
  console.log();

  const { attio } = await import('../lib/attio');
  const mappingsDir = path.join(process.cwd(), 'data/mappings');

  if (!fs.existsSync(mappingsDir)) {
    fs.mkdirSync(mappingsDir, { recursive: true });
  }

  // Rebuild agents mapping
  console.log('Fetching agents from Attio...');
  const agentsMapping: Record<string, string> = {};
  const agentsByContact: Record<string, string> = {};
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const agents = await attio.queryRecords('agents', { limit: 100, offset });
    if (agents.length === 0) {
      hasMore = false;
    } else {
      for (const agent of agents) {
        if (agent.salesforce_id) {
          agentsMapping[agent.salesforce_id] = agent.id;
        }
      }
      offset += agents.length;
      console.log(`   Fetched ${offset} agents...`);
    }
  }

  fs.writeFileSync(path.join(mappingsDir, 'agents.json'), JSON.stringify(agentsMapping, null, 2));
  console.log(`✓ agents.json: ${Object.keys(agentsMapping).length} entries`);

  // Build agents-by-contact mapping from cleaned CSV
  const agentsCsvPath = path.join(process.cwd(), 'data/cleaned/data-cleaned-agents.csv');
  if (fs.existsSync(agentsCsvPath)) {
    const { parse } = await import('csv-parse/sync');
    const csvData = fs.readFileSync(agentsCsvPath, 'utf-8');
    const agentRows: CsvRow[] = parse(csvData, { columns: true });

    for (const row of agentRows) {
      const attioId = agentsMapping[row.SalesforceId];
      if (attioId && row.ContactId) {
        agentsByContact[row.ContactId] = attioId;
      }
    }

    fs.writeFileSync(path.join(mappingsDir, 'agents-by-contact.json'), JSON.stringify(agentsByContact, null, 2));
    console.log(`✓ agents-by-contact.json: ${Object.keys(agentsByContact).length} entries`);
  }
  console.log();

  // Rebuild lenders mapping
  console.log('Fetching lenders from Attio...');
  const lendersMapping: Record<string, string> = {};
  const lendersByContact: Record<string, string> = {};
  offset = 0;
  hasMore = true;

  while (hasMore) {
    const lenders = await attio.queryRecords('lenders', { limit: 100, offset });
    if (lenders.length === 0) {
      hasMore = false;
    } else {
      for (const lender of lenders) {
        if (lender.salesforce_id) {
          lendersMapping[lender.salesforce_id] = lender.id;
        }
      }
      offset += lenders.length;
      console.log(`   Fetched ${offset} lenders...`);
    }
  }

  fs.writeFileSync(path.join(mappingsDir, 'lenders.json'), JSON.stringify(lendersMapping, null, 2));
  console.log(`✓ lenders.json: ${Object.keys(lendersMapping).length} entries`);

  // Build lenders-by-contact mapping from cleaned CSV
  const lendersCsvPath = path.join(process.cwd(), 'data/cleaned/data-cleaned-lenders.csv');
  if (fs.existsSync(lendersCsvPath)) {
    const { parse } = await import('csv-parse/sync');
    const csvData = fs.readFileSync(lendersCsvPath, 'utf-8');
    const lenderRows: CsvRow[] = parse(csvData, { columns: true });

    for (const row of lenderRows) {
      const attioId = lendersMapping[row.SalesforceId];
      if (attioId && row.ContactId) {
        lendersByContact[row.ContactId] = attioId;
      }
    }

    fs.writeFileSync(path.join(mappingsDir, 'lenders-by-contact.json'), JSON.stringify(lendersByContact, null, 2));
    console.log(`✓ lenders-by-contact.json: ${Object.keys(lendersByContact).length} entries`);
  }
  console.log();

  // Rebuild customers mapping
  console.log('Fetching customers from Attio...');
  const customersMapping: Record<string, string> = {};
  const customersByContact: Record<string, string> = {};
  offset = 0;
  hasMore = true;

  while (hasMore) {
    const customers = await attio.queryRecords('customers', { limit: 100, offset });
    if (customers.length === 0) {
      hasMore = false;
    } else {
      for (const customer of customers) {
        if (customer.salesforce_id) {
          customersMapping[customer.salesforce_id] = customer.id;
        }
      }
      offset += customers.length;
      console.log(`   Fetched ${offset} customers...`);
    }
  }

  fs.writeFileSync(path.join(mappingsDir, 'customers.json'), JSON.stringify(customersMapping, null, 2));
  console.log(`✓ customers.json: ${Object.keys(customersMapping).length} entries`);

  // Build customers-by-contact mapping from cleaned CSV
  const customersCsvPath = path.join(process.cwd(), 'data/cleaned/data-cleaned-customers.csv');
  if (fs.existsSync(customersCsvPath)) {
    const { parse } = await import('csv-parse/sync');
    const csvData = fs.readFileSync(customersCsvPath, 'utf-8');
    const customerRows: CsvRow[] = parse(csvData, { columns: true });

    for (const row of customerRows) {
      const attioId = customersMapping[row.SalesforceId];
      if (attioId && row.ContactId) {
        customersByContact[row.ContactId] = attioId;
      }
    }

    fs.writeFileSync(path.join(mappingsDir, 'customers-by-contact.json'), JSON.stringify(customersByContact, null, 2));
    console.log(`✓ customers-by-contact.json: ${Object.keys(customersByContact).length} entries`);
  }
  console.log();

  // Rebuild areas mapping
  console.log('Fetching areas from Attio...');
  const areasMapping: Record<string, string> = {};
  offset = 0;
  hasMore = true;

  while (hasMore) {
    const areas = await attio.queryRecords('areas', { limit: 100, offset });
    if (areas.length === 0) {
      hasMore = false;
    } else {
      for (const area of areas) {
        if (area.salesforce_id) {
          areasMapping[area.salesforce_id] = area.id;
        }
      }
      offset += areas.length;
      console.log(`   Fetched ${offset} areas...`);
    }
  }

  fs.writeFileSync(path.join(mappingsDir, 'areas.json'), JSON.stringify(areasMapping, null, 2));
  console.log(`✓ areas.json: ${Object.keys(areasMapping).length} entries`);
  console.log();

  // Summary
  console.log('='.repeat(60));
  console.log('MAPPING REBUILD COMPLETE');
  console.log('='.repeat(60));
  console.log(`📁 agents.json: ${Object.keys(agentsMapping).length} entries`);
  console.log(`📁 agents-by-contact.json: ${Object.keys(agentsByContact).length} entries`);
  console.log(`📁 lenders.json: ${Object.keys(lendersMapping).length} entries`);
  console.log(`📁 lenders-by-contact.json: ${Object.keys(lendersByContact).length} entries`);
  console.log(`📁 customers.json: ${Object.keys(customersMapping).length} entries`);
  console.log(`📁 customers-by-contact.json: ${Object.keys(customersByContact).length} entries`);
  console.log(`📁 areas.json: ${Object.keys(areasMapping).length} entries`);
}

rebuildMappings().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
