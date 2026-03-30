import { useContext } from 'react';
import { PWAContext } from './PWAProvider';

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

export default usePWA;