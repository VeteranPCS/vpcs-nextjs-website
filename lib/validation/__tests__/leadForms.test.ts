import { describe, it, expect } from 'vitest';
import {
    parseLeadForm,
    simpleLeadSchema,
    contactAgentSchema,
    contactLenderSchema,
    getListedAgentsSchema,
    internshipSchema,
    hasPlausiblePhone,
    containsLink,
} from '../leadForms';

// ---------------------------------------------------------------------------
// requireContactMethod — tested via parseLeadForm on the three refined schemas
// ---------------------------------------------------------------------------

describe('requireContactMethod via simpleLeadSchema', () => {
    it('valid email only (no phone) → ok:true', () => {
        const result = parseLeadForm(simpleLeadSchema, { email: 'user@example.com' });
        expect(result.ok).toBe(true);
    });

    it('plausible phone only (no email) → ok:true', () => {
        const result = parseLeadForm(simpleLeadSchema, { phone: '5551234567' });
        expect(result.ok).toBe(true);
    });

    it('neither email nor phone → ok:false with required message', () => {
        const result = parseLeadForm(simpleLeadSchema, { firstName: 'Spam' });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors.some((e) => e.includes('A valid email or phone number is required.'))).toBe(true);
        }
    });

    it('malformed email + no phone → ok:false', () => {
        // emailField has .email() validation — this fails at field level first
        const result = parseLeadForm(simpleLeadSchema, { email: 'not-an-email' });
        expect(result.ok).toBe(false);
    });

    it('oversized free-text (additionalComments > 5000 chars) + valid email → ok:false', () => {
        // longTextField = optionalString(5000); max is 5000
        const result = parseLeadForm(simpleLeadSchema, {
            email: 'user@example.com',
            additionalComments: 'a'.repeat(5001),
        });
        expect(result.ok).toBe(false);
    });

    it('passthrough preserved: unknown keys survive when valid', () => {
        const result = parseLeadForm(simpleLeadSchema, {
            email: 'a@b.com',
            someExtraKey: 'x',
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect((result.data as any).someExtraKey).toBe('x');
        }
    });
});

describe('requireContactMethod via contactAgentSchema', () => {
    it('valid email only → ok:true', () => {
        const result = parseLeadForm(contactAgentSchema, { email: 'agent@example.com' });
        expect(result.ok).toBe(true);
    });

    it('plausible phone only → ok:true', () => {
        const result = parseLeadForm(contactAgentSchema, { phone: '5559876543' });
        expect(result.ok).toBe(true);
    });

    it('neither email nor phone → ok:false with required message', () => {
        const result = parseLeadForm(contactAgentSchema, { firstName: 'Test' });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors.some((e) => e.includes('A valid email or phone number is required.'))).toBe(true);
        }
    });

    it('valid state code is normalized to uppercase', () => {
        const result = parseLeadForm(contactAgentSchema, {
            email: 'agent@example.com',
            state: 'tx',
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data.state).toBe('TX');
        }
    });

    it('invalid state code → ok:false', () => {
        const result = parseLeadForm(contactAgentSchema, {
            email: 'agent@example.com',
            state: 'ZZ',
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors.some((e) => e.includes('Invalid state selected'))).toBe(true);
        }
    });
});

describe('requireContactMethod via contactLenderSchema', () => {
    it('valid email only → ok:true', () => {
        const result = parseLeadForm(contactLenderSchema, { email: 'lender@example.com' });
        expect(result.ok).toBe(true);
    });

    it('plausible phone only → ok:true', () => {
        const result = parseLeadForm(contactLenderSchema, { phone: '5550001111' });
        expect(result.ok).toBe(true);
    });

    it('neither email nor phone → ok:false with required message', () => {
        const result = parseLeadForm(contactLenderSchema, { firstName: 'Test' });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors.some((e) => e.includes('A valid email or phone number is required.'))).toBe(true);
        }
    });

    it('valid state code is normalized to uppercase', () => {
        const result = parseLeadForm(contactLenderSchema, {
            email: 'lender@example.com',
            state: 'fl',
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data.state).toBe('FL');
        }
    });

    it('invalid state code → ok:false', () => {
        const result = parseLeadForm(contactLenderSchema, {
            email: 'lender@example.com',
            state: 'ZZ',
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors.some((e) => e.includes('Invalid state selected'))).toBe(true);
        }
    });
});

// ---------------------------------------------------------------------------
// Scoping guard: getListedAgentsSchema and internshipSchema must NOT be refined
// ---------------------------------------------------------------------------

describe('scoping guard — unrefined schemas', () => {
    it('getListedAgentsSchema: neither email nor phone → ok:true', () => {
        const result = parseLeadForm(getListedAgentsSchema, { firstName: 'Test' });
        expect(result.ok).toBe(true);
    });

    it('internshipSchema: neither email nor phone → ok:true', () => {
        const result = parseLeadForm(internshipSchema, { first_name: 'Test' });
        expect(result.ok).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// containsLink
// ---------------------------------------------------------------------------

describe('containsLink', () => {
    it('"http://x.com" → true', () => {
        expect(containsLink('http://x.com')).toBe(true);
    });

    it('"https://x" → true', () => {
        expect(containsLink('https://x')).toBe(true);
    });

    it('"visit www.x.com" → true', () => {
        expect(containsLink('visit www.x.com')).toBe(true);
    });

    it('"<a href" → true', () => {
        expect(containsLink('<a href')).toBe(true);
    });

    it('"plain text" → false', () => {
        expect(containsLink('plain text')).toBe(false);
    });

    it('undefined → false', () => {
        expect(containsLink(undefined)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// hasPlausiblePhone
// ---------------------------------------------------------------------------

describe('hasPlausiblePhone', () => {
    it('10-digit string → true', () => {
        expect(hasPlausiblePhone('5551234567')).toBe(true);
    });

    it('15-digit string → true', () => {
        expect(hasPlausiblePhone('123456789012345')).toBe(true);
    });

    it('9-digit string → false', () => {
        expect(hasPlausiblePhone('123456789')).toBe(false);
    });

    it('16-digit string → false', () => {
        expect(hasPlausiblePhone('1234567890123456')).toBe(false);
    });

    it('undefined → false', () => {
        expect(hasPlausiblePhone(undefined)).toBe(false);
    });

    it('formatted "(555) 123-4567" (10 digits) → true', () => {
        expect(hasPlausiblePhone('(555) 123-4567')).toBe(true);
    });
});
