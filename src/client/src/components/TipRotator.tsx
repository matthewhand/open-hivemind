import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { useUIStore, selectHintStyle } from '../store/uiStore';
import HintDisplay from './DaisyUI/HintDisplay';

/**
 * Rotates through tips from TIPS.md with a fade animation.
 * Fetches tips on mount, cycles every 8 seconds.
 * Respects the user's hintStyle preference for compact/text/full display.
 */
const TipRotator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [tips, setTips] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const hintStyle = useUIStore(selectHintStyle);

  useEffect(() => {
    apiService
      .get('/api/dashboard/tips')
      .then((data: any) => {
        const t = data?.data?.tips;
        if (Array.isArray(t) && t.length > 0) {
          setTips(t);
          setIndex(Math.floor(Math.random() * t.length)); // start random
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tips.length < 2) return;
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % tips.length);
        setFading(false);
      }, 300);
    }, 8000);
    return () => clearInterval(timer);
  }, [tips.length]);

  if (tips.length === 0) return null;

  // Compact: icon only with tooltip
  if (hintStyle === 'icon') {
    return (
      <HintDisplay text={tips[index]} variant="tip" className={className} />
    );
  }

  // Text or Full: use HintDisplay for consistency
  if (hintStyle === 'text') {
    return (
      <div className={className}>
        <HintDisplay text={tips[index]} variant="tip" />
      </div>
    );
  }

  // Full: styled card
  return (
    <div className={className}>
      <HintDisplay
        text={tips[index]}
        variant="tip"
        className={`transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
};

export default TipRotator;
