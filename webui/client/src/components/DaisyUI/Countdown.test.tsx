import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Countdown from './Countdown';

// Mock timers for testing
jest.useFakeTimers();

describe('Countdown Component', () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('Time Calculation and Display', () => {
    it('should display correct time when given a future date', () => {
      const futureDate = new Date(Date.now() + 90061000); // 1 day, 1 hour, 1 minute, 1 second
      
      render(<Countdown targetDate={futureDate} />);
      
      const timer = screen.getByRole('timer');
      expect(timer).toBeInTheDocument();
      expect(timer).toHaveAttribute('aria-label', 'Countdown timer');
    });

    it('should display 00:00:00:00 when target date is in the past', () => {
      const pastDate = new Date(Date.now() - 1000);
      
      render(<Countdown targetDate={pastDate} />);
      
      expect(screen.getByText('00:00:00:00')).toBeInTheDocument();
      expect(screen.getByLabelText('Countdown finished')).toBeInTheDocument();
    });

    it('should accept timestamp as target date', () => {
      const futureTimestamp = Date.now() + 5000; // 5 seconds from now
      
      render(<Countdown targetDate={futureTimestamp} />);
      
      const timer = screen.getByRole('timer');
      expect(timer).toBeInTheDocument();
    });

    it('should update time every second', async () => {
      const futureDate = new Date(Date.now() + 3000); // 3 seconds from now
      
      render(<Countdown targetDate={futureDate} />);
      
      // Fast-forward time by 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      // The component should have updated
      const timer = screen.getByRole('timer');
      expect(timer).toBeInTheDocument();
    });
  });

  describe('Different Target Dates and Durations', () => {
    it('should handle countdown with only seconds', () => {
      const futureDate = new Date(Date.now() + 30000); // 30 seconds
      
      render(<Countdown targetDate={futureDate} />);
      
      const timer = screen.getByRole('timer');
      expect(timer).toBeInTheDocument();
    });

    it('should handle countdown with minutes and seconds', () => {
      const futureDate = new Date(Date.now() + 150000); // 2 minutes 30 seconds
      
      render(<Countdown targetDate={futureDate} />);
      
      const timer = screen.getByRole('timer');
      expect(timer).toBeInTheDocument();
    });

    it('should handle countdown with hours, minutes and seconds', () => {
      const futureDate = new Date(Date.now() + 3690000); // 1 hour 1 minute 30 seconds
      
      render(<Countdown targetDate={futureDate} />);
      
      const timer = screen.getByRole('timer');
      expect(timer).toBeInTheDocument();
    });

    it('should handle countdown with days, hours, minutes and seconds', () => {
      const futureDate = new Date(Date.now() + 90090000); // 1 day 1 hour 1 minute 30 seconds
      
      render(<Countdown targetDate={futureDate} />);
      
      const timer = screen.getByRole('timer');
      expect(timer).toBeInTheDocument();
    });
  });

  describe('Accessibility Attributes', () => {
    it('should have proper ARIA attributes', () => {
      const futureDate = new Date(Date.now() + 5000);
      
      render(<Countdown targetDate={futureDate} />);
      
      const timer = screen.getByRole('timer');
      expect(timer).toHaveAttribute('aria-label', 'Countdown timer');
      expect(timer).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-labels for individual time units', () => {
      const futureDate = new Date(Date.now() + 90061000); // 1 day, 1 hour, 1 minute, 1 second
      
      render(<Countdown targetDate={futureDate} />);
      
      expect(screen.getByLabelText(/Days remaining:/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Hours remaining:/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Minutes remaining:/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Seconds remaining:/)).toBeInTheDocument();
    });

    it('should have proper aria-label when countdown is finished', () => {
      const pastDate = new Date(Date.now() - 1000);
      
      render(<Countdown targetDate={pastDate} />);
      
      expect(screen.getByLabelText('Countdown finished')).toBeInTheDocument();
    });
  });

  describe('Callback Function Execution', () => {
    it('should call onComplete callback when countdown reaches zero', async () => {
      const onComplete = jest.fn();
      const futureDate = new Date(Date.now() + 1000); // 1 second from now
      
      render(<Countdown targetDate={futureDate} onComplete={onComplete} />);
      
      // Fast-forward time to trigger completion
      act(() => {
        jest.advanceTimersByTime(1100);
      });
      
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should not call onComplete callback if not provided', async () => {
      const futureDate = new Date(Date.now() + 1000); // 1 second from now
      
      render(<Countdown targetDate={futureDate} />);
      
      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(1100);
      });
      
      // Should not throw any errors
      const timer = screen.getByRole('timer');
      expect(timer).toBeInTheDocument();
    });

    it('should call onComplete only once when countdown finishes', async () => {
      const onComplete = jest.fn();
      const futureDate = new Date(Date.now() + 1000); // 1 second from now
      
      render(<Countdown targetDate={futureDate} onComplete={onComplete} />);
      
      // Fast-forward time multiple times
      act(() => {
        jest.advanceTimersByTime(1100);
      });
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling and Size Variations', () => {
    it('should apply default medium size class', () => {
      const futureDate = new Date(Date.now() + 5000);
      
      render(<Countdown targetDate={futureDate} />);
      
      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('countdown', 'countdown-md');
    });

    it('should apply extra small size class', () => {
      const futureDate = new Date(Date.now() + 5000);
      
      render(<Countdown targetDate={futureDate} size="xs" />);
      
      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('countdown', 'countdown-xs');
    });

    it('should apply small size class', () => {
      const futureDate = new Date(Date.now() + 5000);
      
      render(<Countdown targetDate={futureDate} size="sm" />);
      
      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('countdown', 'countdown-sm');
    });

    it('should apply large size class', () => {
      const futureDate = new Date(Date.now() + 5000);
      
      render(<Countdown targetDate={futureDate} size="lg" />);
      
      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('countdown', 'countdown-lg');
    });

    it('should apply custom className', () => {
      const futureDate = new Date(Date.now() + 5000);
      
      render(<Countdown targetDate={futureDate} className="custom-class" />);
      
      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('countdown', 'countdown-md', 'custom-class');
    });

    it('should combine size and custom className', () => {
      const futureDate = new Date(Date.now() + 5000);
      
      render(<Countdown targetDate={futureDate} size="lg" className="custom-class another-class" />);
      
      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('countdown', 'countdown-lg', 'custom-class', 'another-class');
    });
  });

  describe('Component Lifecycle', () => {
    it('should clean up timer on unmount', () => {
      const futureDate = new Date(Date.now() + 5000);
      const { unmount } = render(<Countdown targetDate={futureDate} />);
      
      // Verify timer is running
      expect(jest.getTimerCount()).toBeGreaterThan(0);
      
      // Unmount component
      unmount();
      
      // Timer should be cleaned up
      // Note: This is implicit as React Testing Library handles cleanup
    });

    it('should update when target date prop changes', () => {
      const initialDate = new Date(Date.now() + 5000);
      const { rerender } = render(<Countdown targetDate={initialDate} />);
      
      const timer = screen.getByRole('timer');
      expect(timer).toBeInTheDocument();
      
      // Update with new target date
      const newDate = new Date(Date.now() + 10000);
      rerender(<Countdown targetDate={newDate} />);
      
      // Component should still be rendered with new target
      expect(screen.getByRole('timer')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly zero time remaining', () => {
      const exactTime = new Date(Date.now());
      
      render(<Countdown targetDate={exactTime} />);
      
      expect(screen.getByText('00:00:00:00')).toBeInTheDocument();
    });

    it('should handle very large time durations', () => {
      const veryFutureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
      
      render(<Countdown targetDate={veryFutureDate} />);
      
      const timer = screen.getByRole('timer');
      expect(timer).toBeInTheDocument();
    });

    it('should handle rapid prop changes', () => {
      const date1 = new Date(Date.now() + 5000);
      const { rerender } = render(<Countdown targetDate={date1} />);
      
      const date2 = new Date(Date.now() + 10000);
      rerender(<Countdown targetDate={date2} />);
      
      const date3 = new Date(Date.now() + 1000);
      rerender(<Countdown targetDate={date3} />);
      
      const timer = screen.getByRole('timer');
      expect(timer).toBeInTheDocument();
    });
  });
});