/* @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Modal, { ConfirmModal, ErrorModal, LoadingModal } from '../../../src/client/src/components/DaisyUI/Modal';

// JSDOM does not implement HTMLDialogElement.showModal / .close, so the
// component falls back to the `open` attribute for visibility.

describe('Modal', () => {
  it('renders children when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()}>
        <p>Modal content</p>
      </Modal>,
    );
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render children when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={jest.fn()}>
        <p>Hidden</p>
      </Modal>,
    );
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="My Title">
        <p>body</p>
      </Modal>,
    );
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('close button has correct aria-label and calls onClose', () => {
    const onClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="T">
        <p>body</p>
      </Modal>,
    );
    const closeBtn = screen.getByLabelText('Close modal');
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders action buttons', () => {
    const onClick = jest.fn();
    render(
      <Modal
        isOpen={true}
        onClose={jest.fn()}
        actions={[{ label: 'Save', onClick, variant: 'primary' }]}
      >
        <p>body</p>
      </Modal>,
    );
    const saveBtn = screen.getByText('Save');
    fireEvent.click(saveBtn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('hides close button when showCloseButton is false', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} showCloseButton={false}>
        <p>no close</p>
      </Modal>,
    );
    expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
  });
});

describe('ConfirmModal', () => {
  it('renders message and confirm/cancel buttons', () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    render(
      <ConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        message="Are you sure?"
      />,
    );
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={onConfirm}
        message="Sure?"
      />,
    );
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('uses custom confirm and cancel text', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        message="Delete?"
        confirmText="Delete"
        cancelText="Keep"
      />,
    );
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
  });
});

describe('ErrorModal', () => {
  it('renders error message and detail', () => {
    render(
      <ErrorModal
        isOpen={true}
        onClose={jest.fn()}
        message="Something went wrong"
        error="Network timeout"
      />,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Network timeout')).toBeInTheDocument();
  });

  it('shows retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    render(
      <ErrorModal isOpen={true} onClose={jest.fn()} message="Fail" onRetry={onRetry} />,
    );
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('LoadingModal', () => {
  it('renders loading message', () => {
    render(<LoadingModal isOpen={true} onClose={jest.fn()} message="Processing..." />);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('does not show close button', () => {
    render(<LoadingModal isOpen={true} onClose={jest.fn()} />);
    expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
  });
});
