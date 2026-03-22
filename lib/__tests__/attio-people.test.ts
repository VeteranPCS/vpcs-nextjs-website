import { vi, describe, test, expect, beforeEach } from 'vitest';
import { makeAssertResult, testUUID } from '../../test/fixtures';

// Mock attio client
const mockAssertRecord = vi.fn();
const mockUpdateRecord = vi.fn();
vi.mock('@/lib/attio', () => ({
  attio: {
    assertRecord: mockAssertRecord,
    updateRecord: mockUpdateRecord,
  },
}));

// Mock normalize-phone (keep behavior predictable)
vi.mock('@/lib/normalize-phone', () => ({
  normalizePhone: vi.fn((input: string | null | undefined) => {
    if (!input) return null;
    // Simulate real behavior: strip non-digits, add +1
    const digits = input.replace(/\D/g, '');
    if (digits.length < 10) return null;
    return digits.startsWith('1') ? `+${digits}` : `+1${digits}`;
  }),
}));

const { findOrCreatePerson } = await import('../attio-people');

describe('findOrCreatePerson', () => {
  const personId = testUUID('person001');

  beforeEach(() => {
    mockAssertRecord.mockReset();
    mockUpdateRecord.mockReset();
    mockAssertRecord.mockResolvedValue(makeAssertResult(personId));
    mockUpdateRecord.mockResolvedValue({});
  });

  test('calls assertRecord with people object and email matching attribute', async () => {
    await findOrCreatePerson({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
    });

    expect(mockAssertRecord).toHaveBeenCalledWith(
      'people',
      'email_addresses',
      expect.objectContaining({
        email_addresses: [{ email_address: 'john@test.com' }],
      }),
    );
  });

  test('formats name as personal-name type array', async () => {
    await findOrCreatePerson({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
    });

    const values = mockAssertRecord.mock.calls[0][2];
    expect(values.name).toEqual([{
      first_name: 'John',
      last_name: 'Doe',
      full_name: 'John Doe',
    }]);
  });

  test('includes normalized phone when provided', async () => {
    await findOrCreatePerson({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      phone: '(555) 123-4567',
    });

    const values = mockAssertRecord.mock.calls[0][2];
    expect(values.phone_numbers).toEqual([{ original_phone_number: '+15551234567' }]);
  });

  test('omits phone_numbers when phone is null', async () => {
    await findOrCreatePerson({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      phone: null,
    });

    const values = mockAssertRecord.mock.calls[0][2];
    expect(values.phone_numbers).toBeUndefined();
  });

  test('omits phone_numbers when normalizePhone returns null', async () => {
    await findOrCreatePerson({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      phone: '123', // too short → normalizePhone returns null
    });

    const values = mockAssertRecord.mock.calls[0][2];
    expect(values.phone_numbers).toBeUndefined();
  });

  test('returns the record ID from assert result', async () => {
    const result = await findOrCreatePerson({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
    });

    expect(result).toBe(personId);
  });

  test('calls updateRecord with person_type array when personType provided', async () => {
    await findOrCreatePerson({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      personType: 'Agent',
    });

    expect(mockUpdateRecord).toHaveBeenCalledWith(
      'people',
      personId,
      { person_type: ['Agent'] },
    );
  });

  test('does NOT call updateRecord when personType is omitted', async () => {
    await findOrCreatePerson({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
    });

    expect(mockUpdateRecord).not.toHaveBeenCalled();
  });
});
