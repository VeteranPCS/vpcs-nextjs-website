import { BaseFormData, BaseContactFormData } from './common';

/**
 * Keep In Touch form data
 */
export interface KeepInTouchFormData extends BaseFormData {
  captchaToken?: string;
  captcha_settings?: string;
}

/**
 * Contact form data
 */
export interface ContactFormData extends BaseContactFormData {}

/**
 * VA Loan Guide form data
 */
export interface VALoanGuideFormData extends BaseFormData {
  captchaToken?: string;
  captcha_settings?: string;
}

/**
 * Internship form data
 */
export interface InternshipFormData {
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  '00N4x00000LsnP2'?: string; // Status
  '00N4x00000LsnOx'?: string; // Branch
  '00N4x00000QQ0Vz'?: string; // Discharge Status
  state_code?: string;
  city?: string;
  base?: string;
  '00N4x00000QPK7L'?: string; // Resume
  '00N4x00000LspV2'?: string; // State
  '00N4x00000LspUi'?: string; // City
  '00N4x00000QPLQY'?: string; // LinkedIn
  '00N4x00000QPLQd'?: string; // Portfolio
  '00N4x00000QPksj'?: string; // How did you hear
  '00N4x00000QPS7V'?: string; // Tell us more
  'g-recaptcha-response'?: string;
  captcha_settings?: string;
}
