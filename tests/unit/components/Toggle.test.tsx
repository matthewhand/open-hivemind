/* @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Toggle from '../../../src/client/src/components/DaisyUI/Toggle';

describe('Toggle', () => {
  it('renders an unchecked checkbox by default', () => {
    render(<Toggle />);
    const input = screen.getByRole('checkbox');
    expect(input).toBeInTheDocument();
    expect(input).not.toBeChecked();
  });

  it('renders as checked when checked prop is true', () => {
    render(<Toggle checked onChange={jest.fn()} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('fires onChange when toggled', () => {
    const onChange = jest.fn();
    render(<Toggle onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is set', () => {
    render(<Toggle disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('renders label text', () => {
    render(<Toggle label="Enable feature" />);
    expect(screen.getByText('Enable feature')).toBeInTheDocument();
  });

  it('wraps in form-control with label when label prop provided', () => {
    const { container } = render(<Toggle label="My toggle" />);
    expect(container.querySelector('.form-control')).toBeInTheDocument();
    expect(container.querySelector('.label-text')).toHaveTextContent('My toggle');
  });

  it('does not wrap in form-control without label', () => {
    const { container } = render(<Toggle />);
    expect(container.querySelector('.form-control')).not.toBeInTheDocument();
  });

  it.each(['xs', 'sm', 'md', 'lg'] as const)(
    'applies toggle-%s class for size="%s"',
    (size) => {
      render(<Toggle size={size} />);
      expect(screen.getByRole('checkbox').className).toContain(`toggle-${size}`);
    },
  );

  it('applies color class', () => {
    render(<Toggle color="primary" />);
    expect(screen.getByRole('checkbox').className).toContain('toggle-primary');
  });

  it('passes extra HTML attributes', () => {
    render(<Toggle aria-label="dark mode" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-label', 'dark mode');
  });
});
