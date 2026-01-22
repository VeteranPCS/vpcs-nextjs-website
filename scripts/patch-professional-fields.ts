// scripts/patch-professional-fields.ts
// Patches agent and lender records with professional fields from Contact.csv
//
// The original migration scripts read professional fields from Account.csv,
// but the actual data lives in Contact.csv. This script fixes that.
//
// Usage:
//   npx tsx scripts/patch-professional-fields.ts           # Run full patch
//   npx tsx scripts/patch-professional-fields.ts --dry-run # Preview only

import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');

interface AccountRow {
  Id: string;
  PersonContactId: string;
  RecordTypeId: string;
}

interface ContactRow {
  Id: string;
  // Professional fields
  Brokerage_Name__c: string;
  Brokerage_Phone__c: string;
  Managing_Broker_Name__c: string;
  Managing_Broker_Email__c: string;
  Managing_Broker_Phone__c: string;
  License_Number__c: string;
  State_s_Licensed_in__c: string;
  // Lender-specific
  Individual_NMLS_ID__c: string;
  Company_NMLS_ID__c: string;
}

// Normalize phone to E.164 format
function normalizePhone(phone: string | undefined): string | null {
  if (!phone) return null;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // US numbers: add +1 prefix if 10 digits
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  // Already has country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Return as-is if can't normalize (might be international)
  return phone;
}

// State code to full name mapping (must match Attio select options)
const STATE_CODE_TO_NAME: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'DC': 'Washington D.C.', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii',
  'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine',
  'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
  'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska',
  'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico',
  'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'PR': 'Puerto Rico',
  'RI': 'Rhode Island', 'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee',
  'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia',
  'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
};

// Parse states licensed from various formats (semicolon or comma separated)
// Converts state codes (TX, CA) to full names (Texas, California) to match Attio options
function parseStatesLicensed(statesStr: string | undefined): string[] | null {
  if (!statesStr) return null;

  // Split by semicolon or comma, trim whitespace
  const rawStates = statesStr.split(/[;,]/).map(s => s.trim()).filter(Boolean);

  // Convert codes to full names
  const states = rawStates.map(s => {
    // If it's a 2-letter code, convert to full name
    const upper = s.toUpperCase();
    if (STATE_CODE_TO_NAME[upper]) {
      return STATE_CODE_TO_NAME[upper];
    }
    // If already a full name (or close match), try to find it
    for (const [code, name] of Object.entries(STATE_CODE_TO_NAME)) {
      if (name.toLowerCase() === s.toLowerCase()) {
        return name;
      }
    }
    // Return as-is if we can't map it
    return s;
  }).filter(s => {
    // Only include states that are valid Attio options
    return Object.values(STATE_CODE_TO_NAME).includes(s);
  });

  return states.length > 0 ? states : null;
}

