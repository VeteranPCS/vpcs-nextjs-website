import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
    {
        extends: [...nextCoreWebVitals],
    },
    {
        // React Compiler / react-hooks rules added in eslint-config-next@16.
        // These flag pre-existing valid patterns as errors. Refactoring the
        // 17+ flagged sites is out of scope for the Next 14 → 16 upgrade.
        // Re-enable as a separate follow-up once React Compiler adoption is planned.
        // TODO(https://github.com/VeteranPCS/vpcs-nextjs-website/issues/149):
        // re-enable these four rules once the ~17 flagged sites are fixed.
        rules: {
            "react-hooks/immutability": "off",
            "react-hooks/set-state-in-effect": "off",
            "react-hooks/incompatible-library": "off",
            "react-hooks/purity": "off",
        },
    },
    {
        files: ['**/*.{ts,tsx}'],
        ignores: ['lib/salesforce/ids.ts', 'scripts/**', '**/__tests__/**', '**/*.test.{ts,tsx}'],
        rules: {
            'no-restricted-syntax': ['error',
                {
                    selector: "Literal[value=/^(00D|0124|005)[A-Za-z0-9]{7,}$/]",
                    message: 'Hardcoded Salesforce id. Import SF_ORG_ID / SF_RECORD_TYPE / SF_LEAD_OWNER from @/lib/salesforce/ids instead.',
                },
                {
                    // SOQL injection guard: flag a raw value interpolated into a
                    // multi-line SOQL query template (one that opens `\n ... SELECT`).
                    // A `${value}` inside a single-quoted SOQL string literal must be
                    // passed through escapeSoqlLiteral() (services/soql.ts) so a
                    // quote can't break out of the literal and rewrite the query.
                    //
                    // Allowed forms (defense-in-depth conventions, not proofs):
                    //   - a CallExpression  → e.g. escapeSoqlLiteral(x), conditions.join(...)
                    //   - an ALL_CAPS constant identifier → a compile-time constant, not user input
                    //   - a `safe`-prefixed identifier → the codebase's sanitized-value naming convention
                    // Anything else (a bare lowercase identifier or a member access
                    // like `req.body.id`) is treated as raw interpolation and flagged.
                    selector:
                        "TemplateLiteral[quasis.0.value.raw=/^\\n\\s*SELECT\\s/i] > :not(TemplateElement):not(CallExpression):not(Identifier[name=/^(safe.*|[A-Z][A-Z0-9_]*)$/])",
                    message: 'Raw value interpolated into a SOQL query. Wrap user-derived values in escapeSoqlLiteral() (services/soql.ts) so a single quote cannot break out of the string literal.',
                },
            ],
        },
    },
]);
