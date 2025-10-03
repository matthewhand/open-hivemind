import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import FormControl from '@/components/DaisyUI/FormControl';

describe('FormControl Component', () => {
  it('renders without crashing', () => {
    render(<FormControl />);
    
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<FormControl label="Test Label" />);
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('renders with help text', () => {
    render(<FormControl helpText="This is help text" />);
    
    expect(screen.getByText('This is help text')).toBeInTheDocument();
  });

  it('renders with error message', () => {
    render(<FormControl error="This is an error" />);
    
    expect(screen.getByText('This is an error')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<FormControl className="custom-control" />);
    
    const control = screen.getByRole('group');
    expect(control).toHaveClass('custom-control');
  });

  it('shows required indicator', () => {
    render(<FormControl label="Required Field" required />);
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <FormControl>
        <input type="text" data-testid="input" />
      </FormControl>
    );
    
    expect(screen.getByTestId('input')).toBeInTheDocument();
  });

  it('associates label with input', () => {
    render(
      <FormControl label="Input Label">
        <input type="text" id="test-input" />
      </FormControl>
    );
    
    const label = screen.getByText('Input Label');
    expect(label).toHaveAttribute('for', 'test-input');
  });

  it('shows error state visually', () => {
    render(<FormControl error="Error message" />);
    
    const control = screen.getByRole('group');
    expect(control).toHaveClass('error');
  });

  it('is accessible', () => {
    render(<FormControl label="Accessible Label" />);
    
    const label = screen.getByText('Accessible Label');
    expect(label).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(<FormControl disabled />);
    
    const control = screen.getByRole('group');
    expect(control).toHaveAttribute('aria-disabled', 'true');
  });
});