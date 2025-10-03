import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import ToastNotification from '@/components/DaisyUI/ToastNotification';

describe('ToastNotification Component', () => {
  it('renders without crashing', () => {
    render(<ToastNotification message="Test message" />);
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('displays the message', () => {
    render(<ToastNotification message="Test message" />);
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('displays the title when provided', () => {
    render(<ToastNotification title="Test Title" message="Test message" />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<ToastNotification message="Test message" className="custom-toast" />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('custom-toast');
  });

  it('supports different variants', () => {
    render(<ToastNotification message="Success message" variant="success" />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('alert-success');
  });

  it('auto-dismisses after duration', () => {
    jest.useFakeTimers();
    const mockOnClose = jest.fn();
    
    render(<ToastNotification message="Auto dismiss" autoDismiss duration={1000} onClose={mockOnClose} />);
    
    jest.advanceTimersByTime(1000);
    
    expect(mockOnClose).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('handles manual close', () => {
    const mockOnClose = jest.fn();
    render(<ToastNotification message="Manual close" onClose={mockOnClose} />);
    
    const closeButton = screen.getByLabelText('Close notification');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('is accessible', () => {
    render(<ToastNotification message="Accessible message" />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('supports custom action button', () => {
    const mockAction = jest.fn();
    render(
      <ToastNotification 
        message="Message with action" 
        action={{ label: 'Action', onClick: mockAction }}
      />
    );
    
    const actionButton = screen.getByText('Action');
    fireEvent.click(actionButton);
    
    expect(mockAction).toHaveBeenCalled();
  });

  it('shows icon when enabled', () => {
    render(<ToastNotification message="Message with icon" showIcon />);
    
    const icon = screen.getByRole('img');
    expect(icon).toBeInTheDocument();
  });
});