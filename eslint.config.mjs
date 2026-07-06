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
            'no-restricted-syntax': ['error', {
                selector: "Literal[value=/^(00D|0124|005)[A-Za-z0-9]{7,}$/]",
                message: 'Hardcoded Salesforce id. Import SF_ORG_ID / SF_RECORD_TYPE / SF_LEAD_OWNER from @/lib/salesforce/ids instead.',
            }],
        },
    },
]);
