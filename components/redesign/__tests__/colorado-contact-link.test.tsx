// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ColoradoGuideContactLink from '../ColoradoGuideContactLink';
import { CONTACT_PREFILL_STORAGE_KEY, consumeContactPrefill, storeContactPrefill } from '@/lib/leads/contact-prefill';
import { readSelectedAgent } from '@/lib/experiments/desktop-contact-agent';
import { trackCtaClicked } from '@/lib/analytics/client';

vi.mock('@/lib/analytics/client', () => ({ trackCtaClicked: vi.fn() }));
const agentId = '001Rg00000pmUUk';
const details = { firstName: 'PrivateGiven', lastName: 'PrivateFamily', email: 'private-contact@example.test' };
const click = () => {
  const link = screen.getByRole('link', { name: 'Contact Tyler' });
  link.addEventListener('click', event => event.preventDefault());
  fireEvent.click(link);
  return link;
};
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); sessionStorage.clear(); localStorage.clear(); });

describe('Colorado guide contact CTA', () => {
  it('stores contact details only after explicit success CTA click without placing them in the URL or analytics', () => {
    render(<ColoradoGuideContactLink allowAuthorContact location="guide_download_success" contactDetails={details} />);
    expect(sessionStorage.getItem(CONTACT_PREFILL_STORAGE_KEY)).toBeNull();
    const link = click();
    const analytics = JSON.stringify(vi.mocked(trackCtaClicked).mock.calls);
    const href = link.getAttribute('href') ?? '';
    for (const value of Object.values(details)) { expect(href).not.toContain(value); expect(analytics).not.toContain(value); }
    expect(consumeContactPrefill(agentId)).toEqual(details);
    expect(localStorage.length).toBe(0);
    expect(trackCtaClicked).toHaveBeenCalledWith(expect.objectContaining({ cta_position: 'primary' }));
    expect(readSelectedAgent(agentId)).toMatchObject({ name: 'Tyler Parker', photo: '/images/agents/001Rg00000pmUUk.webp', service: 'Air Force Veteran' });
  });

  it('a direct promo contact click sends no visitor prefill and clears stale data', () => {
    storeContactPrefill(agentId, details);
    render(<ColoradoGuideContactLink allowAuthorContact location="state_guide_section" />);
    click();
    expect(consumeContactPrefill(agentId)).toBeNull();
    expect(trackCtaClicked).toHaveBeenCalledWith(expect.objectContaining({ cta_position: 'secondary' }));
  });

  it('links to a generic Colorado form without recording a partner in storage', () => {
    render(<ColoradoGuideContactLink allowAuthorContact={false} location="guide_download_success" contactDetails={details} />);
    const link = screen.getByRole('link', { name: 'Find a Colorado Agent' });
    expect(link.getAttribute('href')).toBe('/contact-agent?form=agent&state=colorado');
    link.addEventListener('click', event => event.preventDefault());
    fireEvent.click(link);
    expect(readSelectedAgent(agentId)).toBeNull();
    expect(sessionStorage.getItem(CONTACT_PREFILL_STORAGE_KEY)).toBeNull();
    expect(trackCtaClicked).toHaveBeenCalledWith(expect.objectContaining({ cta_id: 'colorado_relocation_guide_find_agent' }));
    expect(JSON.stringify(vi.mocked(trackCtaClicked).mock.calls)).not.toContain(agentId);
  });
});
