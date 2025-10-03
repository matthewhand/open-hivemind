import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import Stepper from '@/components/DaisyUI/Stepper';

describe('Stepper Component', () => {
  const mockSteps = [
    { label: 'Step 1', description: 'First step' },
    { label: 'Step 2', description: 'Second step' },
    { label: 'Step 3', description: 'Third step' }
  ];

  it('renders without crashing', () => {
    render(<Stepper steps={mockSteps} />);
    
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('displays all steps', () => {
    render(<Stepper steps={mockSteps} />);
    
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
  });

  it('shows current step', () => {
    render(<Stepper steps={mockSteps} currentStep={1} />);
    
    const step1 = screen.getByText('Step 1');
    expect(step1).toHaveClass('step-primary');
  });

  it('shows completed steps', () => {
    render(<Stepper steps={mockSteps} currentStep={2} />);
    
    const step1 = screen.getByText('Step 1');
    expect(step1).toHaveClass('step-success');
  });

  it('applies correct CSS classes', () => {
    render(<Stepper steps={mockSteps} className="custom-stepper" />);
    
    const stepper = screen.getByRole('list');
    expect(stepper).toHaveClass('custom-stepper');
  });

  it('handles step click', () => {
    const mockOnStepClick = jest.fn();
    render(<Stepper steps={mockSteps} onStepClick={mockOnStepClick} />);
    
    const step2 = screen.getByText('Step 2');
    fireEvent.click(step2);
    
    expect(mockOnStepClick).toHaveBeenCalledWith(1);
  });

  it('shows step descriptions', () => {
    render(<Stepper steps={mockSteps} showDescriptions />);
    
    expect(screen.getByText('First step')).toBeInTheDocument();
    expect(screen.getByText('Second step')).toBeInTheDocument();
    expect(screen.getByText('Third step')).toBeInTheDocument();
  });

  it('is accessible', () => {
    render(<Stepper steps={mockSteps} />);
    
    const stepper = screen.getByRole('list');
    expect(stepper).toHaveAttribute('aria-label', 'Step progress');
  });

  it('handles empty steps array', () => {
    render(<Stepper steps={[]} />);
    
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('supports vertical orientation', () => {
    render(<Stepper steps={mockSteps} orientation="vertical" />);
    
    const stepper = screen.getByRole('list');
    expect(stepper).toHaveClass('stepper-vertical');
  });
});