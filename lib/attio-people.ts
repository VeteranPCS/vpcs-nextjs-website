// lib/attio-people.ts
// Helper to create/find People records for Attio contact management.
// Each custom object record has a linked People record for CRM dedup.

import { attio } from "./attio";
import { normalizePhone } from "./normalize-phone";

/**
 * Find or create a People record by email (upsert).
 * Returns the People record ID.
 *
 * People is a built-in Attio object with different field formats than custom objects:
 * - name: [{ first_name, last_name, full_name }]  (personal-name type, NOT separate fields)
 * - email_addresses: [{ email_address: "x@y.com" }]
 * - phone_numbers: [{ original_phone_number: "+1..." }]
 */
export async function findOrCreatePerson(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  personType?: 'Agent' | 'Lender' | 'Customer' | 'Intern';
}): Promise<string> {
  const values: Record<string, any> = {
    email_addresses: [{ email_address: data.email }],
    name: [{
      first_name: data.firstName,
      last_name: data.lastName,
      full_name: `${data.firstName} ${data.lastName}`.trim(),
    }],
  };

  if (data.phone) {
    const normalized = normalizePhone(data.phone);
    if (normalized) {
      values.phone_numbers = [{ original_phone_number: normalized }];
    }
  }

  // assertRecord = PUT with matching_attribute → upsert by email
  const result = await attio.assertRecord(
    "people",
    "email_addresses",
    values,
  );

  const recordId = result.data.id.record_id;

  // Append person_type via PATCH (not PUT) to preserve existing types.
  // A person who is both an Agent and Customer accumulates [Agent, Customer].
  // Multi-select attributes require an array value, even for a single option.
  if (data.personType) {
    await attio.updateRecord("people", recordId, {
      person_type: [data.personType],
    });
  }

  return recordId;
}
