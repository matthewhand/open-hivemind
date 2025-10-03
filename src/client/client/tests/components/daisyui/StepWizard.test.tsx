import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import StepWizard from '@/components/DaisyUI/StepWizard';

describe('StepWizard Component', () => {
  const mockSteps = [
    {
      title: 'Personal Info',
      content: <div>Personal Information Form</div>,
      validation: () => true
    },
    {
      title: 'Address',
      content: <div>Address Form</div>,
      validation: () => true
    },
    {
      title: 'Review',
      content: <div>Review Information</div>,
      validation: () => true
    }
  ];

  it('renders without crashing', () => {
    render(<StepWizard steps={mockSteps} />);
    
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('displays current step content', () => {
    render(<StepWizard steps={mockSteps} />);
    
    expect(screen.getByText('Personal Information Form')).toBeInTheDocument();
  });

  it('displays step navigation', () => {
    render(<StepWizard steps={mockSteps} />);
    
    expect(screen.getByText('Personal Info')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('navigates to next step', () => {
    render(<StepWizard steps={mockSteps} />);
    
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    expect(screen.getByText('Address Form')).toBeInTheDocument();
  });

  it('navigates to previous step', () => {
    render(<StepWizard steps={mockSteps} />);
    
    // Go to second step first
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    // Then go back
    const prevButton = screen.getByRole('button', { name: /previous/i });
    fireEvent.click(prevButton);
    
    expect(screen.getByText('Personal Information Form')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<StepWizard steps={mockSteps} className="custom-wizard" />);
    
    const wizard = screen.getByRole('main');
    expect(wizard).toHaveClass('custom-wizard');
  });

  it('handles step completion', () => {
    const mockOnComplete = jest.fn();
    render(<StepWizard steps={mockSteps} onComplete={mockOnComplete} />);
    
    // Navigate through all steps
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    
    const completeButton = screen.getByRole('button', { name: /complete/i });
    fireEvent.click(completeButton);
    
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('validates steps before navigation', () => {
    const invalidSteps = [
      {
        title: 'Step 1',
        content: <div>Step 1 Content</div>,
        validation: () => false
      },
      {
        title: 'Step 2',
        content: <div>Step 2 Content</div>,
        validation: () => true
      }
    ];
    
    render(<StepWizard steps={invalidSteps} />);
    
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    // Should stay on step 1 due to validation failure
    expect(screen.getByText('Step 1 Content')).toBeInTheDocument();
  });

  it('is accessible', () => {
    render(<StepWizard steps={mockSteps} />);
    
    const wizard = screen.getByRole('main');
    expect(wizard).toHaveAttribute('aria-label', 'Multi-step wizard');
  });

  it('handles empty steps array', () => {
    render(<StepWizard steps={[]} />);
    
    expect(screen.getByText('No steps available')).toBeInTheDocument();
  });
});