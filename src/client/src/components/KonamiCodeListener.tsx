import React, { useCallback } from 'react';
import { useKonamiCode } from '../hooks/useKonamiCode';

const KonamiCodeListener: React.FC = () => {
  const toggleHackerMode = useCallback(() => {
    document.documentElement.classList.toggle('theme-hacker');
  }, []);

  useKonamiCode(toggleHackerMode);

  return null;
};

export default KonamiCodeListener;
