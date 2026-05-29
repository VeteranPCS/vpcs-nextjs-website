import { tool } from 'ai';
import {
  contactAgentPostForm,
  contactLenderPostForm,
  contactPostForm,
  vaLoanGuideForm,
} from '@/services/salesForcePostFormsService';
import { logError, logInfo } from '@/services/loggingService';
import {
  agentRequestSchema,
  lenderRequestSchema,
  generalInquirySchema,
  vaLoanGuideSchema,
  type ToolResult,
} from '@/lib/ai/tools/types';

interface LeadSuccess {
  kind: 'agent' | 'lender' | 'general' | 'va_guide';
  message: string;
}

export const SUCCESS_MESSAGE =
  "We've shared your details. A team member will reach out shortly.";

const SUBMIT_REQUIRED =
  'Required: first name, last name, email, phone. The SDK-level approval gate handles confirmation — emit the call when the user has provided the required fields.';

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Submission failed.';
}

// Overwrites SF additionalComments on each call — fine for single-submit flows;
// a retry within one conversation will replace prior context.
function composeAdditionalComments(parts: Array<[string, string | undefined]>): string {
  const prefix = '[via Concierge]';
  const filled = parts
    .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
    .map(([label, v]) => `${label}: ${(v as string).trim()}`);
  return `${prefix} ${filled.join(' | ')}`.trim();
}

// --- Agent ---

const submitAgentRequestTool = tool({
  description: `Send the user's contact details to VeteranPCS so a vetted real estate agent can reach out. ${SUBMIT_REQUIRED} Also required: destinationState. The destinationCity, currentLocation, branch, rank, and message fields are optional context.`,
  inputSchema: agentRequestSchema,
  needsApproval: true,
  execute: async (input): Promise<ToolResult<LeadSuccess>> => {
    try {
      const additionalComments = composeAdditionalComments([
        ['Rank', input.rank],
        ['Branch', input.branch],
        ['Message', input.message],
      ]);
      const formData = {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        state: input.destinationState,
        destinationBase: input.destinationCity ?? '',
        currentBase: input.currentLocation ?? '',
        branch_select: input.branch ?? '',
        additionalComments,
      };
      logInfo('Concierge tool: submitAgentRequest', {
        destinationState: input.destinationState,
        hasMessage: Boolean(input.message),
      });
      await contactAgentPostForm(formData, '');
      return {
        ok: true,
        data: { kind: 'agent', message: SUCCESS_MESSAGE },
      };
    } catch (error) {
      logError(
        'Concierge tool: submitAgentRequest failed',
        { destinationState: input.destinationState },
        error,
      );
      return { ok: false, error: errorMessage(error) };
    }
  },
});

// --- Lender ---

const submitLenderRequestTool = tool({
  description: `Send the user's contact details to VeteranPCS so a vetted VA-loan lender can reach out. ${SUBMIT_REQUIRED} Also required: destinationState. The destinationCity, loanType, and message fields are optional context.`,
  inputSchema: lenderRequestSchema,
  needsApproval: true,
  execute: async (input): Promise<ToolResult<LeadSuccess>> => {
    try {
      const additionalComments = composeAdditionalComments([
        ['Destination state', input.destinationState],
        ['Destination city', input.destinationCity],
        ['Loan type', input.loanType],
        ['Message', input.message],
      ]);
      const formData = {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        currentBase: input.destinationCity ?? '',
        additionalComments,
      };
      logInfo('Concierge tool: submitLenderRequest', {
        destinationState: input.destinationState,
        hasMessage: Boolean(input.message),
      });
      await contactLenderPostForm(formData, '');
      return {
        ok: true,
        data: { kind: 'lender', message: SUCCESS_MESSAGE },
      };
    } catch (error) {
      logError(
        'Concierge tool: submitLenderRequest failed',
        { destinationState: input.destinationState },
        error,
      );
      return { ok: false, error: errorMessage(error) };
    }
  },
});

// --- General inquiry ---

const submitGeneralInquiryTool = tool({
  description: `Send a general question or request for a human follow-up to the VeteranPCS team. ${SUBMIT_REQUIRED} Also required: subject, message. Use this for escalations (e.g., "Requesting human follow-up").`,
  inputSchema: generalInquirySchema,
  needsApproval: true,
  execute: async (input): Promise<ToolResult<LeadSuccess>> => {
    try {
      const additionalComments = composeAdditionalComments([
        ['Subject', input.subject],
        ['Phone', input.phone],
        ['Message', input.message],
      ]);
      const formData = {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        additionalComments,
      };
      logInfo('Concierge tool: submitGeneralInquiry', {
        hasSubject: Boolean(input.subject),
      });
      await contactPostForm(formData);
      return {
        ok: true,
        data: { kind: 'general', message: SUCCESS_MESSAGE },
      };
    } catch (error) {
      logError('Concierge tool: submitGeneralInquiry failed', undefined, error);
      return { ok: false, error: errorMessage(error) };
    }
  },
});

// --- VA loan guide ---

const submitVALoanGuideRequestTool = tool({
  description: `Send the user's contact details so VeteranPCS can email them the VA Loan Guide. ${SUBMIT_REQUIRED}`,
  inputSchema: vaLoanGuideSchema,
  needsApproval: true,
  execute: async (input): Promise<ToolResult<LeadSuccess>> => {
    try {
      const additionalComments = composeAdditionalComments([
        ['Destination state', input.destinationState],
        ['Phone', input.phone],
      ]);
      const formData = {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        state: input.destinationState ?? '',
        additionalComments,
      };
      logInfo('Concierge tool: submitVALoanGuideRequest', {
        hasState: Boolean(input.destinationState),
      });
      await vaLoanGuideForm(formData);
      return {
        ok: true,
        data: { kind: 'va_guide', message: SUCCESS_MESSAGE },
      };
    } catch (error) {
      logError(
        'Concierge tool: submitVALoanGuideRequest failed',
        undefined,
        error,
      );
      return { ok: false, error: errorMessage(error) };
    }
  },
});

export const leadTools = {
  submitAgentRequest: submitAgentRequestTool,
  submitLenderRequest: submitLenderRequestTool,
  submitGeneralInquiry: submitGeneralInquiryTool,
  submitVALoanGuideRequest: submitVALoanGuideRequestTool,
};
