import { render, screen, act } from '../../test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RateLimitIndicator from './RateLimitIndicator';
import { useRateLimit } from '../../hooks/useRateLimit';
import { useInactivity } from '../../hooks/useInactivity';

vi.mock('../../hooks/useRateLimit');
vi.mock('../../hooks/useInactivity');
// Mocking Countdown to simply display the target date timestamp
vi.mock('./Countdown', () => ({
  default: ({ targetDate, size }: any) => (
    <span data-testid="mock-countdown" data-size={size}>
      {targetDate.toString()}
    </span>
  ),
}));

describe('RateLimitIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (useRateLimit as any).mockReturnValue({
      limit: 100,
      remaining: 100,
      resetTime: 0,
      isNearLimit: false,
      isExhausted: false,
    });
    (useInactivity as any).mockReturnValue({
      isIdle: false,
      lastActive: Date.now(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders nothing when over 50% limit and not inactive', () => {
    render(<RateLimitIndicator />);
    expect(screen.queryByText(/remaining/i)).not.toBeInTheDocument();
  });

  it('renders yellow badge when between 10% and 50% limit', () => {
    (useRateLimit as any).mockReturnValue({
      limit: 100,
      remaining: 40,
      resetTime: 0,
      isNearLimit: false,
      isExhausted: false,
    });
    render(<RateLimitIndicator />);
    expect(screen.getByText('40/100')).toBeInTheDocument();
  });

  it('renders red badge and countdown when below 10% limit', () => {
    const resetTime = Date.now() + 60000;
    (useRateLimit as any).mockReturnValue({
      limit: 100,
      remaining: 5,
      resetTime,
      isNearLimit: true,
      isExhausted: false,
    });
    render(<RateLimitIndicator />);
    expect(screen.getByText('5/100')).toBeInTheDocument();
    expect(screen.getByTestId('mock-countdown')).toHaveTextContent(resetTime.toString());
  });

  it('renders session expiry warning when inactive for 80% of timeout', () => {
    const sessionTimeoutMs = 5 * 60_000;
    const now = Date.now();
    // Simulate being inactive for just over 80% of the timeout
    const lastActive = now - (sessionTimeoutMs * 0.81);

    (useInactivity as any).mockReturnValue({
      isIdle: false,
      lastActive,
    });

    render(<RateLimitIndicator />);

    // Advance timer to trigger interval
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText('Session expires in')).toBeInTheDocument();
    expect(screen.getByTestId('mock-countdown')).toBeInTheDocument();
  });
});
