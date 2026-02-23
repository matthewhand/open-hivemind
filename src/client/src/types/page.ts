import React from 'react';

export interface PageLifecycleOptions<T> {
  fetchData: () => Promise<T>;
  title?: string;
  autoRefresh?: boolean;
}

export interface PageLifecycleResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}
