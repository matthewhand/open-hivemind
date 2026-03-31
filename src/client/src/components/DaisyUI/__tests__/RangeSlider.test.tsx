import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RangeSlider from '../RangeSlider';

describe('RangeSlider', () => {
  it('renders correctly with default props', () => {
    render(<RangeSlider />);
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
    expect(slider).toHaveAttribute('step', '1');
    expect(slider).toHaveClass('range', 'range-primary');
  });

  it('renders label and showValue', () => {
    render(<RangeSlider label="Test Label" value={50} showValue={true} />);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('formats value using valueFormatter', () => {
    render(<RangeSlider label="Test Label" value={50} valueFormatter={(val) => `${val}%`} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders custom marks correctly', () => {
    const marks = [
      { value: 1, label: 'Low' },
      { value: 2, label: 'Medium' },
      { value: 3, label: 'High' }
    ];
    render(<RangeSlider min={1} max={3} step={1} value={2} showMarks={true} marks={marks} />);

    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();

    // Check if the current value is bolded (Medium should be bold)
    const mediumLabel = screen.getByText('Medium').parentElement;
    expect(mediumLabel).toHaveClass('font-bold');
  });

  it('calls onChange when value changes', () => {
    const handleChange = jest.fn();
    render(<RangeSlider value={50} onChange={handleChange} />);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '75' } });

    expect(handleChange).toHaveBeenCalledWith(75);
  });

  it('renders different variants', () => {
    const { rerender } = render(<RangeSlider variant="error" />);
    expect(screen.getByRole('slider')).toHaveClass('range-error');

    rerender(<RangeSlider variant="warning" />);
    expect(screen.getByRole('slider')).toHaveClass('range-warning');

    rerender(<RangeSlider variant="info" />);
    expect(screen.getByRole('slider')).toHaveClass('range-info');

    rerender(<RangeSlider variant="success" />);
    expect(screen.getByRole('slider')).toHaveClass('range-success');
  });
});
