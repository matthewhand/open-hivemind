/* @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Select from '../../../src/client/src/components/DaisyUI/Select';

const options = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
];

describe('Select', () => {
  it('renders all options', () => {
    render(<Select options={options} />);
    const selectEl = screen.getByRole('combobox');
    expect(selectEl).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('Cherry')).toBeInTheDocument();
  });

  it('renders a placeholder via children', () => {
    render(
      <Select options={options}>
        <option disabled value="">Pick a fruit</option>
      </Select>,
    );
    expect(screen.getByText('Pick a fruit')).toBeInTheDocument();
  });

  it('calls onChange when selection changes', () => {
    const onChange = jest.fn();
    render(<Select options={options} onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'banana' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('reflects controlled value', () => {
    render(<Select options={options} value="cherry" onChange={jest.fn()} />);
    expect(screen.getByRole('combobox')).toHaveValue('cherry');
  });

  it('is disabled when disabled prop is set', () => {
    render(<Select options={options} disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('combobox').className).toContain('cursor-not-allowed');
  });

  it('applies error class', () => {
    render(<Select options={options} error />);
    expect(screen.getByRole('combobox').className).toContain('select-error');
  });

  it('applies success class', () => {
    render(<Select options={options} success />);
    expect(screen.getByRole('combobox').className).toContain('select-success');
  });

  it('applies variant class', () => {
    render(<Select options={options} variant="primary" />);
    expect(screen.getByRole('combobox').className).toContain('select-primary');
  });

  it('shows loading spinner when loading', () => {
    const { container } = render(<Select options={options} loading />);
    const spinner = container.querySelector('.loading-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders option groups', () => {
    const groups = [
      { label: 'Fruits', options: [{ label: 'Apple', value: 'apple' }] },
      { label: 'Veggies', options: [{ label: 'Carrot', value: 'carrot' }] },
    ];
    const { container } = render(<Select optionGroups={groups} />);
    const optgroups = container.querySelectorAll('optgroup');
    expect(optgroups).toHaveLength(2);
    expect(optgroups[0]).toHaveAttribute('label', 'Fruits');
    expect(screen.getByText('Carrot')).toBeInTheDocument();
  });

  it('renders disabled options', () => {
    const opts = [{ label: 'Disabled', value: 'dis', disabled: true }];
    render(<Select options={opts} />);
    const option = screen.getByText('Disabled') as HTMLOptionElement;
    expect(option.disabled).toBe(true);
  });
});
