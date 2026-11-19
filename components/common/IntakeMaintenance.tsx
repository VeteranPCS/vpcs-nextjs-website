'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { INTAKE_NOT_SENT_MESSAGE, INTAKE_REOPENED_MESSAGE, isIntakeMaintenanceResult } from '@/lib/leads/intake-maintenance';

type Status = { active: boolean; message: string; revision: number };
type StatusContextValue = Status & { latestRequest: { current: number } };
const StatusContext = createContext<StatusContextValue>({ active: false, message: '', revision: 0, latestRequest: { current: 0 } });

/** Runtime status lets an already-open or statically cached form show the pause. */
export function IntakeMaintenanceProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>({ active: false, message: '', revision: 0 });
  const latestRequest = useRef(0);
  useEffect(() => {
    let stopped = false;
    let controller: AbortController | undefined;
    let pending = false;
    const refresh = async () => {
      if (pending || stopped) return;
      pending = true;
      const revision = ++latestRequest.current;
      const requestController = new AbortController();
      controller = requestController;
      const timeout = setTimeout(() => requestController.abort(), 5_000);
      try {
        const response = await fetch('/api/v1/intake-status', { cache: 'no-store', signal: requestController.signal });
        if (!response.ok) return;
        const next = await response.json();
        if (!stopped && !requestController.signal.aborted && typeof next.active === 'boolean' && typeof next.message === 'string') setStatus({ active: next.active, message: next.message, revision });
      } catch { /* Advisory only: the server checks every submission independently. */ }
      finally { clearTimeout(timeout); pending = false; }
    };
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 30_000);
    window.addEventListener('focus', refresh);
    return () => { stopped = true; controller?.abort(); clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  return <StatusContext.Provider value={{ ...status, latestRequest }}>{children}</StatusContext.Provider>;
}

export function useIntakeMaintenanceFeedback() {
  const status = useContext(StatusContext);
  const [blockedAt, setBlockedAt] = useState<number | null>(null);
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);
  const blocked = blockedAt !== null;
  // A read that STARTED before rejection cannot announce reopening when it completes late.
  const reopened = blocked && !status.active && status.revision > blockedAt;
  const notice = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (blocked) notice.current?.focus(); }, [blocked]);
  const handleMaintenanceResult = useCallback((response: unknown) => {
    const maintenance = isIntakeMaintenanceResult(response);
    setBlockedAt(maintenance ? statusRef.current.latestRequest.current : null);
    return maintenance;
  }, []);
  return {
    handleMaintenanceResult,
    maintenanceNotice: blocked || status.active ? <p ref={notice} tabIndex={blocked ? -1 : undefined}
      role={blocked && !reopened ? 'alert' : 'status'} className="my-4 rounded-md border border-amber-700 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950 focus:outline-2 focus:outline-offset-2">
      {reopened ? INTAKE_REOPENED_MESSAGE : blocked ? INTAKE_NOT_SENT_MESSAGE : status.message}
    </p> : null,
  };
}
