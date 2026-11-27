export type LeadCaptchaPublicConfig =
  | { mode: 'off' }
  | { mode: 'required'; siteKey: string }
  | { mode: 'unavailable' };

export type LeadSubmissionFields = {
  submission_attempt_id: string;
  captchaToken?: string;
};
