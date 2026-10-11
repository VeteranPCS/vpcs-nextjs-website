"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
export type ImpactMetrics = { cashBackAmount: string; charityAmount: string; totalVolumeSold: string; available: boolean };
type State = { metrics: ImpactMetrics | null; loading: boolean };
const ImpactContext = createContext<State>({ metrics: null, loading: true });
export function ImpactProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ metrics: null, loading: true });
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/impact', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Impact unavailable'); return response.json(); })
      .then(result => {
        const data = result.data;
        setState({ loading: false, metrics: result.success && data && typeof data.cashBackAmount === 'string' && typeof data.charityAmount === 'string' && typeof data.totalVolumeSold === 'string'
          ? { ...data, available: data.available === true } : null });
      })
      .catch(() => { if (!controller.signal.aborted) setState({ metrics: null, loading: false }); });
    return () => controller.abort();
  }, []);
  return <ImpactContext.Provider value={state}>{children}</ImpactContext.Provider>;
}
export function useImpactMetrics(): State { return useContext(ImpactContext); }
