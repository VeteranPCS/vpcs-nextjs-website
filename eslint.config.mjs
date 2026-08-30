import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tailwind class-name typo guards (see the three no-restricted-syntax entries
// below). Tailwind's JIT silently DROPS any utility it does not recognize and
// passes arbitrary values through VERBATIM, so a class-name typo emits no
// warning from lint, type-check or build. It only shows up as a visual defect
// in production. The 2026-07-06 responsive audit found several that had
// shipped fully green.
//
// These patterns deliberately target only STRUCTURALLY malformed classes, so
// they need no knowledge of Tailwind's utility vocabulary and cannot go stale
// as Tailwind adds utilities. Verified against every class token in app/,
// components/ and pages/: zero false positives.

// Every length, angle, time, resolution and flex unit CSS accepts. Anything
// else glued to a number inside [] is a typo (`600ox`, `10zz`).
const CSS_UNITS = [
    "px", "r?em", "ex", "ch", "cap", "ic", "lh", "rlh",
    "vw", "vh", "vmin", "vmax", "vi", "vb",
    "svw", "svh", "lvw", "lvh", "dvw", "dvh",
    "cqw", "cqh", "cqi", "cqb", "cqmin", "cqmax",
    "cm", "mm", "q", "in", "pt", "pc",
    "deg", "grad", "rad", "turn", "ms", "s", "fr",
    "dpi", "dpcm", "dppx", "x",
].join("|");

// A number immediately followed by letters that are not a real CSS unit.
const BAD_ARBITRARY_UNIT = `\\[-?(?:\\d+\\.?\\d*|\\.\\d+)(?!(?:${CSS_UNITS})\\])[A-Za-z]+\\]`;

// An arbitrary VARIANT that swallowed its utility: `[@media(...):hidden]`
// instead of `[@media(...)]:hidden`. Matches only when a `:` appears after the
// closing paren but still inside the brackets.
const MALFORMED_ARBITRARY_VARIANT = "\\[@[a-z-]+[^\\]]*\\)[^\\]()]*:[^\\]()]*\\]";

// Utilities whose arbitrary value is a <length> and therefore must carry a
// unit. Omitted on purpose: leading, z, flex, order, opacity, grid-cols,
// aspect, scale, rotate, columns and line-clamp all take a valid bare number.
const LENGTH_UTILITIES = [
    "w", "h", "min-w", "min-h", "max-w", "max-h", "size",
    "text", "p", "px", "py", "pt", "pb", "pl", "pr",
    "m", "mx", "my", "mt", "mb", "ml", "mr",
    "gap", "gap-x", "gap-y", "space-x", "space-y",
    "top", "right", "bottom", "left", "inset", "inset-x", "inset-y",
    "rounded", "border", "translate-x", "translate-y",
    "basis", "indent", "scroll-m", "scroll-p",
].join("|");

// A length utility given a bare number with no unit: `text-[45]` emits the
// invalid declaration `color: 45`, which the browser discards. A bare `0` is
// excluded because unitless zero is valid CSS.
const UNITLESS_LENGTH = `(?:^|[\\s:])(?:${LENGTH_UTILITIES})-\\[-?(?!0+(?:\\.0+)?\\])(?:\\d+\\.?\\d*|\\.\\d+)\\]`;

// Class names reach the AST as either a plain string or a template chunk.
const classNameSelector = (source) =>
    `Literal[value=/${source}/], TemplateElement[value.raw=/${source}/]`;

export default defineConfig([
    {
        ignores: [".claude/**"],
    },
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
            // All entries share one array on purpose: in flat config a later
            // block redeclaring `no-restricted-syntax` REPLACES this one
            // rather than merging with it.
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
                {
                    selector: classNameSelector(BAD_ARBITRARY_UNIT),
                    message: 'Unknown CSS unit in a Tailwind arbitrary value (e.g. `w-[600ox]` should be `w-[600px]`). Tailwind copies arbitrary values into the stylesheet verbatim, so the browser silently discards the declaration and the utility does nothing.',
                },
                {
                    selector: classNameSelector(MALFORMED_ARBITRARY_VARIANT),
                    message: 'Malformed Tailwind arbitrary variant: the utility is inside the brackets. Move it after them, e.g. `[@media(pointer:fine):hidden]` should be `[@media(pointer:fine)]:hidden`. As written Tailwind does not recognise the class and emits no CSS at all.',
                },
                {
                    selector: classNameSelector(UNITLESS_LENGTH),
                    message: 'Tailwind arbitrary length is missing its unit (e.g. `text-[45]` should be `text-[45px]`). Without a unit Tailwind emits an invalid declaration such as `color: 45`, which the browser discards.',
                },
            ],
        },
    },
]);
