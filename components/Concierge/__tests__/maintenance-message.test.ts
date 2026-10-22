import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';
import MessageRenderer from '../MessageRenderer';
import { INTAKE_CONCIERGE_NOT_SENT_MESSAGE } from '@/lib/leads/intake-maintenance';
import { SUCCESS_MESSAGE } from '@/lib/ai/tools/messages';

describe('concierge maintenance response display', () => {
  it.each([
    'submitAgentRequest',
    'submitLenderRequest',
    'submitGeneralInquiry',
    'submitVALoanGuideRequest',
  ])('%s displays the not-sent explanation instead of confirmation', (toolName) => {
    const message: UIMessage = {
      id: 'maintenance-result',
      role: 'assistant',
      parts: [{
        type: `tool-${toolName}`,
        toolCallId: 'paused-request',
        state: 'output-available',
        input: {},
        output: { ok: false, error: INTAKE_CONCIERGE_NOT_SENT_MESSAGE },
      }],
    };
    const html = renderToStaticMarkup(React.createElement(MessageRenderer, { message }));
    expect(html).toContain(INTAKE_CONCIERGE_NOT_SENT_MESSAGE);
    expect(html).not.toContain(SUCCESS_MESSAGE);
    expect(html).not.toContain('Sending your request');
  });
});
