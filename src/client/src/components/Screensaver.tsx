import React, { useEffect, useRef, useState, useCallback } from 'react';
import LoadingSpinnerComponent from './LoadingSpinner';
import { useInactivity } from '../hooks/useInactivity';

interface ScreensaverProps {
  timeoutMs?: number;
  enabled?: boolean;
  // Movement interval for repositioning the loading element
  moveIntervalMs?: number;
  // Padding from edges when positioning
  edgePadding?: number;
}

/**
 * Screensaver overlays the app after a period of inactivity.
 * Reuses the loading spinner visual but with a subtle floating movement.
 * Wakes immediately on any user interaction (handled via useInactivity hook listeners).
 */
const Screensaver: React.FC<ScreensaverProps> = ({
  timeoutMs = 5 * 60_000, // 5 minutes default
  enabled = true,
  moveIntervalMs = 6_000,
  edgePadding = 48,
}) => {
  const { isIdle } = useInactivity({ timeoutMs });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const moveTimer = useRef<number | null>(null);

  const randomizePosition = useCallback(() => {
    const el = containerRef.current;
    if (!el) {return;}
    const width = window.innerWidth;
    const height = window.innerHeight;
    const x = Math.random() * (width - edgePadding * 2) + edgePadding;
    const y = Math.random() * (height - edgePadding * 2) + edgePadding;
    setPosition({ x, y });
  }, [edgePadding]);

  useEffect(() => {
    if (isIdle && enabled) {
      randomizePosition();
      moveTimer.current = window.setInterval(randomizePosition, moveIntervalMs);
    } else {
      if (moveTimer.current) {
        window.clearInterval(moveTimer.current);
        moveTimer.current = null;
      }
    }
    return () => {
      if (moveTimer.current) {
        window.clearInterval(moveTimer.current);
      }
    };
  }, [isIdle, enabled, moveIntervalMs, randomizePosition]);

  if (!enabled || !isIdle) {return null;}

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black/85 text-white z-[2000] overflow-hidden flex items-center justify-center select-none cursor-none"
    >
      <div
        className="absolute transition-all duration-[1200ms] ease-in-out"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <LoadingSpinnerComponent message="" size="lg" />
      </div>
    </div>
  );
};

export default Screensaver;
