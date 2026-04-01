
import React from 'react';
import AlertPanel from '../../components/Monitoring/AlertPanel';
import { apiService } from '../../services/api';
import { useErrorToast } from '../../components/DaisyUI/ToastNotification';

const AlertsTab: React.FC = () => {
  const errorToast = useErrorToast();

  const handleAlertAcknowledge = async (alertId: string) => {
    try {
      await apiService.acknowledgeAlert(alertId);
    } catch (_error) {
      errorToast('Alert', 'Failed to acknowledge alert');
    }
  };

  const handleAlertResolve = async (alertId: string) => {
    try {
      await apiService.resolveAlert(alertId);
    } catch (_error) {
      errorToast('Alert', 'Failed to resolve alert');
    }
  };

  return (
    <AlertPanel
      onAcknowledge={handleAlertAcknowledge}
      onResolve={handleAlertResolve}
      maxAlerts={20}
    />
  );
};

export default AlertsTab;
