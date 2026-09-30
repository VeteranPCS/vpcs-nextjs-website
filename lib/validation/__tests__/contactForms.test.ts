import { describe, expect, it } from 'vitest';
import {
  contactAgentClientSchema,
  contactLenderClientSchema,
  validateCustomerWebsiteForm,
} from '@/lib/validation/contactForms';

const baseLead = {
  firstName: 'Alex',
  lastName: 'Smith',
  email: '',
  phone: '',
  currentBase: 'Fort Liberty',
  state: 'NC',
  destinationBase: 'Raleigh',
  howDidYouHear: '',
  tellusMore: '',
  additionalComments: '',
};

describe('contact form client validation', () => {
  describe.each([['contact_agent', contactAgentClientSchema], ['contact_lender', contactLenderClientSchema]] as const)('%s website parity', (formId, schema) => {
    it.each([['firstName', 120], ['lastName', 120], ['currentBase', 255], ['destinationBase', 255], ['additionalComments', 5000], ['tellusMore', 5000]] as const)('bounds %s on both sides', async (field, max) => {
      const atLimit = { ...baseLead, email: 'qa@example.com', [field]: 'x'.repeat(max) };
      await expect(schema.validate(atLimit)).resolves.toBeTruthy();
      expect((await validateCustomerWebsiteForm(atLimit, formId, '')).ok).toBe(true);
      const over = { ...atLimit, [field]: 'x'.repeat(max + 1) };
      await expect(schema.validate(over)).rejects.toThrow(`Use ${max} characters or fewer.`);
      expect(await validateCustomerWebsiteForm(over, formId, '')).toMatchObject({ ok: false, fieldErrors: { [field]: `Use ${max} characters or fewer.` } });
    });
    it('normalizes optional null text and retains attribution/spam metadata', async () => {
      const raw = { ...baseLead, email: 'qa@example.com', additionalComments: null, tellusMore: null, company_website: '', form_rendered_at: 123, vpcs_visitor_id: 'vpcs_test', form_attempt_count_before_conversion: 2 };
      expect(await validateCustomerWebsiteForm(raw, formId, '')).toMatchObject({ ok: true, data: { additionalComments: '', tellusMore: '', company_website: '', form_rendered_at: 123, vpcs_visitor_id: 'vpcs_test', form_attempt_count_before_conversion: 2 } });
    });
    it('rejects whitespace required fields and non-string request values without reflecting input', async () => {
      expect(await validateCustomerWebsiteForm({ ...baseLead, firstName: '   ' }, formId, '')).toMatchObject({ ok: false, fieldErrors: { firstName: 'First name is required' } });
      expect(await validateCustomerWebsiteForm({ ...baseLead, firstName: { secret: 'private' } }, formId, '')).toMatchObject({ ok: false, fieldErrors: { firstName: 'Enter a text value.' } });
    });
  });
  it('allows email-only and phone-only leads', async () => {
    await expect(contactAgentClientSchema.validate({
      ...baseLead,
      email: 'alex@example.com',
      phone: '',
    })).resolves.toMatchObject({ email: 'alex@example.com' });

    await expect(contactLenderClientSchema.validate({
      ...baseLead,
      email: '',
      phone: '+15555551234',
    })).resolves.toMatchObject({ phone: '+15555551234' });
  });

  it('rejects both contact methods blank', async () => {
    await expect(contactAgentClientSchema.validate(baseLead)).rejects.toThrow(
      'Enter an email or phone number.',
    );
  });

  it('rejects invalid email and phone values', async () => {
    await expect(contactAgentClientSchema.validate({
      ...baseLead,
      email: 'not-an-email',
      phone: '',
    })).rejects.toThrow('Invalid email address');

    await expect(contactAgentClientSchema.validate({
      ...baseLead,
      email: '',
      phone: '555-1234',
    })).rejects.toThrow('Enter a phone number with 10–15 digits');
  });

  describe.each([
    ['agent', contactAgentClientSchema],
    ['lender', contactLenderClientSchema],
  ] as const)('%s phone formatting', (_name, schema) => {
    it.each([
      ['+1 555 555-1234', '+15555551234'],
      ['(555) 555-1234', '5555551234'],
      ['555.555.1234', '5555551234'],
      [' +44 20 7946 0958 ', '+442079460958'],
    ])('accepts %s and submits normalized digits', async (phone, expected) => {
      await expect(schema.validate({ ...baseLead, phone })).resolves.toMatchObject({ phone: expected });
    });

    it.each(['12', '1234567890123456', 'call5555551234', '555+5551234', '+++15555551234'])('rejects malformed number %s', async (phone) => {
      await expect(schema.validate({ ...baseLead, phone })).rejects.toThrow('Enter a phone number with 10–15 digits');
    });
  });

  it('keeps howDidYouHear optional and accepts DC deep-link state', async () => {
    await expect(contactLenderClientSchema.validate({
      ...baseLead,
      email: 'alex@example.com',
      state: 'DC',
      howDidYouHear: '',
    })).resolves.toMatchObject({ state: 'DC', howDidYouHear: '' });
  });
});
