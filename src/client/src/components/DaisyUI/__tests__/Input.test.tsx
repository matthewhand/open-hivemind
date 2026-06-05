import React from 'react';
import { render, screen } from '@testing-library/react';
import Input from '../Input';
import { describe, it, expect } from 'vitest';

describe('Input Component', () => {
  it('renders correctly', () => {
    render(<Input placeholder="Test Placeholder" />);
    const input = screen.getByPlaceholderText('Test Placeholder');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('input');
  });

  it('renders with existing props', () => {
    render(
      <Input
        placeholder="Test Placeholder"
        variant="primary"
        size="lg"
        bordered={false}
        ghost={true}
        loading={true}
      />
    );
    const input = screen.getByPlaceholderText('Test Placeholder');
    expect(input).toHaveClass('input-primary');
    expect(input).toHaveClass('input-lg');
    expect(input).toHaveClass('input-ghost');
    expect(input).not.toHaveClass('input-bordered');
    expect(input).toBeDisabled(); // Loading state disables input
  });

  // Tests for label/error/helperText props (implemented in Input.tsx)
  it('renders with label', () => {
    render(<Input label="Test Label" id="test-input" />);
    const label = screen.getByText('Test Label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveClass('label-text');

    // Check association
    // Ideally we'd use screen.getByLabelText, but since we are testing implementation details:
    // We expect the label to be associated with the input.
    // However, if the implementation isn't there, getByLabelText will fail.
    // So let's try to find the label text and see if it exists.
  });

  it('associates label with input', () => {
    render(<Input label="Test Label" />);
    // This should find the input by its label
    const input = screen.getByLabelText('Test Label');
    expect(input).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<Input error="This is an error" />);
    const error = screen.getByText('This is an error');
    expect(error).toBeInTheDocument();
    expect(error).toHaveClass('text-error');
  });

  it('renders helper text', () => {
    render(<Input helperText="This is helper text" />);
    const helper = screen.getByText('This is helper text');
    expect(helper).toBeInTheDocument();
  });
});
