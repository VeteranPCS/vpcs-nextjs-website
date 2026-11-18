import type { CaptureResult, PostHogConfig } from 'posthog-js';
import { validSessionId } from './journey-attribution';

export const replayPilotPath = '/blog/category/va-loan-help';
const surface = '[data-vpcs-replay-pilot]';
const prohibited = 'form, input, textarea, select, [contenteditable], dialog, [role="dialog"], [aria-modal="true"], iframe';
const modal = 'dialog[open], [role="dialog"][aria-modal="true"], [aria-modal="true"]:not([hidden])';
const duration = 14 * 24 * 60 * 60 * 1000;
const start = Date.parse(process.env.NEXT_PUBLIC_POSTHOG_REPLAY_PILOT_START ?? '');
type ReplayClient = Pick<Parameters<PostHogConfig['loaded']>[0],
  'capture' | 'get_session_id' | 'has_opted_out_capturing' | 'onSessionId' |
  'startSessionRecording' | 'stopSessionRecording'>;

export const replayPrivacy: PostHogConfig['session_recording'] = {
  maskAllInputs: true,
  maskTextSelector: '*',
  blockSelector: `${prohibited}, .ph-no-capture, body *:not(${surface}):not(${surface} *):not(:has(${surface}))`,
  recordCrossOriginIframes: false,
  recordHeaders: false,
  recordBody: false,
  maskCapturedNetworkRequestFn: () => null,
};

export function inReplayPilotWindow(now: number, begins = start): boolean {
  return Number.isFinite(begins) && now >= begins && now < begins + duration;
}

export function sampledForReplayPilot(sessionId: unknown): boolean {
  const id = validSessionId(sessionId);
  return id !== undefined && Number.parseInt(id.slice(-8), 16) < 0x100000000 * 0.2;
}

export function isReplayPilotUrl(url: Pick<Location, 'pathname' | 'search' | 'hash'>): boolean {
  return url.pathname === replayPilotPath && url.search === '' && url.hash === '';
}

export function createReplayPilot() {
  let activeSession: string | undefined;
  let client: ReplayClient | undefined;
  let changingPage = false;

  function isEligible() {
    return Boolean(client && inReplayPilotWindow(Date.now()) &&
      isReplayPilotUrl(window.location) && !changingPage && !client.has_opted_out_capturing() &&
      document.querySelector(surface) && !document.querySelector(modal));
  }

  function stop() {
    if (!activeSession) return;
    const recorder = client;
    activeSession = undefined;
    recorder?.stopSessionRecording();
  }

  function refresh() {
    const current = isEligible() ? validSessionId(client?.get_session_id()) : undefined;
    if (current === activeSession) return;
    stop();
    if (!client || !current || !sampledForReplayPilot(current)) return;
    activeSession = current;
    client.startSessionRecording();
  }

  function captureClick(event: MouseEvent) {
    if (!activeSession || !client || !isEligible() || !event.isTrusted) return;
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(surface) || target.closest(prohibited + ', .ph-no-capture')) return;
    // Native heatmap ingestion accepts coordinates keyed by page URL. Capture
    // only clicks inside the public content, without emitting element details.
    client.capture('$$heatmap', {
      $heatmap_data: {
        [window.location.origin + replayPilotPath]: [{
          x: Math.round(event.clientX + window.scrollX),
          y: Math.round(event.clientY + window.scrollY),
          target_fixed: false,
          type: 'click',
        }],
      },
    });
  }

  return {
    attach(sdk: ReplayClient) {
      if (!inReplayPilotWindow(Date.now())) return;
      const navigation = (window as Window & { navigation?: EventTarget }).navigation;
      if (!navigation || !window.CSS?.supports('selector(:has(*))')) return;
      client = sdk;
      // The Navigation API fires before same-document route changes, including
      // pushState, replaceState and traversal. Require it for this pilot.
      navigation.addEventListener('navigate', () => {
        changingPage = true;
        stop();
      });
      navigation.addEventListener('currententrychange', () => {
        changingPage = false;
        refresh();
      });
      window.addEventListener('pagehide', stop);
      window.addEventListener('pageshow', () => {
        changingPage = false;
        refresh();
      });
      document.addEventListener('click', captureClick, true);

      const observer = new MutationObserver(refresh);
      const observe = () => {
        observer.observe(document.body, { childList: true, subtree: true });
        refresh();
      };
      if (document.body) observe();
      else document.addEventListener('DOMContentLoaded', observe, { once: true });
      const unsubscribe = sdk.onSessionId(() => { queueMicrotask(refresh); });
      window.setTimeout(() => {
        stop();
        observer.disconnect();
        unsubscribe();
        document.removeEventListener('click', captureClick, true);
      }, Math.max(0, start + duration - Date.now()));
    },

    /** Pass through only the SDK replay payload and our path-scoped coordinates. */
    capturePayload(event: CaptureResult): Record<string, unknown> | null {
      if (!activeSession || !isEligible()) return null;
      if (event.properties.$session_id !== activeSession) return null;
      if (event.event === '$snapshot') {
        const snapshots: unknown = event.properties.$snapshot_data;
        return Array.isArray(snapshots) && snapshots.length > 0 ? { $snapshot_data: snapshots } : null;
      }
      const data: unknown = event.properties.$heatmap_data;
      if (!data || typeof data !== 'object') return null;
      const url = window.location.origin + replayPilotPath;
      const points: unknown = (data as Record<string, unknown>)[url];
      if (!Array.isArray(points) || points.length !== 1) return null;
      const point = points[0] as Record<string, unknown> | null;
      if (!point || point.type !== 'click' || typeof point.x !== 'number' || typeof point.y !== 'number' ||
          !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
      return { $heatmap_data: { [url]: [{ x: point.x, y: point.y, target_fixed: false, type: 'click' }] } };
    },
  };
}
