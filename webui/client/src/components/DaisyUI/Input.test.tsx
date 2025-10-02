import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Input } from './Input';

describe('Input', () => {
  test('renders with default props', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('input');
    expect(input).toHaveClass('input-bordered');
  });

  describe('color variants', () => {
    test('renders primary variant', () => {
      render(<Input variant="primary" />);
      expect(screen.getByRole('textbox')).toHaveClass('input-primary');
    });

    test('renders secondary variant', () => {
      render(<Input variant="secondary" />);
      expect(screen.getByRole('textbox')).toHaveClass('input-secondary');
    });

    test('renders accent variant', () => {
      render(<Input variant="accent" />);
      expect(screen.getByRole('textbox')).toHaveClass('input-accent');
    });

    test('renders success variant', () => {
      render(<Input variant="success" />);
      expect(screen.getByRole('textbox')).toHaveClass('input-success');
    });

    test('renders warning variant', () => {
      render(<Input variant="warning" />);
      expect(screen.getByRole('textbox')).toHaveClass('input-warning');
    });

    test('renders error variant', () => {
      render(<Input variant="error" />);
      expect(screen.getByRole('textbox')).toHaveClass('input-error');
    });

    test('renders info variant', () => {
      render(<Input variant="info" />);
      expect(screen.getByRole('textbox')).toHaveClass('input-info');
    });
  });

  describe('sizes', () => {
    test('renders extra small size', () => {
      render(<Input size="xs" />);
      expect(screen.getByRole('textbox')).toHaveClass('input-xs');
    });

    test('renders small size', () => {
      render(<Input size="sm" />);
      expect(screen.getByRole('textbox')).toHaveClass('input-sm');
    });

    test('renders medium size (default)', () => {
      render(<Input size="md" />);
      expect(screen.getByRole('textbox')).toHaveClass('input-md');
    });

    test('renders large size', () => {
      render(<Input size="lg" />);
      expect(screen.getByRole('textbox')).toHaveClass('input-lg');
    });
  });

  describe('style variants', () => {
    test('renders without border when bordered is false', () => {
      render(<Input bordered={false} />);
      const input = screen.getByRole('textbox');
      expect(input).not.toHaveClass('input-bordered');
    });

    test('renders ghost style', () => {
      render(<Input ghost />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('input-ghost');
    });
  });

  describe('loading state', () => {
    test('shows loading spinner when loading', () => {
      render(<Input loading />);
      const loadingSpinner = screen.getByRole('textbox').parentElement?.querySelector('.loading-spinner');
      expect(loadingSpinner).toBeInTheDocument();
    });

    test('disables input when loading', () => {
      render(<Input loading />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    test('disables input when both loading and disabled', () => {
      render(<Input loading disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });

  describe('disabled state', () => {
    test('disables input when disabled prop is true', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    test('prevents keyboard events when disabled', () => {
      const handleKeyDown = jest.fn();
      render(<Input disabled onKeyDown={handleKeyDown} />);
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(handleKeyDown).not.toHaveBeenCalled();
    });
  });

  describe('prefix and suffix', () => {
    test('renders with prefix', () => {
      render(<Input prefix="$" />);
      expect(screen.getByText('$')).toBeInTheDocument();
    });

    test('renders with suffix', () => {
      render(<Input suffix="%" />);
      expect(screen.getByText('%')).toBeInTheDocument();
    });

    test('renders with both prefix and suffix', () => {
      render(<Input prefix="$" suffix="%" />);
      expect(screen.getByText('$')).toBeInTheDocument();
      expect(screen.getByText('%')).toBeInTheDocument();
    });

    test('hides suffix when loading and shows loading spinner', () => {
      render(<Input suffix="%" loading />);
      expect(screen.queryByText('%')).not.toBeInTheDocument();
      expect(screen.getByRole('textbox').parentElement?.querySelector('.loading-spinner')).toBeInTheDocument();
    });
  });

  describe('event handling', () => {
    test('handles change events', () => {
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    test('handles focus events', () => {
      const handleFocus = jest.fn();
      render(<Input onFocus={handleFocus} />);
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    test('handles blur events', () => {
      const handleBlur = jest.fn();
      render(<Input onBlur={handleBlur} />);
      const input = screen.getByRole('textbox');
      fireEvent.blur(input);
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    test('handles keyboard events', () => {
      const handleKeyDown = jest.fn();
      render(<Input onKeyDown={handleKeyDown} />);
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
    });
  });

  describe('input types', () => {
    test('renders text input by default', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
    });

    test('renders email input', () => {
      render(<Input type="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    });

    test('renders password input', () => {
      render(<Input type="password" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'password');
    });

    test('renders number input', () => {
      render(<Input type="number" />);
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    });

    test('renders tel input', () => {
      render(<Input type="tel" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'tel');
    });

    test('renders url input', () => {
      render(<Input type="url" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'url');
    });
  });

  describe('accessibility', () => {
    test('accepts aria-label', () => {
      render(<Input aria-label="Username" />);
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    test('accepts aria-describedby', () => {
      render(<Input aria-describedby="help-text" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'help-text');
    });

    test('accepts aria-invalid', () => {
      render(<Input aria-invalid="true" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    test('accepts required attribute', () => {
      render(<Input required />);
      expect(screen.getByRole('textbox')).toBeRequired();
    });

    test('passes through additional props', () => {
      render(<Input data-testid="custom-input" title="Custom title" />);
      const input = screen.getByTestId('custom-input');
      expect(input).toHaveAttribute('title', 'Custom title');
    });
  });

  describe('customization', () => {
    test('applies custom className', () => {
      render(<Input className="custom-class" />);
      expect(screen.getByRole('textbox')).toHaveClass('custom-class');
    });

    test('applies custom container className', () => {
      render(<Input containerClassName="custom-container" />);
      expect(screen.getByRole('textbox').parentElement).toHaveClass('custom-container');
    });

    test('combines all classes correctly', () => {
      render(
        <Input
          variant="primary"
          size="lg"
          bordered={false}
          className="custom-class"
          containerClassName="custom-container"
        />
      );
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('input');
      expect(input).toHaveClass('input-primary');
      expect(input).toHaveClass('input-lg');
      expect(input).not.toHaveClass('input-bordered');
      expect(input).toHaveClass('custom-class');
      expect(input.parentElement).toHaveClass('custom-container');
    });
  });

  describe('ref forwarding', () => {
    test('forwards ref to input element', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    test('ref can be used to focus the input', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      ref.current?.focus();
      expect(screen.getByRole('textbox')).toHaveFocus();
    });
  });

  describe('form integration', () => {
    test('supports name attribute', () => {
      render(<Input name="username" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'username');
    });

    test('supports value attribute', () => {
      render(<Input value="test value" readOnly />);
      expect(screen.getByRole('textbox')).toHaveValue('test value');
    });

    test('supports placeholder attribute', () => {
      render(<Input placeholder="Enter your name" />);
      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    });

    test('supports maxLength attribute', () => {
      render(<Input maxLength={10} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '10');
    });

    test('supports min and max for number inputs', () => {
      render(<Input type="number" min={0} max={100} />);
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '100');
    });
  });
});