/**
 * Common types used across the application
 */

/**
 * Represents an image in Sanity CMS
 */
export interface SanityImage {
  alt: string;
  asset: {
    image_url?: string;
    _ref: string;
    _type: string;
  };
  _type: 'image';
}

/**
 * How did you hear about us options
 */
export type HowDidYouHearOptions =
  | 'Google'
  | 'Facebook'
  | 'Instagram'
  | 'Linkedin'
  | 'Tiktok'
  | 'Base Event'
  | 'Transition Brief'
  | 'Agent Referral'
  | 'Friend Referral'
  | 'Skillbridge'
  | 'Youtube'
  | 'Other'
  | '';

/**
 * Military status options
 */
export type MilitaryStatusOptions =
  | 'Active'
  | 'National Guard'
  | 'Retired'
  | 'Spouse'
  | 'Veteran'
  | '';

/**
 * Military branch options
 */
export type MilitaryBranchOptions =
  | 'Air Force'
  | 'Coast Guard'
  | 'Navy'
  | 'Marine Corps'
  | 'Space Force'
  | 'Army'
  | '';

/**
 * Discharge status options
 */
export type DischargeStatusOptions =
  | 'Honorable Discharge'
  | 'Retired'
  | 'Medical Retirement'
  | 'Currently Serving'
  | '';

/**
 * Base form data with common fields for all forms
 */
export interface BaseFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/**
 * Base contact form data with reCAPTCHA fields
 */
export interface BaseContactFormData extends BaseFormData {
  additionalComments?: string;
  captchaToken?: string;
  captcha_settings?: string;
}

/**
 * Base military service information
 */
export interface MilitaryServiceInfo {
  status_select: MilitaryStatusOptions;
  branch_select: MilitaryBranchOptions;
  discharge_status: DischargeStatusOptions;
}
