'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { captureAnalyticsEvent } from '@/lib/analytics/client';

export interface ConciergeSeed {
  openingMessage?: string;
  topic?: string;
}

export interface ConciergeContextValue {
  isOpen: boolean;
  open(seed?: ConciergeSeed): void;
  close(): void;
  toggle(): void;
  pendingSeed: ConciergeSeed | null;
  clearPendingSeed(): void;
}

const ConciergeContext = createContext<ConciergeContextValue | null>(null);

interface Props {
  children: React.ReactNode;
}

export default function ConciergeProvider({ children }: Props) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [pendingSeed, setPendingSeed] = useState<ConciergeSeed | null>(null);
  const pathname = usePathname();

  const open = useCallback((seed?: ConciergeSeed) => {
    if (seed) {
      setPendingSeed(seed);
    }
    if (!isOpen) {
      captureAnalyticsEvent('concierge_opened', {
        source_page_path: pathname ?? undefined,
        concierge_topic: seed?.topic,
        input_origin: seed ? 'seeded_cta' : 'launcher',
      });
    }
    setIsOpen(true);
  }, [isOpen, pathname]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    if (!isOpen) {
      captureAnalyticsEvent('concierge_opened', {
        source_page_path: pathname ?? undefined,
        input_origin: 'toggle',
      });
    }
    setIsOpen((prev) => !prev);
  }, [isOpen, pathname]);

  const clearPendingSeed = useCallback(() => {
    setPendingSeed(null);
  }, []);

  const value = useMemo<ConciergeContextValue>(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      pendingSeed,
      clearPendingSeed,
    }),
    [isOpen, open, close, toggle, pendingSeed, clearPendingSeed],
  );

  return <ConciergeContext.Provider value={value}>{children}</ConciergeContext.Provider>;
}

export function useConcierge(): ConciergeContextValue {
  const ctx = useContext(ConciergeContext);
  if (!ctx) {
    throw new Error('useConcierge must be used within a ConciergeProvider');
  }
  return ctx;
}
