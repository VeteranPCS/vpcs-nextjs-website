/**
 * SOQL string-literal hardening helpers.
 *
 * User-derived values that flow into SOQL `WHERE` clauses must never be
 * interpolated raw: a single quote breaks out of the string literal and
 * rewrites the query (classic SOQL injection that can exfiltrate Person
 * Account PII). `encodeURIComponent` only protects URL transport — it does
 * NOT escape SOQL — so we need both:
 *
 *   1. Validation (`isStateCode`) rejects anything that isn't the shape we
 *      expect at the edge of the system, so malicious input never reaches the
 *      query builder in the first place.
 *   2. Escaping (`escapeSoqlLiteral`) neutralises the SOQL metacharacters of
 *      whatever does get interpolated.
 *
 * Using BOTH is deliberate defense in depth: validation is the primary gate,
 * and escaping is the backstop that keeps a single missed validation from
 * becoming an injection.
 */

/**
 * Escape a value for safe inclusion inside a single-quoted SOQL string
 * literal, per Salesforce SOQL string-literal rules.
 *
 * Order matters: escape the backslash FIRST (`\` -> `\\`) so we don't
 * double-escape the backslashes we add for the other characters, then escape
 * the single quote (`'` -> `\'`). The remaining reserved characters
 * (double-quote, newline, carriage return, tab) are escaped defensively.
 */
export function escapeSoqlLiteral(value: string): string {
  return value
    .replace(/\\/g, '\\\\') // backslash first
    .replace(/'/g, "\\'") // single quote
    .replace(/"/g, '\\"') // double quote
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Type guard: true only for a 2-letter A–Z state code (case-insensitive),
 * e.g. `"TX"` or `"tx"`. Rejects empty strings, full names (`"texas"`), and
 * injection payloads (`"TX' OR 1=1"`).
 */
export function isStateCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z]{2}$/.test(value);
}
