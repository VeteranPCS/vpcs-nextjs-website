import * as yup from 'yup';
import { US_STATE_CODES } from '@/constants/usStates';

const phoneRegex = /^\+?[1-9]\d{1,14}$/;

const blankToUndefined = (value: unknown, originalValue: unknown) => (
  typeof originalValue === 'string' && originalValue.trim() === '' ? undefined : value
);

const emailField = yup
  .string()
  .transform(blankToUndefined)
  .email('Invalid email address')
  .optional();

const phoneField = yup
  .string()
  .transform(blankToUndefined)
  .matches(phoneRegex, {
    message: 'Invalid phone number format',
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
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: emailField,
  phone: phoneField,
  currentBase: yup.string().required('Current Base/City is required'),
  state: yup
    .string()
    .required('State is required')
    .oneOf([...US_STATE_CODES], 'Invalid state selected'),
  destinationBase: yup.string().required('Destination Base/City is required'),
  howDidYouHear: yup
    .string()
    .optional()
    .oneOf([...howDidYouHearOptions], 'Invalid option selected'),
  tellusMore: yup.string().when('howDidYouHear', {
    is: 'Other',
    then: (schema) => schema,
    otherwise: (schema) => schema.nullable(),
  }),
};

export const contactAgentClientSchema = requireEmailOrPhone(
  yup.object({
    ...baseContactShape,
    additionalComments: yup.string().optional(),
  }),
);

export const contactLenderClientSchema = requireEmailOrPhone(
  yup.object({
    ...baseContactShape,
    additionalComments: yup.string().nullable(),
  }),
);
