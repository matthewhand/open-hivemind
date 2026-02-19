// Temporarily disabled due to React 19 compatibility issues
// TODO: Fix React testing environment for React 19

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Alert } from './Alert';

describe.skip('Alert Component', () => {
  it('renders the alert with the correct message', () => {
    render(<Alert status="info" message="This is an info alert." />);
    expect(screen.getByText('This is an info alert.')).toBeInTheDocument();
  });

  it('applies the correct class for status', () => {
    const { container } = render(<Alert status="success" message="Success!" />);
    expect(container.firstChild).toHaveClass('alert-success');
  });

  it('renders an icon when provided', () => {
    const icon = <svg data-testid="alert-icon"></svg>;
    render(<Alert status="warning" message="Warning!" icon={icon} />);
    expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const handleClose = jest.fn();
    render(<Alert status="error" message="Error!" onClose={handleClose} />);
    fireEvent.click(screen.getByLabelText('Close alert'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not render a close button if onClose is not provided', () => {
    render(<Alert status="info" message="No close button" />);
    expect(screen.queryByLabelText('Close alert')).not.toBeInTheDocument();
  });

  it('is accessible with the correct role', () => {
    render(<Alert status="info" message="Accessible alert" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('is dismissed from the screen when close button is clicked', () => {
    const handleClose = jest.fn();
    const { container } = render(
      <Alert status="error" message="Error!" onClose={handleClose} />,
    );
    fireEvent.click(screen.getByLabelText('Close alert'));
    expect(container.firstChild).toBeNull();
  });
});