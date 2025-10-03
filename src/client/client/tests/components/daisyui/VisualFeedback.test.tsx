import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import VisualFeedback from '@/components/DaisyUI/VisualFeedback';

describe('VisualFeedback Component', () => {
  it('renders without crashing', () => {
    render(<VisualFeedback type="success" message="Success message" />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays the message', () => {
    render(<VisualFeedback type="success" message="Success message" />);
    
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('applies correct CSS classes based on type', () => {
    render(<VisualFeedback type="error" message="Error message" />);
    
    const feedback = screen.getByRole('status');
    expect(feedback).toHaveClass('alert-error');
  });

  it('supports different feedback types', () => {
    const { rerender } = render(<VisualFeedback type="success" message="Success" />);
    expect(screen.getByRole('status')).toHaveClass('alert-success');

    rerender(<VisualFeedback type="warning" message="Warning" />);
    expect(screen.getByRole('status')).toHaveClass('alert-warning');

    rerender(<VisualFeedback type="info" message="Info" />);
    expect(screen.getByRole('status')).toHaveClass('alert-info');
  });

  it('applies custom CSS classes', () => {
    render(<VisualFeedback type="success" message="Success" className="custom-feedback" />);
    
    const feedback = screen.getByRole('status');
    expect(feedback).toHaveClass('custom-feedback');
  });

  it('shows icon when enabled', () => {
    render(<VisualFeedback type="success" message="Success" showIcon />);
    
    const icon = screen.getByRole('img');
    expect(icon).toBeInTheDocument();
  });

  it('handles dismiss action', () => {
    const mockOnDismiss = jest.fn();
    render(<VisualFeedback type="success" message="Success" dismissible onDismiss={mockOnDismiss} />);
    
    const dismissButton = screen.getByLabelText('Dismiss');
    fireEvent.click(dismissButton);
    
    expect(mockOnDismiss).toHaveBeenCalled();
  });

  it('supports custom action button', () => {
    const mockAction = jest.fn();
    render(
      <VisualFeedback 
        type="info" 
        message="Info message" 
        action={{ label: 'Learn More', onClick: mockAction }}
      />
    );
    
    const actionButton = screen.getByText('Learn More');
    fireEvent.click(actionButton);
    
    expect(mockAction).toHaveBeenCalled();
  });

  it('is accessible', () => {
    render(<VisualFeedback type="success" message="Success message" />);
    
    const feedback = screen.getByRole('status');
    expect(feedback).toHaveAttribute('aria-live', 'polite');
  });

  it('auto-dismisses after duration', () => {
    jest.useFakeTimers();
    const mockOnDismiss = jest.fn();
    
    render(<VisualFeedback type="success" message="Auto dismiss" autoDismiss duration={1000} onDismiss={mockOnDismiss} />);
    
    jest.advanceTimersByTime(1000);
    
    expect(mockOnDismiss).toHaveBeenCalled();
    jest.useRealTimers();
  });
});