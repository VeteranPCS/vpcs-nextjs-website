'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

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

  const open = useCallback((seed?: ConciergeSeed) => {
    if (seed) {
      setPendingSeed(seed);
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

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
