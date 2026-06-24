import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog {
  if (!posthogClient) {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogClient;
}

interface ServerEvent {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}

/**
 * Capture a server-side event and wait for it to reach PostHog before returning.
 *
 * On Vercel Fluid Compute the function instance can freeze the moment a response
 * is sent, dropping anything still buffered in posthog-node. `flushAt: 1` triggers
 * a flush per event but does not give the caller a promise to await, so we flush
 * explicitly. Failures are swallowed: analytics is best-effort and must never break
 * a lead submission or a concierge response.
 */
export async function captureServerEvent({ distinctId, event, properties }: ServerEvent): Promise<void> {
  try {
    await captureServerEventStrict({ distinctId, event, properties });
  } catch {
    // best-effort: never surface analytics errors to the caller
  }
}

export async function captureServerEventStrict({ distinctId, event, properties }: ServerEvent): Promise<void> {
  const client = getPostHogClient();
  client.capture({ distinctId, event, properties });
  await client.flush();
}
