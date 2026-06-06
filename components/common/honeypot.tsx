'use client';

import { forwardRef, useCallback, useRef } from 'react';
import { HP_FIELD, TS_FIELD } from '@/lib/validation/spam-fields';

/**
 * Phase-2 lead-spam client primitive (honeypot + submit-timing).
 *
 * Lead forms in this app use react-hook-form, whose `handleSubmit` only
 * delivers *registered* fields to the submit handler. A bare hidden input is
 * therefore invisible to the payload — so we read the honeypot via an
 * uncontrolled ref and merge it into the outgoing object manually. That same
 * "bypass the form library" property is what we want: a real user never sees
 * or fills the field, react-hook-form/yup never validate it, and only a blind
 * bot that fills every input trips it.
 *
 * Usage:
 *   const { ref, getSpamFields } = useHoneypot();
 *   ...
 *   <HoneypotField ref={ref} />                       // anywhere inside the <form>
 *   ...
 *   await someLeadAction({ ...data, ...getSpamFields() });
 *
 * The server reads these back via `evaluateLeadSpam({ honeypot, renderedAt })`.
 */
export function useHoneypot() {
  const ref = useRef<HTMLInputElement>(null);
  // Captured on first render (form open). Lives only in a ref, never rendered,
  // so there is no SSR/hydration mismatch from the differing server/client clock.
  const renderedAtRef = useRef<number>(Date.now());

  /**
   * Payload fields to merge into a lead submission at submit time. The return
   * type is left to inference so the keys stay precise literals
   * (`{ company_website: string; form_rendered_at: number }`) rather than a
   * string index signature — that lets `{ ...formData, ...getSpamFields() }`
   * spread cleanly into strongly-typed react-hook-form payloads without
   * index-signature conflicts.
   *
   * Memoized with an empty dep array (it only reads from the two stable refs)
   * so it has a constant identity across renders. That keeps it safe to list
   * in a submit-effect's dependency array — the multi-step get-listed pages
   * call it from inside a `useEffect`, and an unstable identity there would
   * re-fire the effect every render (risking a double submit).
   */
  const getSpamFields = useCallback(
    () => ({
      [HP_FIELD]: ref.current?.value ?? '',
      [TS_FIELD]: renderedAtRef.current,
    }),
    [],
  );

  return { ref, getSpamFields };
}

/**
 * Visually-hidden honeypot input. Off-screen (not `display:none`, which naive
 * bots skip) so it stays in the DOM and fillable by automated fillers, while
 * `aria-hidden` + `tabIndex={-1}` keep it away from screen readers and keyboard
 * users and `autoComplete="off"` keeps password managers from autofilling it
 * (which would falsely quarantine a real user). Pair with `useHoneypot()`.
 */
export const HoneypotField = forwardRef<HTMLInputElement>(function HoneypotField(_props, ref) {
  return (
    <input
      ref={ref}
      type="text"
      name={HP_FIELD}
      defaultValue=""
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 'auto',
        width: '1px',
        height: '1px',
        opacity: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    />
  );
});
