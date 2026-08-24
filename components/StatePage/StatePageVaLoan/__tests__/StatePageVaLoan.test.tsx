import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import StatePageVaLoan from '@/components/StatePage/StatePageVaLoan/StatePageVaLoan';

describe('StatePageVaLoan', () => {
  it('renders an intentional empty state for a successful zero-lender result', () => {
    const html = renderToStaticMarkup(
      <StatePageVaLoan
        cityName="Puerto Rico"
        state="puerto-rico"
        lendersData={{ totalSize: 0, done: true, records: [] }}
      />,
    );

    expect(html).toContain('No lenders are currently listed for this state.');
  });
});
