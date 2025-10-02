import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RangeSlider } from './RangeSlider';

describe('RangeSlider', () => {
  test('renders with default values', () => {
    render(<RangeSlider />);
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
    expect(slider).toHaveAttribute('step', '1');
    expect(slider).toHaveAttribute('value', '50');
  });

  test('applies default classes', () => {
    render(<RangeSlider />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveClass('range');
    expect(slider).toHaveClass('range-primary');
  });

  describe('color variants', () => {
    test('renders primary variant', () => {
      render(<RangeSlider variant="primary" />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveClass('range-primary');
    });

    test('renders secondary variant', () => {
      render(<RangeSlider variant="secondary" />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveClass('range-secondary');
    });

    test('renders accent variant', () => {
      render(<RangeSlider variant="accent" />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveClass('range-accent');
    });
  });

  describe('sizes', () => {
    test('renders extra small size', () => {
      render(<RangeSlider size="xs" />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveClass('range-xs');
    });

    test('renders small size', () => {
      render(<RangeSlider size="sm" />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveClass('range-sm');
    });

    test('renders medium size (default)', () => {
      render(<RangeSlider size="md" />);
      const slider = screen.getByRole('slider');
      expect(slider).not.toHaveClass('range-xs');
      expect(slider).not.toHaveClass('range-sm');
      expect(slider).not.toHaveClass('range-lg');
    });

    test('renders large size', () => {
      render(<RangeSlider size="lg" />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveClass('range-lg');
    });
  });

  describe('value handling', () => {
    test('accepts custom min, max, and step values', () => {
      render(<RangeSlider min={10} max={90} step={5} value={25} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('min', '10');
      expect(slider).toHaveAttribute('max', '90');
      expect(slider).toHaveAttribute('step', '5');
      expect(slider).toHaveAttribute('value', '25');
    });

    test('calls onChange when value changes', () => {
      const handleChange = jest.fn();
      render(<RangeSlider value={30} onChange={handleChange} />);
      const slider = screen.getByRole('slider');
      
      fireEvent.change(slider, { target: { value: '75' } });
      expect(handleChange).toHaveBeenCalledWith(75);
    });

    test('updates internal state when no onChange provided', () => {
      render(<RangeSlider />);
      const slider = screen.getByRole('slider');
      
      fireEvent.change(slider, { target: { value: '80' } });
      expect(slider).toHaveAttribute('value', '80');
    });
  });

  describe('disabled state', () => {
    test('applies disabled attribute', () => {
      render(<RangeSlider disabled />);
      const slider = screen.getByRole('slider');
      expect(slider).toBeDisabled();
    });

    test('applies disabled class', () => {
      render(<RangeSlider disabled />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveClass('range-disabled');
    });

    test('does not trigger onChange when disabled', () => {
      const handleChange = jest.fn();
      render(<RangeSlider disabled onChange={handleChange} />);
      const slider = screen.getByRole('slider');
      
      fireEvent.change(slider, { target: { value: '75' } });
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('label and value display', () => {
    test('displays label when provided', () => {
      render(<RangeSlider label="Volume" />);
      expect(screen.getByText('Volume')).toBeInTheDocument();
    });

    test('displays current value by default', () => {
      render(<RangeSlider value={65} />);
      expect(screen.getByText('65')).toBeInTheDocument();
    });

    test('hides value when showValue is false', () => {
      render(<RangeSlider value={65} showValue={false} />);
      expect(screen.queryByText('65')).not.toBeInTheDocument();
    });

    test('uses custom value formatter', () => {
      const formatter = (value: number) => `${value}%`;
      render(<RangeSlider value={75} valueFormatter={formatter} />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    test('displays value in label when label is provided', () => {
      render(<RangeSlider label="Volume" value={85} />);
      expect(screen.getByText('Volume')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    test('displays value below slider when no label', () => {
      render(<RangeSlider value={45} />);
      const valueDisplay = screen.getByText('45');
      expect(valueDisplay).toBeInTheDocument();
      expect(valueDisplay.closest('.text-center')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    test('has correct ARIA attributes', () => {
      render(<RangeSlider value={60} min={0} max={100} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '100');
      expect(slider).toHaveAttribute('aria-valuenow', '60');
    });

    test('accepts custom aria-label', () => {
      render(<RangeSlider aria-label="Custom volume control" />);
      const slider = screen.getByLabelText('Custom volume control');
      expect(slider).toBeInTheDocument();
    });

    test('uses label as aria-label when provided', () => {
      render(<RangeSlider label="Volume Control" />);
      const slider = screen.getByLabelText('Volume Control');
      expect(slider).toBeInTheDocument();
    });

    test('sets aria-valuetext when showValue is true', () => {
      render(<RangeSlider value={70} showValue={true} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuetext', '70');
    });

    test('does not set aria-valuetext when showValue is false', () => {
      render(<RangeSlider value={70} showValue={false} />);
      const slider = screen.getByRole('slider');
      expect(slider).not.toHaveAttribute('aria-valuetext');
    });

    test('associates label with input using id', () => {
      render(<RangeSlider label="Volume" id="volume-slider" />);
      const label = screen.getByText('Volume').closest('label');
      const slider = screen.getByRole('slider');
      expect(label).toHaveAttribute('for', 'volume-slider');
      expect(slider).toHaveAttribute('id', 'volume-slider');
    });

    test('generates unique id when not provided', () => {
      const { rerender } = render(<RangeSlider label="First" />);
      const firstSlider = screen.getByRole('slider');
      const firstId = firstSlider.getAttribute('id');
      
      rerender(<RangeSlider label="Second" />);
      const secondSlider = screen.getByRole('slider');
      const secondId = secondSlider.getAttribute('id');
      
      expect(firstId).not.toBe(secondId);
      expect(firstId).toMatch(/^range-slider-/);
      expect(secondId).toMatch(/^range-slider-/);
    });
  });

  describe('customization', () => {
    test('applies custom className', () => {
      render(<RangeSlider className="custom-range" />);
      const container = screen.getByRole('slider').closest('.form-control');
      expect(container).toHaveClass('custom-range');
    });

    test('passes through additional props', () => {
      render(<RangeSlider data-testid="custom-range" />);
      expect(screen.getByTestId('custom-range')).toBeInTheDocument();
    });

    test('combines all classes correctly', () => {
      render(
        <RangeSlider
          variant="accent"
          size="lg"
          disabled
          className="custom-class"
        />
      );
      const slider = screen.getByRole('slider');
      expect(slider).toHaveClass('range');
      expect(slider).toHaveClass('range-accent');
      expect(slider).toHaveClass('range-lg');
      expect(slider).toHaveClass('range-disabled');
    });
  });

  describe('edge cases', () => {
    test('handles decimal step values', () => {
      render(<RangeSlider step={0.1} value={5.5} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('step', '0.1');
      expect(slider).toHaveAttribute('value', '5.5');
    });

    test('handles negative min values', () => {
      render(<RangeSlider min={-50} max={50} value={-25} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('min', '-50');
      expect(slider).toHaveAttribute('value', '-25');
    });

    test('formats negative values correctly', () => {
      const formatter = (value: number) => `${value}°C`;
      render(<RangeSlider value={-10} valueFormatter={formatter} />);
      expect(screen.getByText('-10°C')).toBeInTheDocument();
    });

    test('handles very large numbers', () => {
      render(<RangeSlider max={1000000} value={500000} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('max', '1000000');
      expect(slider).toHaveAttribute('value', '500000');
    });
  });
});