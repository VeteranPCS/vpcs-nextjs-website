'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import MessageRenderer from './MessageRenderer';
import type { AgentListItem } from './AgentCard';
import { useConcierge } from './ConciergeProvider';

const PANEL_TITLE = 'VeteranPCS Concierge';
const GREETING =
  "Hi — I'm the VeteranPCS concierge. I can help you find a vetted military-friendly agent or lender, look up BAH rates, or answer PCS questions. Where are you headed?";

interface ChatBubbleIconProps {
  className?: string;
}

function ChatBubbleIcon({ className }: ChatBubbleIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

const FOCUSABLE_SELECTOR =
  'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]';

interface PageContextHolder {
  path: string | undefined;
  topic: string | undefined;
}

export default function ConciergeWidget() {
  const { isOpen, open, close, pendingSeed, clearPendingSeed } = useConcierge();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const seedConsumedRef = useRef<boolean>(false);

  const pageContextRef = useRef<PageContextHolder>({
    path: undefined,
    topic: undefined,
  });

  useEffect(() => {
    pageContextRef.current.path = pathname ?? undefined;
  }, [pathname]);

  useEffect(() => {
    pageContextRef.current.topic = pendingSeed?.topic;
  }, [pendingSeed]);

  // The transport closure runs at send time (outside render), so reading
  // pageContextRef.current here is safe — the react-hooks/refs lint rule
  // can't tell that and flags it as render-time access.
  const transport = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest({ messages, id, trigger, messageId }) {
          return {
            body: {
              id,
              trigger,
              messageId,
              messages,
              pageContext: {
                path: pageContextRef.current.path,
                topic: pageContextRef.current.topic,
              },
            },
          };
        },
      }),
    [],
  );

  const { messages, sendMessage, status, error, addToolApprovalResponse } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  const isStreaming = status === 'submitted' || status === 'streaming';

  // Consume pending seed once on open.
  useEffect(() => {
    if (!isOpen) return;
    if (seedConsumedRef.current) return;
    if (!pendingSeed?.openingMessage) return;
    if (messages.length > 0) return;
    seedConsumedRef.current = true;
    void sendMessage({ text: pendingSeed.openingMessage });
    clearPendingSeed();
  }, [isOpen, pendingSeed, messages.length, sendMessage, clearPendingSeed]);

  // Reset seed-consumed flag when the panel closes so a future open works.
  useEffect(() => {
    if (!isOpen) {
      seedConsumedRef.current = false;
    }
  }, [isOpen]);

  // ESC closes and basic focus trap.
  useEffect(() => {
    if (!isOpen) return;
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const root = panelRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (active === first || !root.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKey);
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => {
      document.removeEventListener('keydown', handleKey);
      window.clearTimeout(focusTimer);
      const prev = previousActiveElementRef.current;
      if (prev && typeof prev.focus === 'function') {
        prev.focus();
      }
    };
  }, [isOpen, close]);

  // Auto-scroll the message list when new messages stream.
  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [isOpen, messages]);

  const handleSelectAgent = (item: AgentListItem) => {
    if (isStreaming) return;
    void sendMessage({ text: `I'd like to connect with ${item.name}.` });
  };

  const handleApprove = useCallback(
    (id: string, approved: boolean) => {
      void addToolApprovalResponse({ id, approved });
    },
    [addToolApprovalResponse],
  );

  const inputFormRef = useRef<HTMLFormElement | null>(null);
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const field = formEl.elements.namedItem('concierge-input') as HTMLInputElement | null;
    if (!field) return;
    const text = field.value.trim();
    if (!text) return;
    if (isStreaming) return;
    void sendMessage({ text });
    field.value = '';
  };

  if (!featureFlags.conciergeEnabled) {
    return null;
  }

  return (
    <>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => open()}
          aria-label="Open chat with VeteranPCS concierge"
          className="fixed bottom-6 right-6 z-concierge h-14 w-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center motion-safe:transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
        >
          <ChatBubbleIcon className="h-6 w-6" />
        </button>
      ) : null}

      {isOpen ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={PANEL_TITLE}
          className="fixed z-concierge bg-white shadow-2xl flex flex-col inset-0 sm:inset-auto sm:right-6 sm:bottom-20 sm:h-[560px] sm:w-[380px] sm:rounded-xl overflow-hidden border border-gray-200"
        >
          {/* Header */}
          <div className="bg-primary text-white px-4 py-3 flex items-center justify-between">
            <span className="font-semibold text-base">{PANEL_TITLE}</span>
            <button
              type="button"
              onClick={close}
              aria-label="Close concierge"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white motion-safe:transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Message list */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 bg-gray-50"
          >
            {messages.length === 0 ? (
              <div className="rounded-lg bg-white border border-gray-200 p-3 text-sm text-gray-800">
                {GREETING}
              </div>
            ) : null}

            {messages.map((message) => (
              <MessageRenderer
                key={message.id}
                message={message}
                onSelectAgent={handleSelectAgent}
                onApprove={handleApprove}
              />
            ))}

            {error ? (
              <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-600">
                Something went wrong — try again or reach us at support@veteranpcs.com
              </div>
            ) : null}
          </div>

          {/* Input footer */}
          <form
            ref={inputFormRef}
            onSubmit={handleSubmit}
            className="border-t border-gray-200 bg-white p-2 flex items-center gap-2"
          >
            <label htmlFor="concierge-input" className="sr-only">
              Message the concierge
            </label>
            <input
              ref={inputRef}
              id="concierge-input"
              name="concierge-input"
              type="text"
              autoComplete="off"
              placeholder="Type a message…"
              disabled={isStreaming}
              className="flex-1 min-h-[44px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={isStreaming}
              aria-label="Send message"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-accent-red text-white motion-safe:transition-colors hover:bg-accent-red-dark disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
