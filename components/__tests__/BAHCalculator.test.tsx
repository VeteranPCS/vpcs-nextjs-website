// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BAHCalculator from '@/components/BAHCalculator';
import { BAH_API_YEAR, BAH_YEAR } from '@/lib/bah/year';
import { captureAnalyticsEvent } from '@/lib/analytics/client';

vi.mock('@next/third-parties/google', () => ({ sendGTMEvent: vi.fn() }));
vi.mock('@/lib/analytics/client', () => ({ captureAnalyticsEvent: vi.fn() }));
const data = { year: '2026', zipCode: '01234', rank: 'E05', mha: 'TEST DUTY STATION', withDependents: 2842, withoutDependents: 2400, difference: 442, isValid: true };
const response = (payload: unknown, ok = true) => ({ ok, json: async () => payload }) as Response;
const success = () => response({ success: true, data });
function fill(zip = '01234', rank = '5') {
    fireEvent.change(screen.getByLabelText('Pay Grade'), { target: { value: rank } });
    fireEvent.change(screen.getByLabelText('Duty Station ZIP Code'), { target: { value: zip } });
}
const button = () => screen.getByRole('button', { name: 'Calculate My BAH' });

describe('BAH calculator interactions', () => {
    beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(success())); });
    afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

    it('waits for explicit submit and posts the supported year with a leading-zero ZIP', async () => {
        render(<BAHCalculator />); fill();
        await new Promise(resolve => setTimeout(resolve, 550));
        expect(fetch).not.toHaveBeenCalled();
        expect(BAH_YEAR).toBe(2026); expect(BAH_API_YEAR).toBe('26');
        await userEvent.click(button());
        await screen.findByText(/TEST DUTY STATION/);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith('/api/v1/bah', expect.objectContaining({ method: 'POST', body: JSON.stringify({ zipCode: '01234', rank: '5', year: '26' }) }));
        expect(screen.getByTestId('bah-monthly').textContent).toBe('$2,400');
        expect(screen.getByTestId('bah-annual').textContent).toBe('$28,800');
        expect(screen.getByText(/E-5 · ZIP 01234 · Without dependents/)).toBeTruthy();
    });

    it('validates rank and the complete ZIP before sending a request', async () => {
        render(<BAHCalculator />);
        await userEvent.click(button());
        expect(document.activeElement).toBe(screen.getByLabelText('Pay Grade'));
        expect(screen.getByText('Select your pay grade.')).toBeTruthy();
        fill('0123'); await userEvent.click(button());
        expect(document.activeElement).toBe(screen.getByLabelText('Duty Station ZIP Code'));
        expect(screen.getByText('Enter a 5-digit duty station ZIP code.')).toBeTruthy();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('reuses both returned rates for dependent changes and derives annual amounts', async () => {
        render(<BAHCalculator />); fill(); await userEvent.click(button());
        await screen.findByTestId('bah-monthly');
        fireEvent.change(screen.getByLabelText('Dependents'), { target: { value: 'yes' } });
        expect(screen.getByTestId('bah-monthly').textContent).toBe('$2,842');
        expect(screen.getByTestId('bah-annual').textContent).toBe('$34,104');
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('locks duplicate submissions and ignores an aborted response after a newer lookup', async () => {
        let finishOld!: (response: Response) => void;
        vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
        const view = render(<BAHCalculator />); fill();
        const form = view.container.querySelector('form'); if (!form) throw new Error('Missing BAH form');
        fireEvent.submit(form); fireEvent.submit(form); fireEvent.submit(form);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect((screen.getByRole('button', { name: 'Calculating…' }) as HTMLButtonElement).disabled).toBe(true);
        const firstCall = vi.mocked(fetch).mock.calls[0]; if (!firstCall) throw new Error('Missing first lookup');
        fill('48329', '6');
        expect((firstCall[1]?.signal as AbortSignal).aborted).toBe(true);
        vi.mocked(fetch).mockResolvedValueOnce(response({ success: true, data: { ...data, zipCode: '48329', mha: 'NEW DUTY STATION', withoutDependents: 3000 } }));
        await userEvent.click(button()); await screen.findByText(/NEW DUTY STATION/);
        await act(async () => { finishOld(success()); });
        expect(screen.queryByText(/TEST DUTY STATION/)).toBeNull();
        expect(screen.getByTestId('bah-monthly').textContent).toBe('$3,000');
        expect(captureAnalyticsEvent).toHaveBeenCalledTimes(1);
        expect(captureAnalyticsEvent).toHaveBeenCalledWith('bah_calculator_used', expect.objectContaining({ paygrade: 'E-6', zip_prefix: '483', year: '2026' }));
    });

    it('clears displayed results as soon as the ZIP or pay grade changes', async () => {
        render(<BAHCalculator />); fill(); await userEvent.click(button()); await screen.findByTestId('bah-monthly');
        fill('01235');
        expect(screen.queryByTestId('bah-monthly')).toBeNull();
        expect(screen.getByText('Plan your next PCS')).toBeTruthy();
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('shows a useful server error and permits an explicit retry of the same values', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(response({ success: false, error: 'Rates temporarily unavailable' }, false));
        render(<BAHCalculator />); fill(); await userEvent.click(button());
        expect((await screen.findByRole('alert')).textContent).toBe('Rates temporarily unavailable');
        expect((screen.getByLabelText('Duty Station ZIP Code') as HTMLInputElement).value).toBe('01234');
        await userEvent.click(button()); await screen.findByTestId('bah-monthly');
        expect(fetch).toHaveBeenCalledTimes(2); expect(screen.queryByRole('alert')).toBeNull();
    });

    it('recovers after a connection failure without an automatic retry', async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));
        render(<BAHCalculator />); fill(); await userEvent.click(button());
        expect((await screen.findByRole('alert')).textContent).toBe('We couldn’t calculate your BAH. Please try again.');
        expect(fetch).toHaveBeenCalledTimes(1);
        await userEvent.click(button()); await screen.findByTestId('bah-monthly');
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('rejects mismatched or invalid rates rather than presenting them as current rates', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(response({ success: true, data: { ...data, year: '2025' } }));
        render(<BAHCalculator />); fill(); await userEvent.click(button());
        await screen.findByRole('alert'); expect(screen.queryByTestId('bah-monthly')).toBeNull();
    });

    it('calculates the published moving bonus only from an entered home price', async () => {
        render(<BAHCalculator fullPage />);
        expect(screen.getByTestId('bah-bonus').textContent).toBe('Enter a home price');
        fireEvent.change(screen.getByLabelText('Estimated Home Price'), { target: { value: '420,000' } });
        expect(screen.getByTestId('bah-bonus').textContent).toBe('$1,200');
        expect(screen.getByRole('link', { name: /Open VA Loan Calculator/ }).getAttribute('href')).toBe('/va-loan-calculator');
        expect(screen.getByRole('link', { name: /Find a Veteran or Mil Spouse Agent/ }).getAttribute('href')).toBe('/contact-agent');
        expect(fetch).not.toHaveBeenCalled();
    });
    it.each(['', '0', '-100', 'invalid', '420.00.00', '4,,200', 'Infinity'])('keeps bonus guidance for an empty or invalid price: %s', value => {
        render(<BAHCalculator fullPage />);
        fireEvent.change(screen.getByLabelText('Estimated Home Price'), { target: { value } });
        expect(screen.getByTestId('bah-bonus').textContent).toBe('Enter a home price');
        expect(fetch).not.toHaveBeenCalled();
    });

    it.each([
        ['99,999', '$200'], ['100000', '$400'], ['199999', '$400'], ['200000', '$700'],
        ['299999', '$700'], ['300000', '$1,000'], ['399999', '$1,000'], ['400000', '$1,200'],
        ['499999', '$1,200'], ['500000', '$1,500'], ['649999', '$1,500'], ['650000', '$2,000'],
        ['799999', '$2,000'], ['800000', '$3,000'], ['999999', '$3,000'], ['1000000', '$4,000'],
    ])('updates the published bonus tier for %s', (value, expected) => {
        render(<BAHCalculator fullPage />);
        fireEvent.change(screen.getByLabelText('Estimated Home Price'), { target: { value } });
        expect(screen.getByTestId('bah-bonus').textContent).toBe(expected);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('orders the price before the bonus and agent CTA and keeps BAH results when the price changes', async () => {
        render(<BAHCalculator fullPage />); fill(); await userEvent.click(button());
        await screen.findByTestId('bah-monthly');
        const price = screen.getByLabelText('Estimated Home Price');
        const bonus = screen.getByTestId('bah-bonus');
        const agent = screen.getByRole('link', { name: /Find a Veteran or Mil Spouse Agent/ });
        expect(price.compareDocumentPosition(bonus) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(bonus.compareDocumentPosition(agent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        fireEvent.change(price, { target: { value: '420,000' } });
        expect(bonus.textContent).toBe('$1,200');
        expect(screen.getByTestId('bah-monthly').textContent).toBe('$2,400');
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(captureAnalyticsEvent).toHaveBeenCalledTimes(1);
        await userEvent.click(agent);
        expect(captureAnalyticsEvent).toHaveBeenCalledWith('calculator_cta_clicked', expect.objectContaining({ cta_id: 'bah_result_agent_cta', calculator_name: 'BAH Calculator' }));
    });

});
