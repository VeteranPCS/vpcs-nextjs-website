'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { LeadCaptchaPublicConfig } from '@/lib/leads/captcha-types';

type GoogleCaptcha = {
  render: (element: HTMLElement, options: {
    sitekey: string;
    size: 'normal' | 'compact';
    callback: (token: string) => void;
    'expired-callback': () => void;
    'error-callback': () => void;
  }) => number;
  reset: (widgetId: number) => void;
};

type CaptchaWindow = Window & { grecaptcha?: GoogleCaptcha; vpcsLeadCaptchaLoaded?: () => void };
const scriptSource = 'https://www.google.com/recaptcha/api.js?onload=vpcsLeadCaptchaLoaded&render=explicit';
let scriptLoad: Promise<GoogleCaptcha> | undefined;
// Google allows two minutes. Reserve 30 seconds for bounded admission and native verification.
const tokenLifetimeMs = 90_000;

function loadCaptcha(): Promise<GoogleCaptcha> {
  const browser = window as CaptchaWindow;
  if (typeof browser.grecaptcha?.render === 'function' && typeof browser.grecaptcha.reset === 'function') return Promise.resolve(browser.grecaptcha);
  if (scriptLoad) return scriptLoad;
  scriptLoad = new Promise<GoogleCaptcha>((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = window.setTimeout(fail, 12_000);
    function cleanup() {
      window.clearTimeout(timeout);
      delete browser.vpcsLeadCaptchaLoaded;
    }
    function fail() {
      cleanup();
      script.remove();
      reject(new Error('Verification failed to load'));
    }
    browser.vpcsLeadCaptchaLoaded = () => {
      if (typeof browser.grecaptcha?.render !== 'function' || typeof browser.grecaptcha.reset !== 'function') {
        fail();
        return;
      }
      cleanup();
      script.onerror = null;
      resolve(browser.grecaptcha);
    };
    script.src = scriptSource;
    script.async = true;
    script.onerror = fail;
    document.head.append(script);
  }).catch((error: unknown) => {
    scriptLoad = undefined;
    throw error;
  });
  return scriptLoad;
}

const ConfigContext = createContext<LeadCaptchaPublicConfig>({ mode: 'unavailable' });

export function LeadCaptchaProvider({ config, children }: { config: LeadCaptchaPublicConfig; children: ReactNode }) {
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

type WidgetStatus = 'loading' | 'waiting' | 'verified' | 'unavailable';

export function useLeadCaptcha() {
  const config = useContext(ConfigContext);
  const token = useRef<{ value: string; expires: number } | null>(null);
  const resetWidget = useRef<(() => void) | null>(null);
  const region = useRef<HTMLDivElement>(null);
  const attachRegion = useCallback((element: HTMLDivElement | null) => { region.current = element; }, []);
  const attachReset = useCallback((reset: (() => void) | null) => { resetWidget.current = reset; }, []);
  const [status, setStatus] = useState<WidgetStatus>('loading');
  const [needsChallenge, setNeedsChallenge] = useState(false);
  const [widgetVersion, setWidgetVersion] = useState(0);

  const invalidate = useCallback((next: WidgetStatus = 'waiting') => {
    token.current = null;
    setStatus(next);
  }, []);
  const verify = useCallback((value: string) => {
    if (!value) return;
    token.current = { value, expires: Date.now() + tokenLifetimeMs };
    setStatus('verified');
    setNeedsChallenge(false);
  }, []);

  function requestChallenge() {
    setNeedsChallenge(true);
    region.current?.focus();
  }

  return {
    config, status, needsChallenge, widgetVersion, attachRegion, attachReset, invalidate, verify,
    requestChallenge,
    retryWidget: () => { invalidate('loading'); setWidgetVersion(version => version + 1); },
    takeToken: () => {
      const current = token.current;
      if (!current || current.expires <= Date.now()) return undefined;
      token.current = null;
      return current.value;
    },
    resetAfterSubmit: () => {
      if (config.mode !== 'required') return;
      invalidate('waiting');
      try { resetWidget.current?.(); } catch { invalidate('unavailable'); }
    },
  };
}

export function LeadCaptcha({ control }: { control: ReturnType<typeof useLeadCaptcha> }) {
  const mount = useRef<HTMLDivElement>(null);
  const { config, invalidate, verify, attachReset, attachRegion, widgetVersion, status, needsChallenge, retryWidget } = control;
  const siteKey = config.mode === 'required' ? config.siteKey : undefined;
  useEffect(() => {
    if (!siteKey || !mount.current) return;
    const container = document.createElement('div');
    mount.current.append(container);
    let active = true;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    let reset: (() => void) | undefined;
    function clearExpiry() { clearTimeout(expiry); }
    invalidate('loading');
    void loadCaptcha().then(google => {
      if (!active) return;
      invalidate('waiting');
      const widgetId = google.render(container, {
        sitekey: siteKey,
        size: (container.parentElement?.clientWidth ?? 0) < 304 ? 'compact' : 'normal',
        callback: value => {
          if (!active) return;
          clearExpiry();
          verify(value);
          expiry = setTimeout(() => {
            invalidate();
            try { google.reset(widgetId); } catch { invalidate('unavailable'); }
          }, tokenLifetimeMs);
        },
        'expired-callback': () => { if (active) { clearExpiry(); invalidate(); } },
        'error-callback': () => { if (active) { clearExpiry(); invalidate('unavailable'); } },
      });
      reset = () => {
        clearExpiry();
        google.reset(widgetId);
      };
      attachReset(reset);
    }).catch(() => { if (active) invalidate('unavailable'); });
    return () => {
      active = false;
      clearExpiry();
      // Close any provider challenge before removing its anchor or closing a dialog.
      try { reset?.(); } catch { /* Detached provider widgets cannot authorize submission. */ }
      invalidate('loading');
      attachReset(null);
      container.remove();
    };
  }, [siteKey, invalidate, verify, attachReset, widgetVersion]);

  if (config.mode === 'off') return null;
  const unavailable = config.mode === 'unavailable' || status === 'unavailable';
  return (
    <div className="my-3 w-full min-w-0" ref={attachRegion} tabIndex={-1} role="group" aria-label="Security verification">
      <div ref={mount} hidden={unavailable} />
      <div role="status" aria-live="polite">
        {unavailable ? 'Security verification is unavailable. Please try again shortly.'
          : status === 'loading' ? 'Loading security verification…'
          : needsChallenge ? 'Complete the security check before submitting.' : null}
      </div>
      {siteKey && unavailable && (
        <button className="underline" type="button" onClick={retryWidget}>Reload security check</button>
      )}
    </div>
  );
}
