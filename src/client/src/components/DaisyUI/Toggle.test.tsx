import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Toggle from './Toggle';

describe('Toggle Component', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders the toggle with the correct label', () => {
    render(<Toggle id="test-toggle" label="Test Label" />);
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });

  it('renders helper text when provided', () => {
    render(<Toggle id="test-toggle" label="Test Label" helperText="Helper text" />);
    expect(screen.getByText('Helper text')).toBeInTheDocument();
  });

  it('handles the change event', () => {
    render(<Toggle id="test-toggle" label="Test Label" onChange={mockOnChange} />);
    const toggle = screen.getByLabelText('Test Label');
    fireEvent.click(toggle);
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith(true);
    fireEvent.click(toggle);
    expect(mockOnChange).toHaveBeenCalledWith(false);
  });

  it('is checked when the checked prop is true', () => {
    render(<Toggle id="test-toggle" label="Test Label" checked />);
    const toggle = screen.getByLabelText('Test Label') as HTMLInputElement;
    expect(toggle.checked).toBe(true);
  });

  it('is disabled when the disabled prop is true', () => {
    render(<Toggle id="test-toggle" label="Test Label" disabled />);
    const toggle = screen.getByLabelText('Test Label') as HTMLInputElement;
    expect(toggle.disabled).toBe(true);
  });

  it('applies the correct size class', () => {
    const { container } = render(<Toggle id="test-toggle" label="Test Label" size="lg" />);
    expect(container.querySelector('.toggle-lg')).toBeInTheDocument();
  });

  it('applies the correct color class', () => {
    const { container } = render(<Toggle id="test-toggle" label="Test Label" color="primary" />);
    expect(container.querySelector('.toggle-primary')).toBeInTheDocument();
  });

  it('has the correct ARIA attributes', () => {
    render(<Toggle id="test-toggle" label="Test Label" checked />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });
});