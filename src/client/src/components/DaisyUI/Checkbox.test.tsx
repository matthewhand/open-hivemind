import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Checkbox } from './Checkbox';

describe('Checkbox Component', () => {
  test('renders with a label', () => {
    render(<Checkbox label="My Checkbox" />);
    expect(screen.getByLabelText('My Checkbox')).toBeInTheDocument();
  });

  test('renders with custom content', () => {
    render(<Checkbox><span>Custom Content</span></Checkbox>);
    expect(screen.getByText('Custom Content')).toBeInTheDocument();
  });

  test('handles change events', () => {
    const handleChange = jest.fn();
    render(<Checkbox label="Test" onChange={handleChange} />);
    const checkbox = screen.getByLabelText('Test');
    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  test('applies size classes correctly', () => {
    const { rerender } = render(<Checkbox size="xs" />);
    expect(screen.getByRole('checkbox')).toHaveClass('checkbox-xs');
    rerender(<Checkbox size="sm" />);
    expect(screen.getByRole('checkbox')).toHaveClass('checkbox-sm');
    rerender(<Checkbox size="lg" />);
    expect(screen.getByRole('checkbox')).toHaveClass('checkbox-lg');
  });

  test('applies variant classes correctly', () => {
    const { rerender } = render(<Checkbox variant="primary" />);
    expect(screen.getByRole('checkbox')).toHaveClass('checkbox-primary');
    rerender(<Checkbox variant="secondary" />);
    expect(screen.getByRole('checkbox')).toHaveClass('checkbox-secondary');
    rerender(<Checkbox variant="accent" />);
    expect(screen.getByRole('checkbox')).toHaveClass('checkbox-accent');
  });

  test('is disabled when the disabled prop is true', () => {
    render(<Checkbox label="Disabled" disabled />);
    const checkbox = screen.getByLabelText('Disabled');
    expect(checkbox).toBeDisabled();
  });

  test('is in an indeterminate state', () => {
    render(<Checkbox label="Indeterminate" indeterminate />);
    const checkbox = screen.getByLabelText('Indeterminate') as HTMLInputElement;
    expect(checkbox.indeterminate).toBe(true);
    expect(checkbox).toHaveAttribute('aria-checked', 'mixed');
  });

  test('is checked when the checked prop is true', () => {
    render(<Checkbox label="Checked" checked readOnly />);
    const checkbox = screen.getByLabelText('Checked');
    expect(checkbox).toBeChecked();
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  test('is unchecked by default', () => {
    render(<Checkbox label="Unchecked" />);
    const checkbox = screen.getByLabelText('Unchecked');
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });
});