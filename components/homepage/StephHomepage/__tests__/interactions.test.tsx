// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/image', () => ({ default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} /> }));
vi.mock('@/lib/analytics/client', () => ({ trackCtaClicked: vi.fn(), captureAnalyticsEvent: vi.fn() }));
vi.mock('@next/third-parties/google', () => ({ sendGTMEvent: vi.fn() }));
import HomeSearch from '../HomeSearch';
import HomeBonus from '../HomeBonus';
import HomeReviews from '../HomeReviews';
import type { Review } from '@/components/homepage/ReviewTestimonial/ReviewTestimonial';
const review = (name: string): Review => ({ comment: `${name} review text`, createTime: '2025-01-01', reviewId: name, reviewer: { displayName: name, profilePhotoUrl: '' }, starRating: 'FIVE' });
describe('homepage interactions', () => {
  beforeEach(() => { cleanup(); push.mockReset(); vi.unstubAllGlobals(); });
  it('switches tabs with arrows and exposes the bonus access on resources', () => {
    render(<HomeSearch guide={<span>Guide</span>} />);
    const first = screen.getByRole('tab', { name: 'Find an Agent' });
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Browse by State' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Browse by State' }), { key: 'ArrowRight' });
    expect(screen.getByRole('link', { name: 'Move-In Bonus Calculator' }).getAttribute('href')).toBe('/pcs-resources#move-in-bonus');
  });
  it('retains ambiguous city input, requests state, and navigates to resolved destination', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ outcome: 'needs_state', message: 'Which state?', states: [] }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ outcome: 'resolved', href: '/virginia', stateSlug: 'virginia' }) });
    vi.stubGlobal('fetch', fetch);
    render(<HomeSearch guide={null} />);
    const input = screen.getByRole('textbox', { name: 'City, state, base, or ZIP code' });
    fireEvent.change(input, { target: { value: 'Springfield' } });
    fireEvent.submit(input.closest('form')!);
    await screen.findByText('Which state?');
    expect((input as HTMLInputElement).value).toBe('Springfield');
    fireEvent.change(screen.getByRole('combobox', { name: 'Choose a state' }), { target: { value: 'VA' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/virginia'));
    expect(fetch.mock.calls[1]?.[0]).toContain('query=Springfield&state=VA');
  });
  it.each(['click', 'keyboard'])('cancels pending navigation when tabs change by %s', async (method) => {
    let resolve!: (response: unknown) => void;
    const fetch = vi.fn(() => new Promise((done) => { resolve = done; }));
    vi.stubGlobal('fetch', fetch);
    render(<HomeSearch guide={null} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Texas' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find an Agent' }));
    const signal = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1].signal;
    if (method === 'click') fireEvent.click(screen.getByRole('tab', { name: 'Browse Resources' }));
    else fireEvent.keyDown(screen.getByRole('tab', { name: 'Find an Agent' }), { key: 'End' });
    expect(signal?.aborted).toBe(true);
    await act(async () => { resolve({ ok: true, json: async () => ({ outcome: 'resolved', href: '/texas', stateSlug: 'texas' }) }); });
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Find an Agent' }));
    expect(screen.getByRole('button', { name: 'Find an Agent' }).hasAttribute('disabled')).toBe(false);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Texas');
  });
  it('recovers from a search failure with clear retry guidance', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network')));
    render(<HomeSearch guide={null} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Texas' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find an Agent' }));
    await screen.findByText(/Search is unavailable/);
    expect(screen.getByRole('button', { name: 'Find an Agent' }).hasAttribute('disabled')).toBe(false);
  });
  it('updates established bonus tiers using a typed price', () => {
    render(<HomeBonus />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Home Price' }), { target: { value: '650000' } });
    expect(screen.getByText('$2,000')).toBeTruthy();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Home Price' }), { target: { value: '1000000' } });
    expect(screen.getByText('$4,000')).toBeTruthy();
  });
  it('moves between actual reviews while keeping family photo separately captioned', () => {
    render(<HomeReviews reviews={[review('Alpha'), review('Beta')]} />);
    expect(screen.getByText('VeteranPCS family photo')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next review' }));
    expect(screen.getAllByRole('article')[0]?.textContent).toContain('Beta review text');
    fireEvent.click(screen.getByRole('button', { name: 'Previous review' }));
    expect(screen.getAllByText('Alpha review text').length).toBe(1);
  });
});
