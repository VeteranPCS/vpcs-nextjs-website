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
        rules: {
            "react-hooks/immutability": "off",
            "react-hooks/set-state-in-effect": "off",
            "react-hooks/incompatible-library": "off",
            "react-hooks/purity": "off",
        },
    },
]);
