import { describe, expect, it } from 'vitest';
import {
  contactAgentClientSchema,
  contactLenderClientSchema,
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
