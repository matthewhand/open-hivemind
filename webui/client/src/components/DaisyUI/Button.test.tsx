import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from './Button';

describe('Button', () => {
  test('renders children content', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  test('applies default classes', () => {
    render(<Button>Default</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn');
    expect(button).toHaveClass('btn-primary');
  });

  describe('color variants', () => {
    test('renders primary variant', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-primary');
    });

    test('renders secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-secondary');
    });

    test('renders accent variant', () => {
      render(<Button variant="accent">Accent</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-accent');
    });

    test('renders ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-ghost');
    });

    test('renders link variant', () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-link');
    });
  });

  describe('sizes', () => {
    test('renders extra small size', () => {
      render(<Button size="xs">Extra Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-xs');
    });

    test('renders small size', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-sm');
    });

    test('renders medium size (default)', () => {
      render(<Button size="md">Medium</Button>);
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('btn-xs');
      expect(button).not.toHaveClass('btn-sm');
      expect(button).not.toHaveClass('btn-lg');
    });

    test('renders large size', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-lg');
    });
  });

  describe('styles', () => {
    test('renders solid style by default', () => {
      render(<Button variant="primary">Solid</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-primary');
      expect(button).not.toHaveClass('btn-outline');
    });

    test('renders outline style', () => {
      render(<Button variant="primary" buttonStyle="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-outline');
      expect(button).toHaveClass('btn-primary');
    });
  });

  describe('loading state', () => {
    test('shows loading spinner when loading', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('loading');
      expect(button.querySelector('.loading-spinner')).toBeInTheDocument();
    });

    test('shows loading text when provided', () => {
      render(<Button loading loadingText="Please wait...">Submit</Button>);
      expect(screen.getByText('Please wait...')).toBeInTheDocument();
      expect(screen.queryByText('Submit')).not.toBeInTheDocument();
    });

    test('disables button when loading', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('btn-disabled');
    });

    test('prevents click events when loading', () => {
      const handleClick = jest.fn();
      render(<Button loading onClick={handleClick}>Loading</Button>);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    test('disables button when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('btn-disabled');
    });

    test('prevents click events when disabled', () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('icons', () => {
    test('renders with left icon', () => {
      const icon = <span data-testid="left-icon">←</span>;
      render(<Button icon={icon}>With Icon</Button>);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    test('renders with right icon', () => {
      const icon = <span data-testid="right-icon">→</span>;
      render(<Button iconRight={icon}>With Icon</Button>);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    test('renders with both left and right icons', () => {
      const leftIcon = <span data-testid="left-icon">←</span>;
      const rightIcon = <span data-testid="right-icon">→</span>;
      render(<Button icon={leftIcon} iconRight={rightIcon}>Both Icons</Button>);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
      expect(screen.getByText('Both Icons')).toBeInTheDocument();
    });

    test('hides icons when loading', () => {
      const leftIcon = <span data-testid="left-icon">←</span>;
      const rightIcon = <span data-testid="right-icon">→</span>;
      render(<Button loading icon={leftIcon} iconRight={rightIcon}>Loading</Button>);
      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
    });
  });

  describe('event handling', () => {
    test('handles click events', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('passes event object to click handler', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledWith(expect.any(Object));
    });

    test('supports keyboard events', () => {
      const handleKeyDown = jest.fn();
      render(<Button onKeyDown={handleKeyDown}>Press me</Button>);
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    test('has button role by default', () => {
      render(<Button>Accessible</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('accepts aria-label', () => {
      render(<Button aria-label="Submit form">Submit</Button>);
      const button = screen.getByLabelText('Submit form');
      expect(button).toBeInTheDocument();
    });

    test('accepts aria-describedby', () => {
      render(<Button aria-describedby="help-text">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
    });

    test('indicates loading state for screen readers', () => {
      render(<Button loading aria-label="Submitting form">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-label', 'Submitting form');
    });

    test('passes through additional props', () => {
      render(<Button data-testid="custom-button" title="Custom title">Custom Props</Button>);
      const button = screen.getByTestId('custom-button');
      expect(button).toHaveAttribute('title', 'Custom title');
    });
  });

  describe('customization', () => {
    test('applies custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    test('combines all classes correctly', () => {
      render(
        <Button
          variant="accent"
          size="lg"
          buttonStyle="outline"
          className="custom-class"
        >
          Complex
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn');
      expect(button).toHaveClass('btn-outline');
      expect(button).toHaveClass('btn-accent');
      expect(button).toHaveClass('btn-lg');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('content rendering', () => {
    test('renders string content', () => {
      render(<Button>Simple Text</Button>);
      expect(screen.getByText('Simple Text')).toBeInTheDocument();
    });

    test('renders React element content', () => {
      render(<Button><strong>Bold Text</strong></Button>);
      expect(screen.getByText('Bold Text')).toBeInTheDocument();
    });

    test('renders complex content with icon', () => {
      render(
        <Button icon={<span>🚀</span>}>
          <span>Launch</span> <em>Now</em>
        </Button>
      );
      expect(screen.getByText('🚀')).toBeInTheDocument();
      expect(screen.getByText('Launch')).toBeInTheDocument();
      expect(screen.getByText('Now')).toBeInTheDocument();
    });
  });

  describe('form integration', () => {
    test('supports type attribute', () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    test('supports form attribute', () => {
      render(<Button form="my-form">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('form', 'my-form');
    });

    test('supports name and value attributes', () => {
      render(<Button name="action" value="delete">Delete</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('name', 'action');
      expect(button).toHaveAttribute('value', 'delete');
    });
  });
});