import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextInput } from './TextInput';

describe('TextInput', () => {
  test('renders with default props', () => {
    render(<TextInput placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('input');
    expect(input).toHaveClass('input-bordered');
  });

  describe('label support', () => {
    test('renders with label', () => {
      render(<TextInput label="Username" />);
      const label = screen.getByText('Username');
      expect(label).toBeInTheDocument();
      expect(label).toHaveAttribute('for');
      expect(label).toHaveClass('label-text');
    });

    test('label is properly associated with input', () => {
      render(<TextInput label="Email" id="email-input" />);
      const label = screen.getByText('Email');
      const input = screen.getByLabelText('Email');
      expect(label).toHaveAttribute('for', 'email-input');
      expect(input).toHaveAttribute('id', 'email-input');
    });

    test('generates unique id when not provided', () => {
      render(<TextInput label="Test Label" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id');
      expect(input.id).toMatch(/^text-input-/);
    });

    test('shows required asterisk when required', () => {
      render(<TextInput label="Required Field" required />);
      const asterisk = screen.getByLabelText('required');
      expect(asterisk).toBeInTheDocument();
      expect(asterisk).toHaveTextContent('*');
      expect(asterisk).toHaveClass('text-error');
    });

    test('applies custom label className', () => {
      render(<TextInput label="Custom Label" labelClassName="custom-label" />);
      const label = screen.getByText('Custom Label');
      expect(label).toHaveClass('custom-label');
    });
  });

  describe('helper text support', () => {
    test('renders with helper text', () => {
      render(<TextInput helperText="This is helpful information" />);
      const helper = screen.getByText('This is helpful information');
      expect(helper).toBeInTheDocument();
      expect(helper).toHaveClass('text-sm');
    });

    test('helper text is properly associated with input', () => {
      render(<TextInput helperText="Help text" />);
      const input = screen.getByRole('textbox');
      const helper = screen.getByText('Help text');
      expect(input).toHaveAttribute('aria-describedby', helper.id);
    });

    test('applies custom helper text className', () => {
      render(<TextInput helperText="Custom helper" helperTextClassName="custom-helper" />);
      const helper = screen.getByText('Custom helper');
      expect(helper).toHaveClass('custom-helper');
    });
  });

  describe('state variations', () => {
    test('renders in error state', () => {
      render(<TextInput error helperText="Error message" />);
      const input = screen.getByRole('textbox');
      const helper = screen.getByText('Error message');
      expect(input).toHaveClass('input-error');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(helper).toHaveClass('text-error');
      expect(helper).toHaveAttribute('role', 'alert');
      expect(helper).toHaveAttribute('aria-live', 'polite');
    });

    test('renders in success state', () => {
      render(<TextInput success helperText="Success message" />);
      const input = screen.getByRole('textbox');
      const helper = screen.getByText('Success message');
      expect(input).toHaveClass('input-success');
      expect(helper).toHaveClass('text-success');
    });

    test('error state overrides variant prop', () => {
      render(<TextInput variant="primary" error />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('input-error');
      expect(input).not.toHaveClass('input-primary');
    });

    test('success state overrides variant prop', () => {
      render(<TextInput variant="primary" success />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('input-success');
      expect(input).not.toHaveClass('input-primary');
    });
  });

  describe('size and color variants', () => {
    test('passes size prop to Input component', () => {
      render(<TextInput size="lg" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('input-lg');
    });

    test('passes variant prop to Input component when no state', () => {
      render(<TextInput variant="primary" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('input-primary');
    });
  });

  describe('accessibility', () => {
    test('supports aria-describedby combination', () => {
      render(<TextInput aria-describedby="external-help" helperText="Internal help" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('external-help'));
      expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('-helper'));
    });

    test('supports aria-required', () => {
      render(<TextInput required />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    test('passes through additional aria attributes', () => {
      render(<TextInput aria-label="Custom label" aria-expanded="false" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'Custom label');
      expect(input).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('event handling', () => {
    test('handles change events', () => {
      const handleChange = jest.fn();
      render(<TextInput onChange={handleChange} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    test('handles focus and blur events', () => {
      const handleFocus = jest.fn();
      const handleBlur = jest.fn();
      render(<TextInput onFocus={handleFocus} onBlur={handleBlur} />);
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.blur(input);
      expect(handleFocus).toHaveBeenCalledTimes(1);
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('form integration', () => {
    test('supports name and value attributes', () => {
      render(<TextInput name="username" value="testuser" readOnly />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('name', 'username');
      expect(input).toHaveValue('testuser');
    });

    test('supports placeholder', () => {
      render(<TextInput placeholder="Enter username" />);
      expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
    });
  });

  describe('ref forwarding', () => {
    test('forwards ref to input element', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<TextInput ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    test('ref can be used to focus the input', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<TextInput ref={ref} />);
      ref.current?.focus();
      expect(screen.getByRole('textbox')).toHaveFocus();
    });
  });

  describe('disabled and readonly states', () => {
    test('passes disabled prop to Input', () => {
      render(<TextInput disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    test('passes readOnly prop to Input', () => {
      render(<TextInput readOnly />);
      expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    });
  });

  describe('loading state', () => {
    test('passes loading prop to Input', () => {
      render(<TextInput loading />);
      const loadingSpinner = screen.getByRole('textbox').parentElement?.querySelector('.loading-spinner');
      expect(loadingSpinner).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });

  describe('prefix and suffix', () => {
    test('passes prefix and suffix to Input', () => {
      render(<TextInput prefix="$" suffix="%" />);
      expect(screen.getByText('$')).toBeInTheDocument();
      expect(screen.getByText('%')).toBeInTheDocument();
    });
  });

  describe('complete form field example', () => {
    test('renders complete form field with all features', () => {
      render(
        <TextInput
          label="Email Address"
          placeholder="Enter your email"
          helperText="We'll never share your email with anyone else."
          required
          type="email"
          size="md"
          variant="primary"
        />
      );

      // Check label
      const label = screen.getByText('Email Address');
      expect(label).toBeInTheDocument();
      expect(screen.getByLabelText('required')).toBeInTheDocument();

      // Check input
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('placeholder', 'Enter your email');
      expect(input).toHaveClass('input-primary');
      expect(input).toHaveClass('input-md');

      // Check helper text
      const helper = screen.getByText("We'll never share your email with anyone else.");
      expect(helper).toBeInTheDocument();

      // Check accessibility
      expect(input).toHaveAttribute('aria-describedby', helper.id);
      expect(input).toHaveAttribute('aria-required', 'true');
    });
  });
});