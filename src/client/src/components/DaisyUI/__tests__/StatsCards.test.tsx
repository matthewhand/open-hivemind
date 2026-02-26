import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import StatsCards from '../StatsCards';

describe('StatsCards', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders correctly with stats and animates to final value', async () => {
    const stats = [
      { id: '1', title: 'Test Stat', value: 100, icon: 'bot' },
    ];

    render(<StatsCards stats={stats} />);

    expect(screen.getByText('Test Stat')).toBeInTheDocument();

    // Initial value might be 0 due to animation start
    // We can check it's present.

    // Advance timers to finish animation
    act(() => {
      vi.advanceTimersByTime(1100); // Duration is 1000ms
    });

    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('cleans up intervals on unmount', () => {
    const stats = [
        { id: '1', title: 'Test Stat', value: 100, icon: 'bot' },
    ];

    const { unmount } = render(<StatsCards stats={stats} />);

    // Spy on clearInterval
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('updates values when stats change', () => {
      const { rerender } = render(<StatsCards stats={[{ id: '1', title: 'Test Stat', value: 100, icon: 'bot' }]} />);

      act(() => {
          vi.advanceTimersByTime(1100);
      });
      expect(screen.getByText('100')).toBeInTheDocument();

      // Update props
      rerender(<StatsCards stats={[{ id: '1', title: 'Test Stat', value: 200, icon: 'bot' }]} />);

      // Should animate to new value
      act(() => {
          vi.advanceTimersByTime(1100);
      });
      expect(screen.getByText('200')).toBeInTheDocument();
  });
});
