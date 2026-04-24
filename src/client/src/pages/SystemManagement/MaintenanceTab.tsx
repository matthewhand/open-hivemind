import React, { useState } from 'react';
import Card from '../../components/DaisyUI/Card';
import Button from '../../components/DaisyUI/Button';
import Input from '../../components/DaisyUI/Input';
import { useSuccessToast, useErrorToast } from '../../components/DaisyUI/ToastNotification';
import { apiService } from '../../services/api';
import { Trash2, AlertTriangle, RotateCcw } from 'lucide-react';
import { ConfirmModal } from '../../components/DaisyUI/Modal';

const MaintenanceTab: React.FC = () => {
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  const handleFactoryReset = async () => {
    if (confirmationPhrase !== 'confirm-factory-reset') {
      errorToast('Validation Error', 'Please type the confirmation phrase exactly.');
      return;
    }

    setIsResetting(true);
    try {
      await apiService.resetSystem(confirmationPhrase);
      successToast('Factory Reset', 'System has been successfully reset. Reloading...');
      setTimeout(() => window.location.reload(), 3000);
    } catch (error) {
      errorToast('Reset Failed', (error as Error).message || 'An error occurred during factory reset');
      setIsResetting(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="System Maintenance" icon={<RotateCcw className="w-5 h-5 text-primary" />}>
        <div className="p-4 space-y-6">
          <div className="bg-error/10 border border-error/20 p-4 rounded-lg flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-error flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-error">Factory Reset</h3>
              <p className="text-sm opacity-80 mt-1">
                This action is **irreversible**. It will wipe all data from the database, including:
              </p>
              <ul className="list-disc list-inside text-xs mt-2 space-y-1 opacity-70 grid grid-cols-2">
                <li>User Messages</li>
                <li>Inference Logs</li>
                <li>Bot Configurations</li>
                <li>Audit Trails</li>
                <li>Vector Memories</li>
                <li>System Logs</li>
              </ul>
              
              <div className="mt-6 space-y-4">
                <div className="form-control w-full max-w-md">
                  <label className="label">
                    <span className="label-text">To confirm, please type: <span className="font-mono font-bold select-all">confirm-factory-reset</span></span>
                  </label>
                  <Input
                    placeholder="Type the confirmation phrase here"
                    value={confirmationPhrase}
                    onChange={(e) => setConfirmationPhrase(e.target.value)}
                    className="input-error"
                  />
                </div>

                <Button
                  variant="error"
                  className="gap-2"
                  disabled={confirmationPhrase !== 'confirm-factory-reset' || isResetting}
                  onClick={() => setShowConfirmModal(true)}
                  loading={isResetting}
                >
                  <Trash2 className="w-4 h-4" />
                  Perform Factory Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="CRITICAL: Confirm Factory Reset"
        message="Are you absolutely sure? This will delete EVERY row in your database. This action cannot be undone."
        confirmVariant="error"
        confirmText="Yes, Nuke Everything"
        onConfirm={handleFactoryReset}
      />
    </div>
  );
};

export default MaintenanceTab;
