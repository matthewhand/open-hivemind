/* @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Input } from '../../../src/client/src/components/DaisyUI/Input';

describe('Input', () => {
  it('renders with a label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('reflects value changes on typing', () => {
    const onChange = jest.fn();
    render(<Input label="Name" onChange={onChange} />);
    const input = screen.getByLabelText('Name');
    fireEvent.change(input, { target: { value: 'Alice' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('shows error state with aria-invalid and error text', () => {
    render(<Input label="Field" error="Required" />);
    const input = screen.getByLabelText('Field');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('applies error variant class when error is present', () => {
    render(<Input label="F" error="bad" />);
    const input = screen.getByLabelText('F');
    expect(input.className).toContain('input-error');
  });

  it('renders helper text when no error', () => {
    render(<Input label="Pwd" helperText="Must be 8+ chars" />);
    expect(screen.getByText('Must be 8+ chars')).toBeInTheDocument();
  });

  it('hides helper text when error is present', () => {
    render(<Input label="Pwd" helperText="helper" error="error msg" />);
    expect(screen.queryByText('helper')).not.toBeInTheDocument();
    expect(screen.getByText('error msg')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input label="Disabled" disabled />);
    expect(screen.getByLabelText('Disabled')).toBeDisabled();
  });

  it('is disabled when loading prop is true', () => {
    render(<Input label="Loading" loading />);
    expect(screen.getByLabelText('Loading')).toBeDisabled();
  });

  it('renders without label/error/helperText wrapper when none provided', () => {
    const { container } = render(<Input placeholder="bare" />);
    expect(container.querySelector('.form-control')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('bare')).toBeInTheDocument();
  });

  it('uses provided id', () => {
    render(<Input id="my-input" label="Custom ID" />);
    expect(screen.getByLabelText('Custom ID')).toHaveAttribute('id', 'my-input');
  });

  it('renders prefix content', () => {
    render(<Input prefix={<span data-testid="prefix">$</span>} />);
    expect(screen.getByTestId('prefix')).toBeInTheDocument();
  });

  it('renders suffix content', () => {
    render(<Input suffix={<span data-testid="suffix">kg</span>} />);
    expect(screen.getByTestId('suffix')).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    render(<Input label="Password" type="password" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByLabelText('Show password');
    fireEvent.click(toggleBtn);
    expect(input).toHaveAttribute('type', 'text');

    const hideBtn = screen.getByLabelText('Hide password');
    fireEvent.click(hideBtn);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('applies variant classes', () => {
    render(<Input label="V" variant="primary" />);
    expect(screen.getByLabelText('V').className).toContain('input-primary');
  });
});
