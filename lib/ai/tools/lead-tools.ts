import 'server-only';
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
import { INTERNAL_CALL_TOKEN } from '@/lib/internal-call-token';
import { SUCCESS_MESSAGE } from '@/lib/ai/tools/messages';
import { captureServerAnalyticsEvent } from '@/lib/analytics/server';
import { normalizeStateCode, normalizeStateSlug } from '@/lib/states';

interface LeadSuccess {
  kind: 'agent' | 'lender' | 'general' | 'va_guide';
  message: string;
}

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

type SubmitToolName =
  | 'submitAgentRequest'
  | 'submitLenderRequest'
  | 'submitGeneralInquiry'
  | 'submitVALoanGuideRequest';

function safeContext(analyticsContext: Record<string, unknown>): Record<string, unknown> {
  return {
    vpcs_visitor_id: analyticsContext.vpcs_visitor_id,
    source_page_path: analyticsContext.source_page_path,
    first_touch_attribution: analyticsContext.first_touch_attribution,
    last_touch_attribution: analyticsContext.last_touch_attribution,
    pageview_count_before_conversion: analyticsContext.pageview_count_before_conversion,
    cta_click_count_before_conversion: analyticsContext.cta_click_count_before_conversion,
    form_attempt_count_before_conversion: analyticsContext.form_attempt_count_before_conversion,
  };
}

