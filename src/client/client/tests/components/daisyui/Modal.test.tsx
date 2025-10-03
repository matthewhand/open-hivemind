import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import Modal from '@/components/DaisyUI/Modal';

describe('Modal Component', () => {
  it('renders without crashing', () => {
    render(
      <Modal>
        <div>Modal Content</div>
      </Modal>
    );
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <Modal>
        <div>Modal Content</div>
      </Modal>
    );
    
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('is closed by default', () => {
    render(
      <Modal>
        <div>Modal Content</div>
      </Modal>
    );
    
    const modal = screen.getByRole('dialog');
    expect(modal).not.toBeVisible();
  });

  it('opens when isOpen prop is true', () => {
    render(
      <Modal isOpen>
        <div>Modal Content</div>
      </Modal>
    );
    
    const modal = screen.getByRole('dialog');
    expect(modal).toBeVisible();
  });

  it('closes when close button is clicked', () => {
    const mockOnClose = jest.fn();
    render(
      <Modal isOpen onClose={mockOnClose}>
        <div>Modal Content</div>
      </Modal>
    );
    
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes when overlay is clicked', () => {
    const mockOnClose = jest.fn();
    render(
      <Modal isOpen onClose={mockOnClose}>
        <div>Modal Content</div>
      </Modal>
    );
    
    const overlay = screen.getByRole('dialog').parentElement;
    fireEvent.click(overlay!);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('applies correct CSS classes', () => {
    render(
      <Modal className="custom-modal">
        <div>Modal Content</div>
      </Modal>
    );
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('custom-modal');
  });

  it('supports different sizes', () => {
    render(
      <Modal size="lg">
        <div>Modal Content</div>
      </Modal>
    );
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('modal-lg');
  });

  it('is accessible', () => {
    render(
      <Modal isOpen>
        <div>Modal Content</div>
      </Modal>
    );
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
  });

  it('prevents body scroll when open', () => {
    render(
      <Modal isOpen>
        <div>Modal Content</div>
      </Modal>
    );
    
    expect(document.body).toHaveStyle('overflow: hidden');
  });

  it('supports custom header and footer', () => {
    render(
      <Modal
        isOpen
        header={<div>Modal Header</div>}
        footer={<div>Modal Footer</div>}
      >
        <div>Modal Content</div>
      </Modal>
    );
    
    expect(screen.getByText('Modal Header')).toBeInTheDocument();
    expect(screen.getByText('Modal Footer')).toBeInTheDocument();
  });
});