async function patchProfessionalFields() {
  console.log('='.repeat(60));
  console.log('Patch Professional Fields');
  console.log(DRY_RUN ? '(DRY RUN - no changes will be made)' : '');
  console.log('='.repeat(60));
  console.log();

  // Dynamically import attio after env vars are loaded
  const { attio } = await import('../lib/attio');

  // Read data files
  const dataDir = path.join(process.cwd(), 'data/salesforce');
  const mappingsDir = path.join(process.cwd(), 'data/mappings');

  // Load mappings
  const agentMapping: Record<string, string> = JSON.parse(
    fs.readFileSync(path.join(mappingsDir, 'agents.json'), 'utf-8')
  );
  const lenderMapping: Record<string, string> = JSON.parse(
    fs.readFileSync(path.join(mappingsDir, 'lenders.json'), 'utf-8')
  );

  console.log(`Loaded ${Object.keys(agentMapping).length} agent mappings`);
  console.log(`Loaded ${Object.keys(lenderMapping).length} lender mappings`);

  // Load Account.csv to build Account ID -> Contact ID lookup
  const accountsCsv = fs.readFileSync(path.join(dataDir, 'Account.csv'), 'utf-8');
  const accounts: AccountRow[] = parse(accountsCsv, { columns: true });

  const accountToContact: Record<string, string> = {};
  for (const account of accounts) {
    if (account.PersonContactId) {
      accountToContact[account.Id] = account.PersonContactId;
    }
  }
  console.log(`Built Account→Contact lookup (${Object.keys(accountToContact).length} entries)`);

  // Load Contact.csv
  const contactsCsv = fs.readFileSync(path.join(dataDir, 'Contact.csv'), { encoding: 'utf-8' });
  const contacts: ContactRow[] = parse(contactsCsv, { columns: true });

  // Build Contact ID -> Contact lookup
  const contactMap: Record<string, ContactRow> = {};
  for (const contact of contacts) {
    contactMap[contact.Id] = contact;
  }
  console.log(`Built Contact lookup (${Object.keys(contactMap).length} entries)`);
  console.log();

  // Stats
  let agentsUpdated = 0;
  let agentsSkipped = 0;
  let agentErrors = 0;
  let lendersUpdated = 0;
  let lendersSkipped = 0;
  let lenderErrors = 0;

  // ===== PATCH AGENTS =====
  console.log('--- Patching Agents ---');

  for (const [sfAccountId, attioId] of Object.entries(agentMapping)) {
    const contactId = accountToContact[sfAccountId];
    if (!contactId) {
      agentsSkipped++;
      continue;
    }

    const contact = contactMap[contactId];
    if (!contact) {
      agentsSkipped++;
      continue;
    }

    // Build update payload with fields from Contact.csv
    const updates: Record<string, any> = {};

    // Only include fields that have data
    if (contact.Brokerage_Name__c?.trim()) {
      updates.brokerage_name = contact.Brokerage_Name__c.trim();
    }
    if (contact.Managing_Broker_Name__c?.trim()) {
      updates.managing_broker_name = contact.Managing_Broker_Name__c.trim();
    }
    if (contact.Managing_Broker_Email__c?.trim()) {
      updates.managing_broker_email = contact.Managing_Broker_Email__c.trim();
    }
    if (contact.Managing_Broker_Phone__c?.trim()) {
      const phone = normalizePhone(contact.Managing_Broker_Phone__c.trim());
      if (phone) updates.managing_broker_phone = phone;
    }
    if (contact.License_Number__c?.trim()) {
      updates.license_number = contact.License_Number__c.trim();
    }

    // Skip if no updates
    if (Object.keys(updates).length === 0) {
      agentsSkipped++;
      continue;
    }

    try {
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would update agent ${attioId}: ${JSON.stringify(updates)}`);
      } else {
        await attio.updateRecord('agents', attioId, updates);
        console.log(`✓ Updated agent ${attioId}`);
      }
      agentsUpdated++;
    } catch (error: any) {
      agentErrors++;
      console.error(`❌ Error updating agent ${attioId}: ${error.message}`);
    }
  }

  console.log();
  console.log(`Agents: ${agentsUpdated} updated, ${agentsSkipped} skipped, ${agentErrors} errors`);
  console.log();

  // ===== PATCH LENDERS =====
  console.log('--- Patching Lenders ---');

  for (const [sfAccountId, attioId] of Object.entries(lenderMapping)) {
    const contactId = accountToContact[sfAccountId];
    if (!contactId) {
      lendersSkipped++;
      continue;
    }

    const contact = contactMap[contactId];
    if (!contact) {
      lendersSkipped++;
      continue;
    }

    // Build update payload with fields from Contact.csv
    const updates: Record<string, any> = {};

    // Common fields (same as agents)
    if (contact.Brokerage_Name__c?.trim()) {
      updates.brokerage_name = contact.Brokerage_Name__c.trim();
    }
    if (contact.Managing_Broker_Name__c?.trim()) {
      updates.managing_broker_name = contact.Managing_Broker_Name__c.trim();
    }
    if (contact.Managing_Broker_Email__c?.trim()) {
      updates.managing_broker_email = contact.Managing_Broker_Email__c.trim();
    }
    if (contact.Managing_Broker_Phone__c?.trim()) {
      const phone = normalizePhone(contact.Managing_Broker_Phone__c.trim());
      if (phone) updates.managing_broker_phone = phone;
    }

    // Lender-specific fields
    if (contact.Individual_NMLS_ID__c?.trim()) {
      updates.individual_nmls = contact.Individual_NMLS_ID__c.trim();
    }
    if (contact.Company_NMLS_ID__c?.trim()) {
      updates.company_nmls = contact.Company_NMLS_ID__c.trim();
    }
    if (contact.State_s_Licensed_in__c?.trim()) {
      const states = parseStatesLicensed(contact.State_s_Licensed_in__c);
      if (states) updates.states_licensed = states;
    }

    // Skip if no updates
    if (Object.keys(updates).length === 0) {
      lendersSkipped++;
      continue;
    }

    try {
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would update lender ${attioId}: ${JSON.stringify(updates)}`);
      } else {
        await attio.updateRecord('lenders', attioId, updates);
        console.log(`✓ Updated lender ${attioId}`);
      }
      lendersUpdated++;
    } catch (error: any) {
      lenderErrors++;
      console.error(`❌ Error updating lender ${attioId}: ${error.message}`);
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log('PATCH COMPLETE');
  console.log('='.repeat(60));
  console.log(`Agents:  ${agentsUpdated} updated, ${agentsSkipped} skipped, ${agentErrors} errors`);
  console.log(`Lenders: ${lendersUpdated} updated, ${lendersSkipped} skipped, ${lenderErrors} errors`);

  if (DRY_RUN) {
    console.log();
    console.log('This was a DRY RUN. Run without --dry-run to apply changes.');
  }
}

// Run patch
patchProfessionalFields().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
