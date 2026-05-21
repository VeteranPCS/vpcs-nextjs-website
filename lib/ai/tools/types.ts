import { z } from 'zod';

export const stateInputSchema = z.object({
  state: z
    .string()
    .min(2)
    .describe('US state name (e.g., "Texas") or slug (e.g., "texas"). The tool handles both.'),
});

export const bahInputSchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}$/)
    .describe('4-digit BAH year (e.g., "2026"). Use the current year unless the user specifies otherwise.'),
  zipCode: z
    .string()
    .regex(/^\d{5}$/)
    .describe('5-digit US ZIP code for the duty station or destination.'),
  rank: z
    .string()
    .min(2)
    .describe('Military pay grade like "E5", "O3", "W2". Case-insensitive.'),
});

const contactBase = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(7),
});

export const agentRequestSchema = contactBase.extend({
  destinationState: z.string().min(2).describe('Full US state name the user is moving to.'),
  destinationCity: z.string().optional(),
  currentLocation: z.string().optional(),
  branch: z.string().optional().describe('Military branch (e.g., Army, Navy).'),
  rank: z.string().optional(),
  message: z.string().optional().describe('Any context the user wants to share with the agent.'),
});

export const lenderRequestSchema = contactBase.extend({
  destinationState: z.string().min(2),
  destinationCity: z.string().optional(),
  loanType: z.string().optional().describe('e.g., "VA loan", "conventional", "refinance".'),
  message: z.string().optional(),
});

export const generalInquirySchema = contactBase.extend({
  subject: z.string().min(1).describe('Short subject line summarizing what the user needs.'),
  message: z.string().min(1).describe('The user\'s question or request, in their words.'),
});

export const vaLoanGuideSchema = contactBase.extend({
  destinationState: z.string().optional(),
});

export type AgentRequestInput = z.infer<typeof agentRequestSchema>;
export type LenderRequestInput = z.infer<typeof lenderRequestSchema>;
export type GeneralInquiryInput = z.infer<typeof generalInquirySchema>;
export type VALoanGuideInput = z.infer<typeof vaLoanGuideSchema>;
export type BAHInput = z.infer<typeof bahInputSchema>;

export interface ToolErrorResult {
  ok: false;
  error: string;
}

export interface ToolSuccessResult<T> {
  ok: true;
  data: T;
}

export type ToolResult<T> = ToolSuccessResult<T> | ToolErrorResult;
