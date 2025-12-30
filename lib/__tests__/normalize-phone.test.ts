// lib/__tests__/normalize-phone.test.ts

import { normalizePhone } from '../normalize-phone';

describe('normalizePhone', () => {
  describe('formats found in Salesforce Account.csv', () => {
    test('handles (XXX) XXX-XXXX format', () => {
      expect(normalizePhone('(719) 445-1843')).toBe('+17194451843');
      expect(normalizePhone('(205) 213-5388')).toBe('+12052135388');
      expect(normalizePhone('(210) 493-3030')).toBe('+12104933030');
    });

    test('handles XXX-XXX-XXXX format', () => {
      expect(normalizePhone('208-996-3142')).toBe('+12089963142');
      expect(normalizePhone('214-578-1641')).toBe('+12145781641');
      expect(normalizePhone('480-747-4394')).toBe('+14807474394');
    });

    test('handles 10-digit format with no separators', () => {
      expect(normalizePhone('2025475600')).toBe('+12025475600');
      expect(normalizePhone('3109065858')).toBe('+13109065858');
      expect(normalizePhone('4042621234')).toBe('+14042621234');
    });

    test('handles 11-digit format starting with 1', () => {
      expect(normalizePhone('18055704821')).toBe('+18055704821');
      expect(normalizePhone('13157716222')).toBe('+13157716222');
    });
  });

  describe('edge cases', () => {
    test('handles null and undefined', () => {
      expect(normalizePhone(null)).toBe(null);
      expect(normalizePhone(undefined)).toBe(null);
    });

    test('handles empty string', () => {
      expect(normalizePhone('')).toBe(null);
    });

    test('handles invalid/test numbers', () => {
      expect(normalizePhone('0000000000')).toBe('+10000000000');
      expect(normalizePhone('1234567890')).toBe('+11234567890');
    });

    test('handles numbers with spaces', () => {
      expect(normalizePhone('719 445 1843')).toBe('+17194451843');
      expect(normalizePhone('1 719 445 1843')).toBe('+17194451843');
    });

    test('handles numbers with dots', () => {
      expect(normalizePhone('719.445.1843')).toBe('+17194451843');
      expect(normalizePhone('1.719.445.1843')).toBe('+17194451843');
    });

    test('handles numbers with mixed separators', () => {
      expect(normalizePhone('(719) 445.1843')).toBe('+17194451843');
      expect(normalizePhone('719-445.1843')).toBe('+17194451843');
    });

    test('returns null for too-short numbers', () => {
      expect(normalizePhone('123')).toBe(null);
      expect(normalizePhone('12345')).toBe(null);
      expect(normalizePhone('123456789')).toBe(null);
    });

    test('handles international numbers (12+ digits)', () => {
      expect(normalizePhone('441234567890')).toBe('+441234567890');
      expect(normalizePhone('861234567890')).toBe('+861234567890');
    });
  });

  describe('already normalized numbers', () => {
    test('preserves E.164 format', () => {
      expect(normalizePhone('+17194451843')).toBe('+17194451843');
      expect(normalizePhone('+12052135388')).toBe('+12052135388');
    });
  });
});

// Simple test runner for Node.js (if no test framework is set up)
if (require.main === module) {
  console.log('Running normalize-phone tests...\n');

  const tests = [
    // Salesforce formats
    { input: '(719) 445-1843', expected: '+17194451843', desc: '(XXX) XXX-XXXX format' },
    { input: '208-996-3142', expected: '+12089963142', desc: 'XXX-XXX-XXXX format' },
    { input: '2025475600', expected: '+12025475600', desc: '10-digit no separators' },
    { input: '18055704821', expected: '+18055704821', desc: '11-digit with leading 1' },

    // Edge cases
    { input: null, expected: null, desc: 'null input' },
    { input: undefined, expected: null, desc: 'undefined input' },
    { input: '', expected: null, desc: 'empty string' },
    { input: '719 445 1843', expected: '+17194451843', desc: 'spaces as separators' },
    { input: '719.445.1843', expected: '+17194451843', desc: 'dots as separators' },
    { input: '(719) 445.1843', expected: '+17194451843', desc: 'mixed separators' },
    { input: '123', expected: null, desc: 'too short' },
    { input: '+17194451843', expected: '+17194451843', desc: 'already E.164' },
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach(({ input, expected, desc }) => {
    const result = normalizePhone(input as any);
    if (result === expected) {
      console.log(`✓ ${desc}`);
      passed++;
    } else {
      console.log(`✗ ${desc}`);
      console.log(`  Input: ${JSON.stringify(input)}`);
      console.log(`  Expected: ${expected}`);
      console.log(`  Got: ${result}`);
      failed++;
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
