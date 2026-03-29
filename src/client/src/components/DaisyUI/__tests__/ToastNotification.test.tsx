import React, { useEffect } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useErrorToast, useSuccessToast, useToast } from '../ToastNotification';

const TestComponent = () => {
  const showError = useErrorToast();
  const showSuccess = useSuccessToast();

  useEffect(() => {
    showError('Error Title', 'Error Message');
    showSuccess('Success Title', 'Success Message');
  }, [showError, showSuccess]);

  return <div>Test Component</div>;
};

const ActionToastComponent = () => {
  const { addToast } = useToast();
  const [actionExecuted, setActionExecuted] = React.useState(false);

  const showToastWithAction = () => {
    addToast({
      type: 'success',
      title: 'Action Test',
      message: 'Toast with action button',
      actions: [
        {
          label: 'Undo',
          action: () => setActionExecuted(true),
          style: 'primary',
        },
      ],
    });
  };

  return (
    <div>
      <button onClick={showToastWithAction}>Show Toast</button>
      {actionExecuted && <div>Action Executed</div>}
    </div>
  );
};

const PersistentToastComponent = () => {
  const { addToast } = useToast();

  const showPersistentToast = () => {
    addToast({
      type: 'warning',
      title: 'Persistent Toast',
      message: 'This toast will not auto-dismiss',
      persistent: true,
    });
  };

  return (
    <div>
      <button onClick={showPersistentToast}>Show Persistent Toast</button>
    </div>
  );
};

describe('ToastNotification Accessibility', () => {
  it('renders toasts with correct accessibility attributes', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Wait for toasts to appear
    const errorToast = await screen.findByText('Error Title');
    const successToast = await screen.findByText('Success Title');

    const errorAlert = errorToast.closest('[role="alert"]');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveAttribute('role', 'alert');
    expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
    expect(errorAlert).toHaveAttribute('aria-atomic', 'true');

    const successAlert = successToast.closest('[role="status"]');
    expect(successAlert).toBeInTheDocument();
    expect(successAlert).toHaveAttribute('role', 'status');
    expect(successAlert).toHaveAttribute('aria-live', 'polite');
    expect(successAlert).toHaveAttribute('aria-atomic', 'true');
  });

  it('renders SVG icons instead of emoji for better accessibility', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await screen.findByText('Error Title');

    // Check that SVG icons are used (not emoji)
    const svgIcons = document.querySelectorAll('svg[aria-hidden="true"]');
    expect(svgIcons.length).toBeGreaterThan(0);
  });

  it('has properly labeled dismiss buttons', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await screen.findByText('Error Title');

    // Check for dismiss button with aria-label
    const dismissButtons = screen.getAllByLabelText(/Dismiss.*notification/i);
    expect(dismissButtons.length).toBeGreaterThan(0);
  });

  it('provides unique IDs for toast title and message', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await screen.findByText('Error Title');

    const titleElement = screen.getByText('Error Title');
    const messageElement = screen.getByText('Error Message');

    expect(titleElement).toHaveAttribute('id');
    expect(messageElement).toHaveAttribute('id');
    expect(titleElement.id).toMatch(/^toast-title-/);
    expect(messageElement.id).toMatch(/^toast-message-/);
  });
});

describe('ToastNotification Action Buttons', () => {
  it('renders action buttons with correct labels', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ActionToastComponent />
      </ToastProvider>
    );

    const showButton = screen.getByText('Show Toast');
    await user.click(showButton);

    // Wait for toast to appear
    await screen.findByText('Action Test');

    // Check for action button
    const undoButton = screen.getByRole('button', { name: 'Undo' });
    expect(undoButton).toBeInTheDocument();
  });

  it('executes action when button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ActionToastComponent />
      </ToastProvider>
    );

    const showButton = screen.getByText('Show Toast');
    await user.click(showButton);

    await screen.findByText('Action Test');

    const undoButton = screen.getByRole('button', { name: 'Undo' });
    await user.click(undoButton);

    // Check that action was executed
    await screen.findByText('Action Executed');
  });

  it('action buttons have proper role group', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ActionToastComponent />
      </ToastProvider>
    );

    const showButton = screen.getByText('Show Toast');
    await user.click(showButton);

    await screen.findByText('Action Test');

    // Check for action group
    const actionGroup = screen.getByRole('group', { name: 'Toast actions' });
    expect(actionGroup).toBeInTheDocument();
  });

  it('dismisses toast when action is executed', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ActionToastComponent />
      </ToastProvider>
    );

    const showButton = screen.getByText('Show Toast');
    await user.click(showButton);

    const toastTitle = await screen.findByText('Action Test');
    expect(toastTitle).toBeInTheDocument();

    const undoButton = screen.getByRole('button', { name: 'Undo' });
    await user.click(undoButton);

    // Wait for toast to be dismissed (after animation)
    await waitFor(
      () => {
        expect(screen.queryByText('Action Test')).not.toBeInTheDocument();
      },
      { timeout: 500 }
    );
  });
});

