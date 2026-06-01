/**
 * Client-safe constants shared between the server-side concierge tools
 * (`lib/ai/tools/lead-tools.ts`) and the client-side renderer
 * (`components/Concierge/MessageRenderer.tsx`).
 *
 * This module MUST stay free of server-only imports (no `node:*`, no Salesforce
 * services, no secrets). It exists precisely so the client renderer can share a
 * string with the tools layer WITHOUT pulling the server tool graph — and its
 * transitive `node:crypto` usage — into the browser bundle.
 */
export const SUCCESS_MESSAGE =
  "We've shared your details. A team member will reach out shortly.";
