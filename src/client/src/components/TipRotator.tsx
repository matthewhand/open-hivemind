import React, { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { apiService } from '../services/api';

/**
 * Rotates through tips from TIPS.md with a fade animation.
 * Fetches tips on mount, cycles every 8 seconds.
 */
const TipRotator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [tips, setTips] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);

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

  return (
    <div className={`flex items-center gap-2 text-sm text-base-content/70 ${className}`}>
      <Lightbulb className="w-4 h-4 text-warning shrink-0" />
      <span
        className={`transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}
      >
        {tips[index]}
      </span>
    </div>
  );
};

export default TipRotator;
