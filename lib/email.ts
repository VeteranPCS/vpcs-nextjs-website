// lib/email.ts
// Resend email client with Attio note logging for CRM visibility.
// All transactional emails go through this wrapper so admins can see
// email activity on Attio record timelines.

import { Resend } from 'resend';
import { attio } from './attio';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
  // Log a note on the Attio record so admins see email activity in the CRM
  attioNote?: {
    objectSlug: string;   // e.g., 'customers', 'agents', 'lenders', 'interns'
    recordId: string;
    emailLabel: string;   // e.g., 'C2: Customer Welcome with Agent'
  };
}

export async function sendEmail(options: SendEmailOptions): Promise<{ id: string }> {
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'VeteranPCS <tech@veteranpcs.com>';

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: options.to,
    subject: options.subject,
    react: options.react,
  });

  if (error) {
    throw new Error(`Email send failed: ${error.message}`);
  }

  // Log note on Attio record for admin visibility (non-fatal)
  if (options.attioNote) {
    const { objectSlug, recordId, emailLabel } = options.attioNote;
    attio.createNote(
      objectSlug,
      recordId,
      `Email sent: ${emailLabel}`,
      `To: ${options.to}\nSubject: ${options.subject}`,
    ).catch(() => {
      // Silently ignore — don't fail the email send for a note logging error
    });
  }

  return data!;
}
