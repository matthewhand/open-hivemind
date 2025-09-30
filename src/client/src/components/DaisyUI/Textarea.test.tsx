import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  test('renders with default props', () => {
    render(<Textarea placeholder="Enter text" />);
    const textarea = screen.getByPlaceholderText('Enter text');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveClass('textarea');
    expect(textarea).toHaveClass('textarea-bordered');
    expect(textarea).toHaveClass('resize-y');
  });

  describe('color variants', () => {
    test('renders primary variant', () => {
      render(<Textarea variant="primary" />);
      expect(screen.getByRole('textbox')).toHaveClass('textarea-primary');
    });

    test('renders secondary variant', () => {
      render(<Textarea variant="secondary" />);
      expect(screen.getByRole('textbox')).toHaveClass('textarea-secondary');
    });

    test('renders accent variant', () => {
      render(<Textarea variant="accent" />);
      expect(screen.getByRole('textbox')).toHaveClass('textarea-accent');
    });

    test('renders success variant', () => {
      render(<Textarea variant="success" />);
      expect(screen.getByRole('textbox')).toHaveClass('textarea-success');
    });

    test('renders warning variant', () => {
      render(<Textarea variant="warning" />);
      expect(screen.getByRole('textbox')).toHaveClass('textarea-warning');
    });

    test('renders error variant', () => {
      render(<Textarea variant="error" />);
      expect(screen.getByRole('textbox')).toHaveClass('textarea-error');
    });

    test('renders info variant', () => {
      render(<Textarea variant="info" />);
      expect(screen.getByRole('textbox')).toHaveClass('textarea-info');
    });
  });

  describe('sizes', () => {
    test('renders extra small size', () => {
      render(<Textarea size="xs" />);
      expect(screen.getByRole('textbox')).toHaveClass('textarea-xs');
    });

    test('renders small size', () => {
      render(<Textarea size="sm" />);
      expect(screen.getByRole('textbox')).toHaveClass('textarea-sm');
    });

    test('renders medium size (default)', () => {
      render(<Textarea size="md" />);
      expect(screen.getByRole('textbox')).toHaveClass('textarea-md');
    });

    test('renders large size', () => {
      render(<Textarea size="lg" />);
      expect(screen.getByRole('textbox')).toHaveClass('textarea-lg');
    });
  });

  describe('resizable options', () => {
    test('renders with no resize (default vertical)', () => {
      render(<Textarea resizable="vertical" />);
      expect(screen.getByRole('textbox')).toHaveClass('resize-y');
    });

    test('renders with both resize', () => {
      render(<Textarea resizable="both" />);
      expect(screen.getByRole('textbox')).toHaveClass('resize');
    });

    test('renders with horizontal resize', () => {
      render(<Textarea resizable="horizontal" />);
      expect(screen.getByRole('textbox')).toHaveClass('resize-x');
    });

    test('renders with no resize', () => {
      render(<Textarea resizable="none" />);
      expect(screen.getByRole('textbox')).toHaveClass('resize-none');
    });
  });

  describe('style variants', () => {
    test('renders without border when bordered is false', () => {
      render(<Textarea bordered={false} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).not.toHaveClass('textarea-bordered');
    });

    test('renders ghost style', () => {
      render(<Textarea ghost />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('textarea-ghost');
    });
  });

  describe('loading state', () => {
    test('shows loading spinner when loading', () => {
      render(<Textarea loading />);
      const loadingSpinner = screen.getByRole('textbox').parentElement?.querySelector('.loading-spinner');
      expect(loadingSpinner).toBeInTheDocument();
    });

    test('disables textarea when loading', () => {
      render(<Textarea loading />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    test('disables textarea when both loading and disabled', () => {
      render(<Textarea loading disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });

  describe('disabled state', () => {
    test('disables textarea when disabled prop is true', () => {
      render(<Textarea disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    test('prevents keyboard events when disabled', () => {
      const handleKeyDown = jest.fn();
      render(<Textarea disabled onKeyDown={handleKeyDown} />);
      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter' });
      expect(handleKeyDown).not.toHaveBeenCalled();
    });
  });

  describe('readonly state', () => {
    test('makes textarea readonly when readOnly prop is true', () => {
      render(<Textarea readOnly />);
      expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    });
  });

  describe('label and helper text', () => {
    test('renders with label', () => {
      render(<Textarea label="Description" />);
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Description')).toHaveClass('label-text');
    });

    test('renders with helper text', () => {
      render(<Textarea helperText="This is a helper text" />);
      expect(screen.getByText('This is a helper text')).toBeInTheDocument();
      expect(screen.getByText('This is a helper text')).toHaveClass('label-text-alt');
    });

    test('renders with both label and helper text', () => {
      render(<Textarea label="Description" helperText="This is a helper text" />);
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('This is a helper text')).toBeInTheDocument();
    });
  });

  describe('event handling', () => {
    test('handles change events', () => {
      const handleChange = jest.fn();
      render(<Textarea onChange={handleChange} />);
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'test' } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    test('handles focus events', () => {
      const handleFocus = jest.fn();
      render(<Textarea onFocus={handleFocus} />);
      const textarea = screen.getByRole('textbox');
      fireEvent.focus(textarea);
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    test('handles blur events', () => {
      const handleBlur = jest.fn();
      render(<Textarea onBlur={handleBlur} />);
      const textarea = screen.getByRole('textbox');
      fireEvent.blur(textarea);
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    test('handles keyboard events', () => {
      const handleKeyDown = jest.fn();
      render(<Textarea onKeyDown={handleKeyDown} />);
      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter' });
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    test('accepts aria-label', () => {
      render(<Textarea aria-label="Description" />);
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });

    test('accepts aria-describedby', () => {
      render(<Textarea aria-describedby="help-text" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'help-text');
    });

    test('accepts aria-invalid', () => {
      render(<Textarea aria-invalid="true" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    test('accepts required attribute', () => {
      render(<Textarea required />);
      expect(screen.getByRole('textbox')).toBeRequired();
    });

    test('links label to textarea with aria-labelledby', () => {
      render(<Textarea id="description" label="Description" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-labelledby', 'description-label');
    });

    test('links helper text to textarea with aria-describedby', () => {
      render(<Textarea id="description" helperText="Help text" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-describedby', 'description-helper');
    });

    test('combines aria-describedby with helper text', () => {
      render(<Textarea id="description" aria-describedby="external-help" helperText="Help text" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-describedby', 'external-help description-helper');
    });
  });

  describe('customization', () => {
    test('applies custom className', () => {
      render(<Textarea className="custom-class" />);
      expect(screen.getByRole('textbox')).toHaveClass('custom-class');
    });

    test('applies custom container className', () => {
      render(<Textarea containerClassName="custom-container" />);
      expect(screen.getByRole('textbox').closest('.form-control')).toHaveClass('custom-container');
    });

    test('combines all classes correctly', () => {
      render(
        <Textarea
          variant="primary"
          size="lg"
          bordered={false}
          resizable="none"
          className="custom-class"
          containerClassName="custom-container"
        />
      );
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('textarea');
      expect(textarea).toHaveClass('textarea-primary');
      expect(textarea).toHaveClass('textarea-lg');
      expect(textarea).toHaveClass('resize-none');
      expect(textarea).not.toHaveClass('textarea-bordered');
      expect(textarea).toHaveClass('custom-class');
      expect(textarea.closest('.form-control')).toHaveClass('custom-container');
    });
  });

  describe('ref forwarding', () => {
    test('forwards ref to textarea element', () => {
      const ref = React.createRef<HTMLTextAreaElement>();
      render(<Textarea ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    });

    test('ref can be used to focus the textarea', () => {
      const ref = React.createRef<HTMLTextAreaElement>();
      render(<Textarea ref={ref} />);
      ref.current?.focus();
      expect(screen.getByRole('textbox')).toHaveFocus();
    });
  });

  describe('form integration', () => {
    test('supports name attribute', () => {
      render(<Textarea name="description" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'description');
    });

    test('supports value attribute', () => {
      render(<Textarea value="test value" readOnly />);
      expect(screen.getByRole('textbox')).toHaveValue('test value');
    });

    test('supports placeholder attribute', () => {
      render(<Textarea placeholder="Enter your description" />);
      expect(screen.getByPlaceholderText('Enter your description')).toBeInTheDocument();
    });

    test('supports maxLength attribute', () => {
      render(<Textarea maxLength={100} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '100');
    });

    test('supports rows attribute', () => {
      render(<Textarea rows={5} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5');
    });

    test('supports cols attribute', () => {
      render(<Textarea cols={50} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('cols', '50');
    });
  });
});