export function buildLeadTools(analyticsContext: Record<string, unknown> = {}) {
const analyticsFormContext = safeContext(analyticsContext);

async function captureToolTelemetry(
  event: 'concierge_tool_submitted' | 'concierge_tool_completed' | 'concierge_tool_failed',
  toolName: SubmitToolName,
  properties: Record<string, unknown> = {},
) {
  await captureServerAnalyticsEvent({
    event,
    distinctId: typeof analyticsFormContext.vpcs_visitor_id === 'string'
      ? analyticsFormContext.vpcs_visitor_id
      : undefined,
    properties: {
      ...analyticsFormContext,
      tool_name: toolName,
      ...properties,
    },
  });
}

// --- Agent ---

const submitAgentRequestTool = tool({
  description: `Send the user's contact details to VeteranPCS so a vetted real estate agent can reach out. ${SUBMIT_REQUIRED} Also required: destinationState. The destinationCity, currentLocation, branch, rank, and message fields are optional context.`,
  inputSchema: agentRequestSchema,
  needsApproval: true,
  execute: async (input): Promise<ToolResult<LeadSuccess>> => {
    const toolName = 'submitAgentRequest';
    const stateCode = normalizeStateCode(input.destinationState) ?? undefined;
    const stateSlug = normalizeStateSlug(input.destinationState) ?? undefined;
    try {
      await captureToolTelemetry('concierge_tool_submitted', toolName, {
        form_id: 'contact_agent',
        lead_source: 'Contact Agent',
        state_code: stateCode,
        state_slug: stateSlug,
      });
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
        ...analyticsFormContext,
      };
      logInfo('Concierge tool: submitAgentRequest', {
        destinationState: input.destinationState,
        hasMessage: Boolean(input.message),
      });
      await contactAgentPostForm(formData, '', { internalCallToken: INTERNAL_CALL_TOKEN });
      await captureToolTelemetry('concierge_tool_completed', toolName, {
        form_id: 'contact_agent',
        lead_source: 'Contact Agent',
        state_code: stateCode,
        state_slug: stateSlug,
      });
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
      await captureToolTelemetry('concierge_tool_failed', toolName, {
        form_id: 'contact_agent',
        lead_source: 'Contact Agent',
        state_code: stateCode,
        state_slug: stateSlug,
        failure_stage: 'tool_execute',
        error_codes: ['submission_failed'],
      });
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
    const toolName = 'submitLenderRequest';
    const stateCode = normalizeStateCode(input.destinationState) ?? undefined;
    const stateSlug = normalizeStateSlug(input.destinationState) ?? undefined;
    try {
      await captureToolTelemetry('concierge_tool_submitted', toolName, {
        form_id: 'contact_lender',
        lead_source: 'Contact Lender',
        state_code: stateCode,
        state_slug: stateSlug,
      });
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
        state: input.destinationState,
        additionalComments,
        ...analyticsFormContext,
      };
      logInfo('Concierge tool: submitLenderRequest', {
        destinationState: input.destinationState,
        hasMessage: Boolean(input.message),
      });
      await contactLenderPostForm(formData, '', { internalCallToken: INTERNAL_CALL_TOKEN });
      await captureToolTelemetry('concierge_tool_completed', toolName, {
        form_id: 'contact_lender',
        lead_source: 'Contact Lender',
        state_code: stateCode,
        state_slug: stateSlug,
      });
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
      await captureToolTelemetry('concierge_tool_failed', toolName, {
        form_id: 'contact_lender',
        lead_source: 'Contact Lender',
        state_code: stateCode,
        state_slug: stateSlug,
        failure_stage: 'tool_execute',
        error_codes: ['submission_failed'],
      });
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
    const toolName = 'submitGeneralInquiry';
    try {
      await captureToolTelemetry('concierge_tool_submitted', toolName, {
        form_id: 'contact_form',
        lead_source: 'Contact Form',
      });
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
        ...analyticsFormContext,
      };
      logInfo('Concierge tool: submitGeneralInquiry', {
        hasSubject: Boolean(input.subject),
      });
      await contactPostForm(formData, { internalCallToken: INTERNAL_CALL_TOKEN });
      await captureToolTelemetry('concierge_tool_completed', toolName, {
        form_id: 'contact_form',
        lead_source: 'Contact Form',
      });
      return {
        ok: true,
        data: { kind: 'general', message: SUCCESS_MESSAGE },
      };
    } catch (error) {
      logError('Concierge tool: submitGeneralInquiry failed', undefined, error);
      await captureToolTelemetry('concierge_tool_failed', toolName, {
        form_id: 'contact_form',
        lead_source: 'Contact Form',
        failure_stage: 'tool_execute',
        error_codes: ['submission_failed'],
      });
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
    const toolName = 'submitVALoanGuideRequest';
    const stateCode = normalizeStateCode(input.destinationState) ?? undefined;
    const stateSlug = normalizeStateSlug(input.destinationState) ?? undefined;
    try {
      await captureToolTelemetry('concierge_tool_submitted', toolName, {
        form_id: 'va_loan_guide',
        lead_source: 'VA Loan Guide',
        guide_id: 'va_loan_guide',
        state_code: stateCode,
        state_slug: stateSlug,
      });
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
        ...analyticsFormContext,
      };
      logInfo('Concierge tool: submitVALoanGuideRequest', {
        hasState: Boolean(input.destinationState),
      });
      await vaLoanGuideForm(formData, { internalCallToken: INTERNAL_CALL_TOKEN });
      await captureToolTelemetry('concierge_tool_completed', toolName, {
        form_id: 'va_loan_guide',
        lead_source: 'VA Loan Guide',
        guide_id: 'va_loan_guide',
        state_code: stateCode,
        state_slug: stateSlug,
      });
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
      await captureToolTelemetry('concierge_tool_failed', toolName, {
        form_id: 'va_loan_guide',
        lead_source: 'VA Loan Guide',
        guide_id: 'va_loan_guide',
        state_code: stateCode,
        state_slug: stateSlug,
        failure_stage: 'tool_execute',
        error_codes: ['submission_failed'],
      });
      return { ok: false, error: errorMessage(error) };
    }
  },
});

return {
  submitAgentRequest: submitAgentRequestTool,
  submitLenderRequest: submitLenderRequestTool,
  submitGeneralInquiry: submitGeneralInquiryTool,
  submitVALoanGuideRequest: submitVALoanGuideRequestTool,
};
}
