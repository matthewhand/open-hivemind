import { useContext } from 'react';
import { CacheContext } from './CacheProvider';

export const useCache = () => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
};

export default useCache;