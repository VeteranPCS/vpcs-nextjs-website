import { BaseFormData, BaseContactFormData, MilitaryServiceInfo } from './common';

/**
 * Basic form data for the "Get Listed Lenders" form
 */
export interface LenderListingFormData extends BaseFormData {}

/**
 * Extended lender form data with military service info
 */
export interface LenderListingWithMilitaryFormData extends LenderListingFormData, MilitaryServiceInfo {}

/**
 * Mortgage company information form data
 */
export interface MortgageCompanyFormData {
  primaryState?: string;
  otherStates?: string;
  localCities?: string;
  nmlsId?: string;
  name?: string; // company name
  street?: string;
  state?: string;
  city?: string;
  zip?: string;
  companyNMLSId?: string;
  howDidYouHear?: string;
  tellusMore?: string;
  captchaToken?: string;
  captcha_settings?: string;
}

/**
 * Complete lender listing form data with all fields
 */
export interface CompleteLenderListingFormData extends LenderListingWithMilitaryFormData, MortgageCompanyFormData {}

/**
 * Contact lender form data
 */
export interface ContactLenderFormData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  currentBase?: string;
  destinationBase?: string;
  additionalComments?: string | null;
  howDidYouHear?: string;
  tellusMore?: string;
  captchaToken?: string;
  captcha_settings?: string;
}
