import { render, screen, act } from '../../../test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Countdown from '../Countdown';

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders all units by default', () => {
    // 1 day + 2 hours + 3 mins + 4 secs = 93784 seconds
    const target = Date.now() + 93784000;
    render(<Countdown targetDate={target} />);

    expect(screen.getByLabelText('Days remaining: 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Hours remaining: 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Minutes remaining: 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Seconds remaining: 4')).toBeInTheDocument();
  });

  it('renders only minutes and seconds when compact is true and less than an hour remains', () => {
    // 3 mins + 4 secs = 184 seconds
    const target = Date.now() + 184000;
    render(<Countdown targetDate={target} compact />);

    expect(screen.queryByLabelText(/Days remaining:/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Hours remaining:/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Minutes remaining: 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Seconds remaining: 4')).toBeInTheDocument();
  });

  it('calls onComplete when timer finishes', () => {
    const target = Date.now() + 1000;
    const onComplete = vi.fn();
    render(<Countdown targetDate={target} onComplete={onComplete} />);

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Countdown finished')).toBeInTheDocument();
  });
});
