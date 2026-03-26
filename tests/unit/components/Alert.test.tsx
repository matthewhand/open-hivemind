/* @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Alert } from '../../../src/client/src/components/DaisyUI/Alert';

describe('Alert', () => {
  it('renders with a message', () => {
    render(<Alert message="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(<Alert><span>Custom child</span></Alert>);
    expect(screen.getByText('Custom child')).toBeInTheDocument();
  });

  it('has role="alert"', () => {
    render(<Alert message="msg" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it.each(['info', 'success', 'warning', 'error'] as const)(
    'applies alert-%s class for status="%s"',
    (status) => {
      render(<Alert status={status} message={status} />);
      expect(screen.getByRole('alert').className).toContain(`alert-${status}`);
    },
  );

  it('uses variant as alias for status', () => {
    render(<Alert variant="error" message="err" />);
    expect(screen.getByRole('alert').className).toContain('alert-error');
  });

  it('defaults to info when no status or variant', () => {
    render(<Alert message="default" />);
    expect(screen.getByRole('alert').className).toContain('alert-info');
  });

  it('shows close button only when onClose is provided', () => {
    const { rerender } = render(<Alert message="no close" />);
    expect(screen.queryByLabelText('Close alert')).not.toBeInTheDocument();

    rerender(<Alert message="has close" onClose={jest.fn()} />);
    expect(screen.getByLabelText('Close alert')).toBeInTheDocument();
  });

  it('calls onClose and hides the alert when close button is clicked', () => {
    const onClose = jest.fn();
    render(<Alert message="closable" onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close alert'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Alert message="styled" className="my-custom" />);
    expect(screen.getByRole('alert').className).toContain('my-custom');
  });

  it('renders a custom icon element', () => {
    render(<Alert message="with icon" icon={<span data-testid="alert-icon">!</span>} />);
    expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
  });
});
