import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { ToastProvider, useErrorToast, useSuccessToast } from '../ToastNotification';

const TestComponent = () => {
  const showError = useErrorToast();
  const showSuccess = useSuccessToast();

  useEffect(() => {
    showError('Error Title', 'Error Message');
    showSuccess('Success Title', 'Success Message');
  }, [showError, showSuccess]);

  return <div>Test Component</div>;
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

    const errorAlert = errorToast.closest('.alert');
    expect(errorAlert).toBeInTheDocument();
    // These assertions confirm the NEW state (present attributes)
    expect(errorAlert).toHaveAttribute('role', 'alert');
    expect(errorAlert).toHaveAttribute('aria-live', 'assertive');

    const successAlert = successToast.closest('.alert');
    expect(successAlert).toBeInTheDocument();
    expect(successAlert).toHaveAttribute('role', 'status');
    expect(successAlert).toHaveAttribute('aria-live', 'polite');
  });
});
