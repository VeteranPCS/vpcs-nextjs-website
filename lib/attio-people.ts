// lib/attio-people.ts
// Helper to create/find People records for sequence enrollment.
// Attio sequences can only enroll built-in objects (People, Companies),
// so each custom object record needs a linked People record.

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

  return result.data.id.record_id;
}
