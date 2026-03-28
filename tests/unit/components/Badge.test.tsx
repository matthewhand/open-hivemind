/* @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Badge } from '../../../src/client/src/components/DaisyUI/Badge';

describe('Badge', () => {
  it('renders with text content', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('has role="status" by default', () => {
    render(<Badge>Status</Badge>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('applies neutral variant class by default', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByRole('status').className).toContain('badge-neutral');
  });

  it.each(['primary', 'secondary', 'success', 'warning', 'error', 'ghost'] as const)(
    'applies badge-%s class for variant="%s"',
    (variant) => {
      render(<Badge variant={variant}>{variant}</Badge>);
      expect(screen.getByRole('status').className).toContain(`badge-${variant}`);
    },
  );

  it('applies small size class', () => {
    render(<Badge size="small">XS</Badge>);
    expect(screen.getByRole('status').className).toContain('badge-xs');
  });

  it('applies normal size class (default)', () => {
    render(<Badge size="normal">MD</Badge>);
    expect(screen.getByRole('status').className).toContain('badge-md');
  });

  it('applies large size class', () => {
    render(<Badge size="large">LG</Badge>);
    expect(screen.getByRole('status').className).toContain('badge-lg');
  });

  it('applies outline style', () => {
    render(<Badge style="outline" variant="primary">Outlined</Badge>);
    const badge = screen.getByRole('status');
    expect(badge.className).toContain('badge-outline');
    expect(badge.className).toContain('badge-primary');
  });

  it('renders icon before content', () => {
    render(<Badge icon={<span data-testid="badge-icon">*</span>}>With Icon</Badge>);
    expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
  });

  it('renders avatar', () => {
    render(<Badge avatar={<img data-testid="avatar" alt="av" />}>AV</Badge>);
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Badge className="my-class">Styled</Badge>);
    expect(screen.getByRole('status').className).toContain('my-class');
  });

  it('supports aria-label', () => {
    render(<Badge aria-label="3 notifications">3</Badge>);
    expect(screen.getByLabelText('3 notifications')).toBeInTheDocument();
  });

  it('supports custom role', () => {
    render(<Badge role="presentation">Dec</Badge>);
    expect(screen.getByRole('presentation')).toBeInTheDocument();
  });
});
