import React from 'react';
import { useInactivity } from '../hooks/useInactivity';
import CyberScreensaver from './DaisyUI/CyberScreensaver';

interface ScreensaverProps {
  timeoutMs?: number;
  enabled?: boolean;
}

/**
 * Screensaver overlays the app after a period of inactivity.
 * Uses the CyberScreensaver component for a futuristic system monitor look.
 * Wakes immediately on any user interaction (handled via useInactivity hook listeners).
 */
const Screensaver: React.FC<ScreensaverProps> = ({
  timeoutMs = 5 * 60_000, // 5 minutes default
  enabled = true,
}) => {
  const { isIdle } = useInactivity({ timeoutMs });

  if (!enabled || !isIdle) {
    return null;
  }

  return <CyberScreensaver />;
};

export default Screensaver;
