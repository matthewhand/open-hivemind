import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Badge } from './Badge';

describe('Badge', () => {
  test('renders children content', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  test('applies default classes', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge).toHaveClass('badge');
    expect(badge).toHaveClass('badge-neutral');
    expect(badge).toHaveClass('badge-md');
  });

  describe('color variants', () => {
    test('renders primary variant', () => {
      render(<Badge variant="primary">Primary</Badge>);
      const badge = screen.getByText('Primary');
      expect(badge).toHaveClass('badge-primary');
    });

    test('renders secondary variant', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      const badge = screen.getByText('Secondary');
      expect(badge).toHaveClass('badge-secondary');
    });

    test('renders success variant', () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText('Success');
      expect(badge).toHaveClass('badge-success');
    });

    test('renders warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText('Warning');
      expect(badge).toHaveClass('badge-warning');
    });

    test('renders error variant', () => {
      render(<Badge variant="error">Error</Badge>);
      const badge = screen.getByText('Error');
      expect(badge).toHaveClass('badge-error');
    });

    test('renders neutral variant', () => {
      render(<Badge variant="neutral">Neutral</Badge>);
      const badge = screen.getByText('Neutral');
      expect(badge).toHaveClass('badge-neutral');
    });
  });

  describe('sizes', () => {
    test('renders small size', () => {
      render(<Badge size="small">Small</Badge>);
      const badge = screen.getByText('Small');
      expect(badge).toHaveClass('badge-xs');
    });

    test('renders normal size', () => {
      render(<Badge size="normal">Normal</Badge>);
      const badge = screen.getByText('Normal');
      expect(badge).toHaveClass('badge-md');
    });

    test('renders large size', () => {
      render(<Badge size="large">Large</Badge>);
      const badge = screen.getByText('Large');
      expect(badge).toHaveClass('badge-lg');
    });
  });

  describe('styles', () => {
    test('renders solid style by default', () => {
      render(<Badge variant="primary">Solid</Badge>);
      const badge = screen.getByText('Solid');
      expect(badge).toHaveClass('badge-primary');
      expect(badge).not.toHaveClass('badge-outline');
    });

    test('renders outline style', () => {
      render(<Badge variant="primary" style="outline">Outline</Badge>);
      const badge = screen.getByText('Outline');
      expect(badge).toHaveClass('badge-outline');
      expect(badge).toHaveClass('badge-primary');
    });
  });

  describe('icons and avatars', () => {
    test('renders with icon', () => {
      const icon = <span data-testid="icon">⚡</span>;
      render(<Badge icon={icon}>With Icon</Badge>);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    test('renders with avatar', () => {
      const avatar = <img src="avatar.jpg" alt="User" data-testid="avatar" />;
      render(<Badge avatar={avatar}>With Avatar</Badge>);
      expect(screen.getByTestId('avatar')).toBeInTheDocument();
      expect(screen.getByText('With Avatar')).toBeInTheDocument();
    });

    test('renders with both icon and avatar', () => {
      const icon = <span data-testid="icon">⚡</span>;
      const avatar = <img src="avatar.jpg" alt="User" data-testid="avatar" />;
      render(<Badge icon={icon} avatar={avatar}>Both</Badge>);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByTestId('avatar')).toBeInTheDocument();
      expect(screen.getByText('Both')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    test('has correct default role', () => {
      render(<Badge>Accessible</Badge>);
      const badge = screen.getByText('Accessible');
      expect(badge).toHaveAttribute('role', 'status');
    });

    test('accepts custom role', () => {
      render(<Badge role="badge">Custom Role</Badge>);
      const badge = screen.getByText('Custom Role');
      expect(badge).toHaveAttribute('role', 'badge');
    });

    test('accepts aria-label', () => {
      render(<Badge aria-label="Status indicator">Labeled</Badge>);
      const badge = screen.getByLabelText('Status indicator');
      expect(badge).toBeInTheDocument();
    });

    test('passes through additional props', () => {
      render(<Badge data-testid="custom-badge">Custom Props</Badge>);
      expect(screen.getByTestId('custom-badge')).toBeInTheDocument();
    });
  });

  describe('customization', () => {
    test('applies custom className', () => {
      render(<Badge className="custom-class">Custom</Badge>);
      const badge = screen.getByText('Custom');
      expect(badge).toHaveClass('custom-class');
    });

    test('combines all classes correctly', () => {
      render(
        <Badge
          variant="success"
          size="large"
          style="outline"
          className="custom-class"
        >
          Complex
        </Badge>
      );
      const badge = screen.getByText('Complex');
      expect(badge).toHaveClass('badge');
      expect(badge).toHaveClass('badge-outline');
      expect(badge).toHaveClass('badge-success');
      expect(badge).toHaveClass('badge-lg');
      expect(badge).toHaveClass('custom-class');
    });
  });

  describe('content rendering', () => {
    test('renders string content', () => {
      render(<Badge>Simple Text</Badge>);
      expect(screen.getByText('Simple Text')).toBeInTheDocument();
    });

    test('renders React element content', () => {
      render(<Badge><strong>Bold Text</strong></Badge>);
      expect(screen.getByText('Bold Text')).toBeInTheDocument();
    });

    test('renders complex content with icon', () => {
      render(
        <Badge icon={<span>🔥</span>}>
          <span>Hot</span> <em>Deal</em>
        </Badge>
      );
      expect(screen.getByText('🔥')).toBeInTheDocument();
      expect(screen.getByText('Hot')).toBeInTheDocument();
      expect(screen.getByText('Deal')).toBeInTheDocument();
    });
  });
});