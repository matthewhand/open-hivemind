import { useContext } from 'react';
import { AuditTrailContext } from './AuditTrailProvider';

export const useAuditTrail = () => {
  const context = useContext(AuditTrailContext);
  if (!context) {
    throw new Error('useAuditTrail must be used within a AuditTrailProvider');
  }
  return context;
};

export default useAuditTrail;