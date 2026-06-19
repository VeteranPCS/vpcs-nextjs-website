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
      phone: '555-555-1234',
    })).rejects.toThrow('Invalid phone number format');
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
