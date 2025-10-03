import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import ModalForm from '@/components/DaisyUI/ModalForm';

describe('ModalForm Component', () => {
  it('renders without crashing', () => {
    render(<ModalForm />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders form content', () => {
    render(<ModalForm />);
    
    expect(screen.getByRole('form')).toBeInTheDocument();
  });

  it('is closed by default', () => {
    render(<ModalForm />);
    
    const modal = screen.getByRole('dialog');
    expect(modal).not.toBeVisible();
  });

  it('opens when isOpen prop is true', () => {
    render(<ModalForm isOpen />);
    
    const modal = screen.getByRole('dialog');
    expect(modal).toBeVisible();
  });

  it('handles form submission', () => {
    const mockOnSubmit = jest.fn();
    render(<ModalForm isOpen onSubmit={mockOnSubmit} />);
    
    const form = screen.getByRole('form');
    fireEvent.submit(form);
    
    expect(mockOnSubmit).toHaveBeenCalled();
  });

  it('applies correct CSS classes', () => {
    render(<ModalForm className="custom-modal-form" />);
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('custom-modal-form');
  });

  it('renders with title', () => {
    render(<ModalForm title="Form Title" isOpen />);
    
    expect(screen.getByText('Form Title')).toBeInTheDocument();
  });

  it('renders submit and cancel buttons', () => {
    render(<ModalForm isOpen />);
    
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('handles cancel button click', () => {
    const mockOnCancel = jest.fn();
    render(<ModalForm isOpen onCancel={mockOnCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('is accessible', () => {
    render(<ModalForm isOpen />);
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
  });

  it('supports custom form fields', () => {
    render(
      <ModalForm isOpen>
        <input type="text" placeholder="Custom field" />
      </ModalForm>
    );
    
    expect(screen.getByPlaceholderText('Custom field')).toBeInTheDocument();
  });
});