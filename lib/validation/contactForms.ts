import * as yup from 'yup';
import { z } from 'zod';
import { US_STATE_CODES } from '@/constants/usStates';
import { normalizeStateCode } from '@/lib/states';

export const CUSTOMER_LIMITS = { name: 120, email: 200, location: 255, notes: 5000 } as const;
const maxMessage = (max: number) => `Use ${max} characters or fewer.`;
const optionalText = () => yup.string().transform((value, original) => original == null ? '' : value).trim().max(CUSTOMER_LIMITS.notes, maxMessage(CUSTOMER_LIMITS.notes)).optional();

// Accept the formatting shown in the form and commonly supplied by autofill.
// Keep 10–15 digits, matching the server's plausible-phone contact requirement.
const phoneRegex = /^\+?[1-9]\d{9,14}$/;

const blankToUndefined = (value: unknown, originalValue: unknown) => (
  typeof originalValue === 'string' && originalValue.trim() === '' ? undefined : value
);

const emailField = yup
  .string()
  .transform(blankToUndefined)
  .trim()
  .max(CUSTOMER_LIMITS.email, maxMessage(CUSTOMER_LIMITS.email))
  .email('Invalid email address')
  .test('server-email', 'Invalid email address', (value) => !value || z.email().safeParse(value).success)
  .optional();

const phoneField = yup
  .string()
  .transform(blankToUndefined)
  .transform((value: string | undefined) => value?.replace(/[\s().-]/g, ''))
  .matches(phoneRegex, {
    message: 'Enter a phone number with 10–15 digits, including the country code if needed.',
    excludeEmptyString: true,
  })
  .optional();

const howDidYouHearOptions = [
  'Google',
  'Facebook',
  'Instagram',
  'Linkedin',
  'Tiktok',
  'Base Event',
  'Transition Brief',
  'Agent Referral',
  'Friend Referral',
  'Skillbridge',
  'Youtube',
  'Other',
  '',
] as const;

function requireEmailOrPhone<T extends yup.AnyObject>(schema: yup.ObjectSchema<T>) {
  return schema.test('email-or-phone', 'Enter an email or phone number.', function (value) {
    const hasEmail = typeof value?.email === 'string' && value.email.trim() !== '';
    const hasPhone = typeof value?.phone === 'string' && value.phone.trim() !== '';
    if (hasEmail || hasPhone) return true;
    return this.createError({
      path: 'email',
      message: 'Enter an email or phone number.',
    });
  });
}

const baseContactShape = {
  firstName: yup.string().trim().max(CUSTOMER_LIMITS.name, maxMessage(CUSTOMER_LIMITS.name)).required('First name is required'),
  lastName: yup.string().trim().max(CUSTOMER_LIMITS.name, maxMessage(CUSTOMER_LIMITS.name)).required('Last name is required'),
  email: emailField,
  phone: phoneField,
  currentBase: yup.string().trim().max(CUSTOMER_LIMITS.location, maxMessage(CUSTOMER_LIMITS.location)).required('Current Base/City is required'),
  state: yup
    .string()
    .transform(blankToUndefined)
    .required('State is required')
    .oneOf([...US_STATE_CODES], 'Invalid state selected'),
  destinationBase: yup.string().trim().max(CUSTOMER_LIMITS.location, maxMessage(CUSTOMER_LIMITS.location)).required('Destination Base/City is required'),
  howDidYouHear: yup
    .string()
    .optional()
    .oneOf([...howDidYouHearOptions], 'Invalid option selected'),
  tellusMore: optionalText(),
};

export const contactAgentClientSchema = requireEmailOrPhone(
  yup.object({
    ...baseContactShape,
    additionalComments: optionalText(),
  }),
);

export const contactLenderClientSchema = requireEmailOrPhone(
  yup.object({
    ...baseContactShape,
    additionalComments: optionalText(),
  }),
);

export const CUSTOMER_FIELDS = [...Object.keys(baseContactShape), 'additionalComments'];

/** Website-only validation; Concierge's deliberately partial service schemas stay unchanged. */
export async function validateCustomerWebsiteForm(raw: unknown, formId: 'contact_agent' | 'contact_lender', queryString: string) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false as const, fieldErrors: { firstName: 'Please check your information.' } };
  }
  const data = { ...raw } as Record<string, unknown>;
  // Preserve the service's deep-link state precedence and old query-only payloads.
  data.state = normalizeStateCode(new URLSearchParams(queryString).get('state')) ?? data.state;
  const fieldErrors: Record<string, string> = {};
  for (const field of CUSTOMER_FIELDS) {
    if (data[field] != null && typeof data[field] !== 'string') fieldErrors[field] = 'Enter a text value.';
  }
  if (Object.keys(fieldErrors).length) return { ok: false as const, fieldErrors };
  try {
    const schema = formId === 'contact_agent' ? contactAgentClientSchema : contactLenderClientSchema;
    const normalized = await schema.validate(data, { abortEarly: false });
    return { ok: true as const, data: normalized };
  } catch (error) {
    if (!(error instanceof yup.ValidationError)) throw error;
    for (const issue of error.inner) {
      if (issue.path && CUSTOMER_FIELDS.includes(issue.path)) fieldErrors[issue.path] ??= issue.message;
    }
    return { ok: false as const, fieldErrors };
  }
}
