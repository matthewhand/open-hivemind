import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box } from '@mui/material';
import LoadingSpinner from './LoadingSpinner';
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
    if (!el) return;
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

  if (!enabled || !isIdle) return null;

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: 'rgba(0,0,0,0.85)',
        color: '#fff',
        zIndex: 2000,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        cursor: 'none',
      }}
      // Click or movement will already wake via global listeners; manual pointer events suppressed
    >
      <Box
        sx={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)',
          transition: 'left 1.2s ease-in-out, top 1.2s ease-in-out',
        }}
      >
        <LoadingSpinner message="" size={64} />
      </Box>
    </Box>
  );
};

export default Screensaver;
