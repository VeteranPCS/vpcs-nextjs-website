// lib/__tests__/normalize-phone.simple.test.ts
// Simple test runner that can be executed with: npx tsx lib/__tests__/normalize-phone.simple.test.ts

import { normalizePhone } from '../normalize-phone';

console.log('Running normalize-phone tests based on Salesforce Account.csv data...\n');

type TestCase = {
  input: string | null | undefined;
  expected: string | null;
  desc: string;
};

const tests: TestCase[] = [
  // Formats found in Salesforce Account.csv
  { input: '(719) 445-1843', expected: '+17194451843', desc: '(XXX) XXX-XXXX format' },
  { input: '(205) 213-5388', expected: '+12052135388', desc: '(XXX) XXX-XXXX format (2)' },
  { input: '(210) 493-3030', expected: '+12104933030', desc: '(XXX) XXX-XXXX format (3)' },

  { input: '208-996-3142', expected: '+12089963142', desc: 'XXX-XXX-XXXX format' },
  { input: '214-578-1641', expected: '+12145781641', desc: 'XXX-XXX-XXXX format (2)' },
  { input: '480-747-4394', expected: '+14807474394', desc: 'XXX-XXX-XXXX format (3)' },

  { input: '2025475600', expected: '+12025475600', desc: '10-digit no separators' },
  { input: '3109065858', expected: '+13109065858', desc: '10-digit no separators (2)' },
  { input: '4042621234', expected: '+14042621234', desc: '10-digit no separators (3)' },

  { input: '18055704821', expected: '+18055704821', desc: '11-digit with leading 1' },
  { input: '13157716222', expected: '+13157716222', desc: '11-digit with leading 1 (2)' },

  // Edge cases
  { input: null, expected: null, desc: 'null input' },
  { input: undefined, expected: null, desc: 'undefined input' },
  { input: '', expected: null, desc: 'empty string' },

  { input: '0000000000', expected: '+10000000000', desc: 'invalid test number (zeros)' },
  { input: '1234567890', expected: '+11234567890', desc: 'invalid test number (sequential)' },

  { input: '719 445 1843', expected: '+17194451843', desc: 'spaces as separators' },
  { input: '1 719 445 1843', expected: '+17194451843', desc: 'spaces with leading 1' },

  { input: '719.445.1843', expected: '+17194451843', desc: 'dots as separators' },
  { input: '1.719.445.1843', expected: '+17194451843', desc: 'dots with leading 1' },

  { input: '(719) 445.1843', expected: '+17194451843', desc: 'mixed separators' },
  { input: '719-445.1843', expected: '+17194451843', desc: 'mixed dash and dot' },

  { input: '123', expected: null, desc: 'too short (3 digits)' },
  { input: '12345', expected: null, desc: 'too short (5 digits)' },
  { input: '123456789', expected: null, desc: 'too short (9 digits)' },

  { input: '441234567890', expected: '+441234567890', desc: 'international UK number' },
  { input: '861234567890', expected: '+861234567890', desc: 'international China number' },

  { input: '+17194451843', expected: '+17194451843', desc: 'already E.164 format' },
  { input: '+12052135388', expected: '+12052135388', desc: 'already E.164 format (2)' },
];

let passed = 0;
let failed = 0;

tests.forEach(({ input, expected, desc }) => {
  const result = normalizePhone(input);
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

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`${passed} passed, ${failed} failed`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

process.exit(failed > 0 ? 1 : 0);
