import { useContext } from 'react';
import { MultiTenantContext } from './MultiTenantProvider';

export const useMultiTenant = () => {
  const context = useContext(MultiTenantContext);
  if (!context) {
    throw new Error('useMultiTenant must be used within a MultiTenantProvider');
  }
  return context;
};

export default useMultiTenant;