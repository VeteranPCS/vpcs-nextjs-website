import React, { type ReactElement, type ReactNode } from 'react';
import { render } from '@testing-library/react';
import { LeadCaptchaProvider } from '../LeadCaptcha';

export function renderWithCaptchaOff(element: ReactElement) {
    return render(element, { wrapper: ({ children }: { children: ReactNode }) => (
        <LeadCaptchaProvider config={{ mode: 'off' }}>{children}</LeadCaptchaProvider>
    ) });
}
