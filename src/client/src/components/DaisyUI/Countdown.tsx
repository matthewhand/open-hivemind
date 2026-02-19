import React, { useState, useEffect, useCallback } from 'react';

interface CountdownProps {
  targetDate: Date | number; // Either a Date object or a timestamp
  onComplete?: () => void;
  size?: 'xs' | 'sm' | 'md' | 'lg'; // DaisyUI size classes
  className?: string;
}

const Countdown: React.FC<CountdownProps> = ({
  targetDate,
  onComplete,
  size = 'md',
  className = '',
}) => {
  const calculateTimeLeft = useCallback((): { days: number; hours: number; minutes: number; seconds: number; totalSeconds: number } => {
    const targetTime = typeof targetDate === 'number' ? targetDate : targetDate.getTime();
    const now = Date.now();
    const difference = targetTime - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return {
      days,
      hours,
      minutes,
      seconds,
      totalSeconds: Math.floor(difference / 1000),
    };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    // Recalculate immediately in case target date changed
    setTimeLeft(calculateTimeLeft());
    
    // Set up interval to update the time left
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      // If the countdown has reached zero, clear the interval
      if (newTimeLeft.totalSeconds <= 0) {
        clearInterval(timer);
        if (onComplete) {
          onComplete();
        }
      }
    }, 1000);

    // Cleanup function to clear the interval when component unmounts
    return () => clearInterval(timer);
  }, [calculateTimeLeft, onComplete]);

  // Determine if the countdown has finished
  const isFinished = timeLeft.totalSeconds <= 0;

  // DaisyUI size class mapping
  const sizeClass = `countdown-${size}`;

  return (
    <div 
      className={`countdown ${sizeClass} ${className}`}
      aria-label="Countdown timer"
      role="timer"
      aria-live="polite"
    >
      {isFinished ? (
        <span aria-label="Countdown finished">00:00:00:00</span>
      ) : (
        <>
          <span style={{ '--value': timeLeft.days } as React.CSSProperties} aria-label={`Days remaining: ${timeLeft.days}`}></span>
          <span className="ml-1">:</span>
          <span style={{ '--value': timeLeft.hours } as React.CSSProperties} aria-label={`Hours remaining: ${timeLeft.hours}`}></span>
          <span className="ml-1">:</span>
          <span style={{ '--value': timeLeft.minutes } as React.CSSProperties} aria-label={`Minutes remaining: ${timeLeft.minutes}`}></span>
          <span className="ml-1">:</span>
          <span style={{ '--value': timeLeft.seconds } as React.CSSProperties} aria-label={`Seconds remaining: ${timeLeft.seconds}`}></span>
        </>
      )}
    </div>
  );
};

export default Countdown;