import { z } from 'zod';

/**
 * Server-side validation schemas for the lead-capture forms in
 * `services/salesForcePostFormsService.tsx`.
 *
 * These are deliberately lenient about WHICH fields are present (forms evolve and the
 * client controls the payload) but strict about TYPES and LENGTHS so we reject obviously
 * abusive input (giant strings, non-string scalars) before it reaches Salesforce/Slack/SMS.
 *
 * All schemas use `.passthrough()` so unknown fields the client sends (e.g. captcha_settings,
 * Salesforce custom-field IDs we don't model here) are preserved and forwarded unchanged —
 * this keeps behavior identical for valid input.
 */

// ---- Reusable field primitives --------------------------------------------------------

/** Optional trimmed string with a max length; empty string is allowed and preserved. */
const optionalString = (max: number) =>
    z
        .string()
        .trim()
        .max(max)
        .optional();

/** A name component (first/last). Optional because some payloads send partials. */
const nameField = optionalString(120);

/** Email: when present must be a valid address and reasonably bounded. */
const emailField = z
    .string()
    .trim()
    .max(200)
    .email()
    .optional()
    .or(z.literal(''));

/** Phone: free-form (E.164, formatted, etc.), just length-bounded. */
const phoneField = optionalString(40);

/** Long free-text fields (messages, notes, "tell us more"). */
const longTextField = optionalString(5000);

/** Short free-text / select-style fields. */
const shortTextField = optionalString(255);

/** Captcha token field used by most forms. */
const captchaTokenField = optionalString(5000);

/**
 * `otherStates` may arrive as an array of 2-letter codes or a pre-joined string.
 * Bound each entry and the joined form so neither can be abused.
 */
const otherStatesField = z
    .union([z.array(z.string().trim().max(60)).max(60), z.string().trim().max(2000)])
    .optional();

// ---- Spam detectors --------------------------------------------------------------------

/** Returns true if `phone` contains between 10 and 15 digits (after stripping non-digits). */
export function hasPlausiblePhone(phone: string | undefined): boolean {
    const digits = (phone ?? '').replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
}

const LINK_RE = /\bhttps?:\/\/|\bwww\.|<a\s|\[url[=\]]/i;
/** Returns true if `text` contains a hyperlink pattern. */
export function containsLink(text: string | undefined): boolean {
    return !!text && LINK_RE.test(text);
}

// ---- Contact-method refinement ---------------------------------------------------------

/**
 * HARD reject: at least one of a valid email or a plausible phone must be present.
 * Applied only to consumer lead schemas (simpleLeadSchema, contactAgentSchema,
 * contactLenderSchema). Agent/lender application and internship schemas are left unrefined.
 */
const requireContactMethod = <S extends z.ZodObject<any>>(schema: S) =>
    schema.refine(
        (d: any) => (typeof d.email === 'string' && d.email.trim() !== '') || hasPlausiblePhone(d.phone),
        { message: 'A valid email or phone number is required.', path: ['email'] },
    );

// ---- Schemas ---------------------------------------------------------------------------

/**
 * Base lead shape shared by simple lead/contact forms:
 * contactPostForm, KeepInTouchForm, vaLoanGuideForm.
 */
export const simpleLeadSchema = requireContactMethod(
    z
        .object({
            firstName: nameField,
            lastName: nameField,
            email: emailField,
            phone: phoneField,
            additionalComments: longTextField,
            captchaToken: captchaTokenField,
            captcha_settings: shortTextField,
        })
        .passthrough(),
);

/**
 * Contact-an-agent lead. Superset of the simple lead with PCS/property fields.
 * Used by contactAgentPostForm.
 */
export const contactAgentSchema = requireContactMethod(
    z
        .object({
            firstName: nameField,
            lastName: nameField,
            email: emailField,
            phone: phoneField,
            currentBase: shortTextField,
            destinationBase: shortTextField,
            howDidYouHear: shortTextField,
            tellusMore: longTextField,
            additionalComments: longTextField,
            status_select: shortTextField,
            branch_select: shortTextField,
            discharge_status: shortTextField,
            state: shortTextField,
            city: shortTextField,
            buyingSelling: shortTextField,
            timeframe: shortTextField,
            typeOfHome: shortTextField,
            bedrooms: shortTextField,
            bathrooms: shortTextField,
            maxPrice: shortTextField,
            preApproval: shortTextField,
            captchaToken: captchaTokenField,
            captcha_settings: shortTextField,
        })
        .passthrough(),
);

