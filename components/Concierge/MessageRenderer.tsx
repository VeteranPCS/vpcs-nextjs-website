'use client';

import {
  getToolName,
  isTextUIPart,
  isToolUIPart,
  type UIMessage,
} from 'ai';
import AgentCard, { AgentListItem } from './AgentCard';
import StateCard from './StateCard';
import BAHResult from './BAHResult';
import { SUCCESS_MESSAGE } from '@/lib/ai/tools/messages';

interface Props {
  message: UIMessage;
  onSelectAgent?(item: AgentListItem): void;
  onApprove?(id: string, approved: boolean, toolName?: string): void;
}

interface ToolEnvelope<T> {
  ok?: boolean;
  data?: T;
  error?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asEnvelope<T>(output: unknown): ToolEnvelope<T> | null {
  if (!isObject(output)) return null;
  return output as ToolEnvelope<T>;
}

function ErrorBubble({ message }: { message?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-600">
      {message || 'Something went wrong — try again or reach us at support@veteranpcs.com'}
    </div>
  );
}

function LoadingBubble({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-500">
      {label}
    </div>
  );
}

function ConfirmationBubble({ message }: { message?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-primary/5 p-3 text-sm text-primary">
      {message || SUCCESS_MESSAGE}
    </div>
  );
}

function DeniedBubble() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-600">
      Okay — I won&apos;t send anything yet. Let me know when you&apos;re ready.
    </div>
  );
}

interface ApprovalCardProps {
  approvalId: string;
  toolName: string;
  onApprove?(id: string, approved: boolean, toolName?: string): void;
}

function ApprovalCard({ approvalId, toolName, onApprove }: ApprovalCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 flex flex-col gap-2">
      <p className="text-sm text-gray-900">
        I&apos;m about to send your details to VeteranPCS so a real partner can reach out. Ready to send?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onApprove?.(approvalId, true, toolName)}
          disabled={!onApprove}
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-white motion-safe:transition-colors hover:bg-primary-hover disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
        >
          Yes, send it
        </button>
        <button
          type="button"
          onClick={() => onApprove?.(approvalId, false, toolName)}
          disabled={!onApprove}
          className="inline-flex h-9 items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 motion-safe:transition-colors hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Not yet
        </button>
      </div>
    </div>
  );
}

const SUBMIT_TOOL_NAMES = new Set<string>([
  'submitAgentRequest',
  'submitLenderRequest',
  'submitGeneralInquiry',
  'submitVALoanGuideRequest',
]);

function loadingLabel(toolName: string): string {
  switch (toolName) {
    case 'resolveDestinationLocation':
      return 'Resolving destination…';
    case 'findCoverageAreas':
      return 'Checking coverage areas…';
    case 'getPartnersForCoverageArea':
      return 'Looking up partners…';
    case 'getAgentsForState':
      return 'Looking up agents…';
    case 'getLendersForState':
      return 'Looking up lenders…';
    case 'getStateDetails':
      return 'Pulling up state info…';
    case 'listStates':
      return 'Loading states…';
    case 'calculateBAH':
      return 'Calculating BAH…';
    default:
      if (SUBMIT_TOOL_NAMES.has(toolName)) return 'Sending your request…';
      return 'Working on it…';
  }
}

export default function MessageRenderer({ message, onSelectAgent, onApprove }: Props) {
  const isAssistant = message.role === 'assistant';
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {message.parts.map((part, idx) => {
          const key = `${message.id}-${idx}`;

          if (isTextUIPart(part)) {
            const bubbleClass = isUser
              ? 'rounded-lg bg-primary text-white px-3 py-2 text-sm whitespace-pre-wrap'
              : 'rounded-lg bg-gray-100 text-gray-900 px-3 py-2 text-sm whitespace-pre-wrap';
            return (
              <div key={key} className={bubbleClass}>
                {part.text}
              </div>
            );
          }

          if (!isAssistant || !isToolUIPart(part)) {
            return null;
          }

          const toolName = getToolName(part);

          switch (part.state) {
            case 'input-streaming':
            case 'input-available':
              return <LoadingBubble key={key} label={loadingLabel(toolName)} />;

            case 'approval-requested':
              if (SUBMIT_TOOL_NAMES.has(toolName)) {
                return (
                  <ApprovalCard
                    key={key}
                    approvalId={part.approval.id}
                    toolName={toolName}
                    onApprove={onApprove}
                  />
                );
              }
              return <LoadingBubble key={key} label={loadingLabel(toolName)} />;

            case 'approval-responded':
              return <LoadingBubble key={key} label={loadingLabel(toolName)} />;

            case 'output-denied':
              if (SUBMIT_TOOL_NAMES.has(toolName)) {
                return <DeniedBubble key={key} />;
              }
              return null;

            case 'output-error':
              return <ErrorBubble key={key} message={part.errorText} />;

            case 'output-available': {
              const envelope = asEnvelope<Record<string, unknown>>(part.output);
              if (!envelope) {
                return <ErrorBubble key={key} />;
              }
              if (envelope.ok === false) {
                return <ErrorBubble key={key} message={envelope.error} />;
              }
              const data = envelope.data;

              switch (toolName) {
                case 'getAgentsForState': {
                  const agents = (data && Array.isArray((data as { agents?: unknown }).agents)
                    ? ((data as { agents: AgentListItem[] }).agents)
                    : []) as AgentListItem[];
                  return (
                    <AgentCard
                      key={key}
                      list={agents}
                      kind="agent"
                      onSelect={onSelectAgent}
                    />
                  );
                }
                case 'getLendersForState': {
                  const lenders = (data && Array.isArray((data as { lenders?: unknown }).lenders)
                    ? ((data as { lenders: AgentListItem[] }).lenders)
                    : []) as AgentListItem[];
                  return (
                    <AgentCard
                      key={key}
                      list={lenders}
                      kind="lender"
                      onSelect={onSelectAgent}
                    />
                  );
                }
                case 'getPartnersForCoverageArea': {
                  const partners = (data && Array.isArray((data as { partners?: unknown }).partners)
                    ? ((data as { partners: AgentListItem[] }).partners)
                    : []) as AgentListItem[];
                  const role = data && (data as { role?: unknown }).role === 'lender'
                    ? 'lender'
                    : 'agent';
                  return (
                    <AgentCard
                      key={key}
                      list={partners}
                      kind={role}
                      onSelect={onSelectAgent}
                    />
                  );
                }
                case 'getStateDetails': {
                  const stateRecord = (data && (data as { state?: unknown }).state) as
                    | { state_name?: string; short_name?: string; state_slug?: { current?: string } }
                    | undefined;
                  if (!stateRecord) {
                    return <ErrorBubble key={key} />;
                  }
                  return <StateCard key={key} state={stateRecord} />;
                }
                case 'calculateBAH': {
                  return (
                    <BAHResult
                      key={key}
                      data={(data as Parameters<typeof BAHResult>[0]['data']) || {}}
                    />
                  );
                }
                case 'listStates': {
                  return null;
                }
                case 'resolveDestinationLocation':
                case 'findCoverageAreas': {
                  return null;
                }
                default: {
                  if (SUBMIT_TOOL_NAMES.has(toolName)) {
                    const message = (data && typeof (data as { message?: unknown }).message === 'string')
                      ? ((data as { message: string }).message)
                      : undefined;
                    return <ConfirmationBubble key={key} message={message} />;
                  }
                  return null;
                }
              }
            }

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
