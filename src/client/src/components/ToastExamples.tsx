/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import {
  useToast,
  useSuccessToast,
  useErrorToast,
  useWarningToast,
  useInfoToast,
} from './DaisyUI/ToastNotification';

/**
 * Toast Examples Component
 * Demonstrates the improved toast notification system with:
 * - Accessibility features (aria-live, aria-labels)
 * - Clear success/error icons (SVG icons)
 * - Action buttons (Undo, View details, etc.)
 * - Progress bar for auto-dismiss
 * - Proper positioning
 */
const ToastExamples: React.FC = () => {
  const { addToast } = useToast();
  const showSuccess = useSuccessToast();
  const showError = useErrorToast();
  const showWarning = useWarningToast();
  const showInfo = useInfoToast();

  const [undoCount, setUndoCount] = useState(0);

  // Basic toast examples
  const showBasicSuccess = () => {
    showSuccess('Success!', 'Your changes have been saved successfully.');
  };

  const showBasicError = () => {
    showError('Error occurred', 'Failed to save changes. Please try again.');
  };

  const showBasicWarning = () => {
    showWarning('Warning', 'This action cannot be undone.');
  };

  const showBasicInfo = () => {
    showInfo('Information', 'New features are available in this update.');
  };

  // Toast with action buttons
  const showToastWithUndo = () => {
    showSuccess('Item deleted', 'The item has been removed from your list.', {
      actions: [
        {
          label: 'Undo',
          action: () => {
            setUndoCount((prev) => prev + 1);
            showInfo('Undo successful', 'The item has been restored.');
          },
          style: 'primary',
        },
      ],
      duration: 6000,
    });
  };

  const showToastWithMultipleActions = () => {
    showError('Connection failed', 'Unable to connect to the server.', {
      actions: [
        {
          label: 'Retry',
          action: () => {
            showInfo('Retrying...', 'Attempting to reconnect to the server.');
          },
          style: 'primary',
        },
        {
          label: 'View Details',
          action: () => {
            showInfo('Error Details', 'Status Code: 500, Server: api.example.com');
          },
          style: 'ghost',
        },
      ],
      duration: 10000,
    });
  };

  const showToastWithViewDetails = () => {
    showWarning('Storage limit reached', 'You are using 95% of your storage space.', {
      actions: [
        {
          label: 'View Usage',
          action: () => {
            showInfo('Storage Usage', 'Documents: 2.5GB, Images: 1.2GB, Videos: 500MB');
          },
          style: 'secondary',
        },
        {
          label: 'Upgrade',
          action: () => {
            showSuccess('Upgrade', 'Redirecting to upgrade page...');
          },
          style: 'primary',
        },
      ],
      duration: 8000,
    });
  };

  const showPersistentToast = () => {
    addToast({
      type: 'warning',
      title: 'Manual confirmation required',
      message: 'Please review the changes before proceeding.',
      persistent: true,
      actions: [
        {
          label: 'Review',
          action: () => {
            showInfo('Opening review panel', 'Loading changes for review...');
          },
          style: 'primary',
        },
        {
          label: 'Skip',
          action: () => {
            showInfo('Skipped', 'Proceeding without review.');
          },
          style: 'ghost',
        },
      ],
    });
  };

  const showLongDurationToast = () => {
    showInfo('Processing...', 'Your request is being processed. This may take a few moments.', {
      duration: 15000,
    });
  };

  const showShortDurationToast = () => {
    showSuccess('Copied!', 'Text copied to clipboard.', {
      duration: 2000,
    });
  };

  // Real-world examples
  const showFileUploadSuccess = () => {
    showSuccess('Upload complete', 'document.pdf uploaded successfully.', {
      actions: [
        {
          label: 'View File',
          action: () => {
            showInfo('Opening file', 'Opening document.pdf...');
          },
          style: 'primary',
        },
        {
          label: 'Share',
          action: () => {
            showInfo('Share', 'Opening share dialog...');
          },
          style: 'ghost',
        },
      ],
    });
  };

  const showDataSaveWithUndo = () => {
    const originalData = { name: 'John Doe', email: 'john@example.com' };
    let undoExecuted = false;

    showSuccess('Profile updated', 'Your profile changes have been saved.', {
      actions: [
        {
          label: 'Undo',
          action: () => {
            if (!undoExecuted) {
              undoExecuted = true;
              // Simulated undo logic
              showInfo('Changes reverted', 'Your profile has been restored to its previous state.');
            }
          },
          style: 'secondary',
        },
      ],
      duration: 7000,
    });
  };

  const showNetworkErrorWithRetry = () => {
    let retryAttempt = 0;

    const attemptRetry = () => {
      retryAttempt++;
      showInfo(`Retry attempt ${retryAttempt}`, 'Attempting to reconnect...');

      setTimeout(() => {
        if (retryAttempt < 3) {
          showError('Retry failed', `Attempt ${retryAttempt} failed. Please try again.`, {
            actions: [
              {
                label: 'Retry',
                action: attemptRetry,
                style: 'primary',
              },
            ],
          });
        } else {
          showError('All retries failed', 'Please check your connection and try again later.');
        }
      }, 1000);
    };

    showError('Network error', 'Failed to load data from the server.', {
      actions: [
        {
          label: 'Retry',
          action: attemptRetry,
          style: 'primary',
        },
        {
          label: 'Cancel',
          action: () => {
            showInfo('Cancelled', 'Operation cancelled by user.');
          },
          style: 'ghost',
        },
      ],
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Toast Notification Examples</h1>
        <p className="text-base-content/70">
          Demonstrates improved toast notifications with accessibility features, action buttons, and progress bars.
        </p>
        {undoCount > 0 && (
          <div className="alert alert-info mt-4">
            <span>Undo action executed {undoCount} time(s)</span>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* Basic Toasts */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Basic Toasts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button className="btn btn-success" onClick={showBasicSuccess}>
              Show Success Toast
            </button>
            <button className="btn btn-error" onClick={showBasicError}>
              Show Error Toast
            </button>
            <button className="btn btn-warning" onClick={showBasicWarning}>
              Show Warning Toast
            </button>
            <button className="btn btn-info" onClick={showBasicInfo}>
              Show Info Toast
            </button>
          </div>
        </section>

        {/* Toasts with Action Buttons */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Toasts with Action Buttons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button className="btn btn-primary" onClick={showToastWithUndo}>
              Delete with Undo
            </button>
            <button className="btn btn-primary" onClick={showToastWithMultipleActions}>
              Error with Multiple Actions
            </button>
            <button className="btn btn-primary" onClick={showToastWithViewDetails}>
              Warning with Details
            </button>
            <button className="btn btn-primary" onClick={showPersistentToast}>
              Persistent Toast
            </button>
          </div>
        </section>

        {/* Duration Variations */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Duration Variations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button className="btn btn-secondary" onClick={showShortDurationToast}>
              Short Duration (2s)
            </button>
            <button className="btn btn-secondary" onClick={showLongDurationToast}>
              Long Duration (15s)
            </button>
          </div>
          <p className="text-sm text-base-content/60 mt-2">
            Watch the progress bar at the bottom of each toast to see the auto-dismiss timer.
          </p>
        </section>

        {/* Real-World Examples */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Real-World Examples</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button className="btn btn-accent" onClick={showFileUploadSuccess}>
              File Upload Success
            </button>
            <button className="btn btn-accent" onClick={showDataSaveWithUndo}>
              Save with Undo
            </button>
            <button className="btn btn-accent" onClick={showNetworkErrorWithRetry}>
              Network Error with Retry
            </button>
          </div>
        </section>

        {/* Accessibility Features */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Accessibility Features</h2>
          <div className="bg-base-200 rounded-lg p-6">
            <h3 className="font-semibold mb-3">Implemented Features:</h3>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>
                <strong>ARIA Live Regions:</strong> Toasts use <code>aria-live="polite"</code> for info/success and{' '}
                <code>aria-live="assertive"</code> for errors/warnings
              </li>
              <li>
                <strong>Proper Roles:</strong> <code>role="status"</code> for info/success,{' '}
                <code>role="alert"</code> for errors/warnings
              </li>
              <li>
                <strong>Clear Icons:</strong> SVG icons with proper semantics (not emoji) for better screen reader
                support
              </li>
              <li>
                <strong>Descriptive Labels:</strong> All buttons have clear <code>aria-label</code> attributes
              </li>
              <li>
                <strong>Progress Indicator:</strong> Visual progress bar shows remaining time before auto-dismiss
              </li>
              <li>
                <strong>Keyboard Accessible:</strong> All actions are keyboard accessible with focus management
              </li>
              <li>
                <strong>Safe Positioning:</strong> Toasts appear in corner positions that don't overlap important UI
              </li>
              <li>
                <strong>Action Grouping:</strong> Action buttons use <code>role="group"</code> for proper semantic
                grouping
              </li>
            </ul>
          </div>
        </section>

        {/* Usage Examples */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Code Examples</h2>
          <div className="bg-base-200 rounded-lg p-6">
            <h3 className="font-semibold mb-3">Basic Usage:</h3>
            <pre className="bg-base-300 p-4 rounded text-xs overflow-x-auto">
              {`import { useSuccessToast } from './components/DaisyUI/ToastNotification';

const MyComponent = () => {
  const showSuccess = useSuccessToast();

  const handleSave = () => {
    // ... save logic
    showSuccess('Saved!', 'Your changes have been saved.');
  };

  return <button onClick={handleSave}>Save</button>;
};`}
            </pre>

            <h3 className="font-semibold mb-3 mt-6">With Action Buttons:</h3>
            <pre className="bg-base-300 p-4 rounded text-xs overflow-x-auto">
              {`showSuccess('Item deleted', 'Successfully removed.', {
  actions: [
    {
      label: 'Undo',
      action: () => restoreItem(),
      style: 'primary'
    },
    {
      label: 'View Details',
      action: () => showDetails(),
      style: 'ghost'
    }
  ],
  duration: 6000
});`}
            </pre>

            <h3 className="font-semibold mb-3 mt-6">Persistent Toast:</h3>
            <pre className="bg-base-300 p-4 rounded text-xs overflow-x-auto">
              {`addToast({
  type: 'warning',
  title: 'Confirmation required',
  message: 'Please review before proceeding.',
  persistent: true, // Won't auto-dismiss
  actions: [
    {
      label: 'Confirm',
      action: () => handleConfirm(),
      style: 'primary'
    }
  ]
});`}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ToastExamples;
