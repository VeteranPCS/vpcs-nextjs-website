// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

const sdk = vi.hoisted(() => ({
  listeners: [] as Array<() => void>,
  unsubscribe: vi.fn(),
  onFeatureFlags: vi.fn(),
  getFeatureFlag: vi.fn(),
}));
vi.mock('posthog-js', () => ({ default: { onFeatureFlags: sdk.onFeatureFlags, getFeatureFlag: sdk.getFeatureFlag } }));

import { useFeatureFlagVariant } from '../useFeatureFlagVariant';

beforeEach(() => {
  sdk.listeners = [];
  sdk.unsubscribe.mockReset();
  sdk.getFeatureFlag.mockReset();
  sdk.onFeatureFlags.mockReset();
  sdk.onFeatureFlags.mockImplementation((listener: () => void) => { sdk.listeners.push(listener); return sdk.unsubscribe; });
});
afterEach(cleanup);

describe('useFeatureFlagVariant', () => {
  it('is undefined until flags load, then returns the flag value', () => {
    sdk.getFeatureFlag.mockReturnValue('test');
    const { result } = renderHook(() => useFeatureFlagVariant('blog-state-hub-cta'));
    expect(result.current).toBeUndefined();
    expect(sdk.getFeatureFlag).not.toHaveBeenCalled();
    act(() => { for (const listener of sdk.listeners) listener(); });
    expect(sdk.getFeatureFlag).toHaveBeenCalledWith('blog-state-hub-cta');
    expect(result.current).toBe('test');
  });

  it('follows later flag reloads and unsubscribes on unmount', () => {
    sdk.getFeatureFlag.mockReturnValue('control');
    const { result, unmount } = renderHook(() => useFeatureFlagVariant('blog-state-hub-cta'));
    act(() => { for (const listener of sdk.listeners) listener(); });
    expect(result.current).toBe('control');
    sdk.getFeatureFlag.mockReturnValue('test');
    act(() => { for (const listener of sdk.listeners) listener(); });
    expect(result.current).toBe('test');
    unmount();
    expect(sdk.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('stays undefined when the SDK throws', () => {
    sdk.onFeatureFlags.mockImplementation(() => { throw new Error('blocked'); });
    const { result, unmount } = renderHook(() => useFeatureFlagVariant('blog-state-hub-cta'));
    expect(result.current).toBeUndefined();
    expect(() => unmount()).not.toThrow();

    sdk.onFeatureFlags.mockImplementation((listener: () => void) => { sdk.listeners.push(listener); return sdk.unsubscribe; });
    sdk.getFeatureFlag.mockImplementation(() => { throw new Error('storage'); });
    const second = renderHook(() => useFeatureFlagVariant('blog-state-hub-cta'));
    act(() => { for (const listener of sdk.listeners) listener(); });
    expect(second.result.current).toBeUndefined();
  });
});
