/**
 * Regression guard for PR #2705 (perf(client): fix BotsPage useMemo
 * invalidation and MobileFAB memo defeat).
 *
 * BotsPage now wraps its URL setters in `useCallback([setUrlParam])` —
 * that optimization only holds if `useUrlParams`'s `setValue` is itself
 * a stable reference across renders. The hook achieves this by wrapping
 * `setValue` in `useCallback([setSearchParams])` (where `setSearchParams`
 * is itself stable from react-router).
 *
 * If a future refactor breaks that stability (e.g. inlining the function,
 * adding a non-stable dep, recreating it via `useMemo` keyed on `values`),
 * BotsPage's `useCallback` deps would change every render, the downstream
 * `useMemo`s would invalidate, and the perf regression that #2705 fixed
 * would silently return — with no test failure to catch it.
 *
 * This test pins the contract by asserting object-identity equality of
 * `result.current.setValue` across an explicit re-render.
 */
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { useUrlParams } from '../useUrlParams';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(MemoryRouter, null, children);

describe('useUrlParams setValue reference stability (PR #2705 regression guard)', () => {
  it('returns the same setValue reference across re-renders', () => {
    const { result, rerender } = renderHook(
      () =>
        useUrlParams({
          search: { type: 'string', default: '' },
          page: { type: 'number', default: 1 },
        }),
      { wrapper },
    );

    const firstSetValue = result.current.setValue;
    rerender();
    const secondSetValue = result.current.setValue;

    // Object identity — not just behavioral equality. Downstream
    // useCallback([setUrlParam]) in consumers depends on this.
    expect(secondSetValue).toBe(firstSetValue);
  });

  it('keeps setValue stable across multiple re-renders', () => {
    const { result, rerender } = renderHook(
      () =>
        useUrlParams({
          status: { type: 'string', default: 'all' },
        }),
      { wrapper },
    );

    const initial = result.current.setValue;
    for (let i = 0; i < 5; i++) {
      rerender();
      expect(result.current.setValue).toBe(initial);
    }
  });
});