describe('ToastNotification Auto-dismiss', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('auto-dismisses after duration', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const successToast = await screen.findByText('Success Title');
    expect(successToast).toBeInTheDocument();

    // Fast-forward time past the duration (5000ms default)
    act(() => {
      jest.advanceTimersByTime(5100);
    });

    await waitFor(() => {
      expect(screen.queryByText('Success Title')).not.toBeInTheDocument();
    });
  });

  it('does not auto-dismiss persistent toasts', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <PersistentToastComponent />
      </ToastProvider>
    );

    const showButton = screen.getByText('Show Persistent Toast');
    await user.click(showButton);

    const toastTitle = await screen.findByText('Persistent Toast');
    expect(toastTitle).toBeInTheDocument();

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Toast should still be present
    expect(screen.getByText('Persistent Toast')).toBeInTheDocument();
  });
});

describe('ToastNotification Progress Bar', () => {
  it('renders progress bar for auto-dismiss toasts', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await screen.findByText('Success Title');

    // Check for progress bar (it should be in the DOM)
    const progressBars = document.querySelectorAll('[aria-hidden="true"]');
    const hasProgressBar = Array.from(progressBars).some((el) => {
      const parent = el.parentElement;
      return parent?.style.width && parent.classList.contains('absolute');
    });

    expect(hasProgressBar).toBe(true);
  });

  it('does not render progress bar for persistent toasts', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <PersistentToastComponent />
      </ToastProvider>
    );

    const showButton = screen.getByText('Show Persistent Toast');
    await user.click(showButton);

    await screen.findByText('Persistent Toast');

    // Get the toast container
    const toastContainer = screen.getByText('Persistent Toast').closest('[role="alert"]');

    // Check that there's no progress bar (by checking for the specific class structure)
    const progressBar = toastContainer?.querySelector('.absolute.bottom-0.left-0.h-1');
    expect(progressBar).not.toBeInTheDocument();
  });
});

describe('ToastNotification Positioning', () => {
  it('does not overlap important UI (uses safe positioning)', async () => {
    render(
      <ToastProvider position="top-right">
        <TestComponent />
      </ToastProvider>
    );

    await screen.findByText('Success Title');

    // Check that toast container has appropriate positioning classes
    const toastRegion = screen.getByRole('region', { name: 'Notifications' });
    expect(toastRegion).toHaveClass('fixed', 'z-50', 'top-4', 'right-4');
  });

  it('supports different position configurations', () => {
    const positions: Array<
      'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
    > = ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'];

    positions.forEach((position) => {
      const { unmount } = render(
        <ToastProvider position={position}>
          <div>Test</div>
        </ToastProvider>
      );

      const toastRegion = screen.getByRole('region', { name: 'Notifications' });
      expect(toastRegion).toBeInTheDocument();

      unmount();
    });
  });
});

describe('ToastNotification Dismiss Button', () => {
  it('manually dismisses toast when dismiss button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const successToast = await screen.findByText('Success Title');
    expect(successToast).toBeInTheDocument();

    // Find and click the dismiss button
    const dismissButton = screen.getAllByLabelText(/Dismiss.*notification/i)[0];
    await user.click(dismissButton);

    // Wait for toast to be dismissed (after animation)
    await waitFor(
      () => {
        expect(screen.queryByText('Success Title')).not.toBeInTheDocument();
      },
      { timeout: 500 }
    );
  });

  it('dismiss button has title attribute for better UX', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await screen.findByText('Success Title');

    const dismissButton = screen.getAllByLabelText(/Dismiss.*notification/i)[0];
    expect(dismissButton).toHaveAttribute('title', 'Dismiss notification');
  });
});
