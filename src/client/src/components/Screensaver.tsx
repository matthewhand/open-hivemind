import React, { useEffect, useRef, useState, useCallback } from 'react';
import LoadingSpinnerComponent from './LoadingSpinner';
import { useInactivity } from '../hooks/useInactivity';
import MatrixRain from './MatrixRain';

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
  const [forceActive, setForceActive] = useState(false);

  // Check for URL param override for testing/demo
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('screensaver') === 'true') {
        setForceActive(true);
      }
    }
  }, []);

  const isActive = (isIdle || forceActive) && enabled;

  const randomizePosition = useCallback(() => {
    if (!containerRef.current) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const x = Math.random() * (width - edgePadding * 2) + edgePadding;
    const y = Math.random() * (height - edgePadding * 2) + edgePadding;
    setPosition({ x, y });
  }, [edgePadding]);

  useEffect(() => {
    if (isActive) {
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
  }, [isActive, moveIntervalMs, randomizePosition]);

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black text-white z-[2000] overflow-hidden flex items-center justify-center select-none cursor-none"
    >
      {/* Background Effect */}
      <MatrixRain opacity={0.15} fontSize={16} speed={30} color="#0F0" />

      {/* Floating Foreground Element */}
      <div
        className="absolute transition-all duration-[1200ms] ease-in-out z-10"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="bg-black/80 p-6 rounded-full border border-green-500/30 shadow-[0_0_15px_rgba(0,255,0,0.3)] backdrop-blur-sm">
          <LoadingSpinnerComponent message="" size="lg" />
        </div>
      </div>
    </div>
  );
};

export default Screensaver;
