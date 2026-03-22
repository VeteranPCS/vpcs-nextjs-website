import { vi, describe, test, expect, beforeEach } from 'vitest';
import React from 'react';

// Mock resend before importing email module
const mockSend = vi.fn();
vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = { send: mockSend };
    },
  };
});

// Mock attio for note logging
const mockCreateNote = vi.fn();
vi.mock('@/lib/attio', () => ({
  attio: {
    createNote: mockCreateNote,
  },
}));

// Import after mocks are set up
const { sendEmail } = await import('../email');

describe('sendEmail', () => {
  const mockReactElement = React.createElement('div', null, 'Test email');

  beforeEach(() => {
    mockSend.mockReset();
    mockCreateNote.mockReset();
  });

  test('calls Resend with correct from, to, subject, react', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null });

    await sendEmail({
      to: 'user@test.com',
      subject: 'Test Subject',
      react: mockReactElement,
    });

    expect(mockSend).toHaveBeenCalledWith({
      from: 'VeteranPCS Test <test@veteranpcs.com>',
      to: 'user@test.com',
      subject: 'Test Subject',
      react: mockReactElement,
    });
  });

  test('returns the email ID from Resend', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-456' }, error: null });

    const result = await sendEmail({
      to: 'user@test.com',
      subject: 'Test',
      react: mockReactElement,
    });

    expect(result).toEqual({ id: 'email-456' });
  });

  test('throws on Resend error', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'Rate limited' } });

    await expect(
      sendEmail({ to: 'user@test.com', subject: 'Test', react: mockReactElement }),
    ).rejects.toThrow('Email send failed: Rate limited');
  });

  test('logs note to Attio when attioNote is provided', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-789' }, error: null });
    mockCreateNote.mockResolvedValue({});

    await sendEmail({
      to: 'user@test.com',
      subject: 'Welcome!',
      react: mockReactElement,
      attioNote: {
        objectSlug: 'customers',
        recordId: 'record-abc',
        emailLabel: 'C2: Customer Welcome',
      },
    });

    expect(mockCreateNote).toHaveBeenCalledWith(
      'customers',
      'record-abc',
      'Email sent: C2: Customer Welcome',
      'To: user@test.com\nSubject: Welcome!',
    );
  });

  test('does NOT throw when Attio note fails (silently catches)', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-101' }, error: null });
    mockCreateNote.mockRejectedValue(new Error('Attio down'));

    // Should not throw despite note failure
    const result = await sendEmail({
      to: 'user@test.com',
      subject: 'Test',
      react: mockReactElement,
      attioNote: {
        objectSlug: 'agents',
        recordId: 'record-xyz',
        emailLabel: 'A1: Lead Alert',
      },
    });

    expect(result).toEqual({ id: 'email-101' });
  });

  test('does NOT call createNote when attioNote is omitted', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-202' }, error: null });

    await sendEmail({
      to: 'user@test.com',
      subject: 'Test',
      react: mockReactElement,
    });

    expect(mockCreateNote).not.toHaveBeenCalled();
  });
});