/**
 * Contact-a-lender lead. Used by contactLenderPostForm.
 */
export const contactLenderSchema = requireContactMethod(
    z
        .object({
            firstName: nameField,
            lastName: nameField,
            email: emailField,
            phone: phoneField,
            currentBase: shortTextField,
            destinationBase: shortTextField,
            howDidYouHear: shortTextField,
            tellusMore: longTextField,
            additionalComments: longTextField,
            captchaToken: captchaTokenField,
            captcha_settings: shortTextField,
        })
        .passthrough(),
);

/**
 * Agent "get listed" application. Used by GetListedAgentsPostForm.
 */
export const getListedAgentsSchema = z
    .object({
        firstName: nameField,
        lastName: nameField,
        email: emailField,
        phone: phoneField,
        status_select: shortTextField,
        branch_select: shortTextField,
        discharge_status: shortTextField,
        state: shortTextField,
        city: shortTextField,
        primaryState: shortTextField,
        otherStates: otherStatesField,
        licenseNumber: shortTextField,
        brokerageName: shortTextField,
        managingBrokerName: shortTextField,
        managingBrokerPhone: phoneField,
        managingBrokerEmail: emailField,
        citiesServiced: longTextField,
        basesServiced: longTextField,
        personallyPCS: shortTextField,
        leadAcceptance: shortTextField,
        howDidYouHear: shortTextField,
        tellusMore: longTextField,
        additionalComments: longTextField,
        captchaToken: captchaTokenField,
        captcha_settings: shortTextField,
    })
    .passthrough();

/**
 * Lender "get listed" application. Used by GetListedLendersPostForm.
 */
export const getListedLendersSchema = z
    .object({
        firstName: nameField,
        lastName: nameField,
        email: emailField,
        phone: phoneField,
        status_select: shortTextField,
        branch_select: shortTextField,
        discharge_status: shortTextField,
        primaryState: shortTextField,
        otherStates: otherStatesField,
        localCities: longTextField,
        nmlsId: shortTextField,
        name: nameField,
        street: shortTextField,
        state: shortTextField,
        city: shortTextField,
        zip: shortTextField,
        companyNMLSId: shortTextField,
        howDidYouHear: shortTextField,
        tellusMore: longTextField,
        additionalComments: longTextField,
        captchaToken: captchaTokenField,
        captcha_settings: shortTextField,
    })
    .passthrough();

/**
 * Internship application. Used by internshipFormSubmission.
 * This form's payload keys are raw Salesforce custom-field IDs plus a few named fields,
 * and its captcha token arrives under the literal `g-recaptcha-response` key.
 * Discharge status may arrive as a single value or a one-element array.
 */
export const internshipSchema = z
    .object({
        first_name: nameField,
        last_name: nameField,
        email: emailField,
        mobile: phoneField,
        state_code: shortTextField,
        city: shortTextField,
        base: shortTextField,
        '00N4x00000LsnP2': shortTextField,
        '00N4x00000LsnOx': shortTextField,
        '00N4x00000QQ0Vz': z
            .union([z.string().trim().max(255), z.array(z.string().trim().max(255)).max(20)])
            .optional(),
        '00N4x00000QPK7L': shortTextField,
        '00N4x00000LspV2': shortTextField,
        '00N4x00000LspUi': shortTextField,
        '00N4x00000QPLQY': longTextField,
        '00N4x00000QPLQd': longTextField,
        '00N4x00000QPksj': shortTextField,
        '00N4x00000QPS7V': longTextField,
        'g-recaptcha-response': captchaTokenField,
        captcha_settings: shortTextField,
    })
    .passthrough();

// ---- Helper ----------------------------------------------------------------------------

export type ParseLeadFormResult<T> =
    | { ok: true; data: T }
    | { ok: false; errors: string[] };

/**
 * Validate an arbitrary form payload against a zod schema (v4 .safeParse API).
 * On success returns the parsed (trimmed/normalized) data; on failure returns a flat list
 * of human-readable "path: message" error strings suitable for logging/returning.
 */
export function parseLeadForm<S extends z.ZodTypeAny>(
    schema: S,
    data: unknown
): ParseLeadFormResult<z.infer<S>> {
    const result = schema.safeParse(data);
    if (result.success) {
        return { ok: true, data: result.data };
    }

    const errors = result.error.issues.map((issue) => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
    });

    return { ok: false, errors };
}
