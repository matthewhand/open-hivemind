/* @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  LoadingSpinner,
  Loading,
  Progress,
  LoadingOverlay,
} from '../../../src/client/src/components/DaisyUI/Loading';

describe('LoadingSpinner', () => {
  it('renders with aria-hidden="true"', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.firstChild as HTMLElement;
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies spinner variant by default', () => {
    const { container } = render(<LoadingSpinner />);
    expect((container.firstChild as HTMLElement).className).toContain('loading-spinner');
  });

  it.each(['spinner', 'dots', 'ring', 'ball', 'bars', 'infinity'] as const)(
    'applies loading-%s variant class',
    (variant) => {
      const { container } = render(<LoadingSpinner variant={variant} />);
      expect((container.firstChild as HTMLElement).className).toContain(`loading-${variant}`);
    },
  );

  it.each(['xs', 'sm', 'md', 'lg'] as const)(
    'applies loading-%s size class',
    (size) => {
      const { container } = render(<LoadingSpinner size={size} />);
      expect((container.firstChild as HTMLElement).className).toContain(`loading-${size}`);
    },
  );

  it('applies color class', () => {
    const { container } = render(<LoadingSpinner color="success" />);
    expect((container.firstChild as HTMLElement).className).toContain('text-success');
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="extra" />);
    expect((container.firstChild as HTMLElement).className).toContain('extra');
  });
});

describe('Loading (legacy)', () => {
  it('renders a LoadingSpinner with type prop mapped to variant', () => {
    const { container } = render(<Loading type="dots" />);
    expect((container.firstChild as HTMLElement).className).toContain('loading-dots');
  });
});

describe('Progress', () => {
  it('renders a progress element', () => {
    render(<Progress value={50} />);
    const progress = screen.getByRole('progressbar');
    expect(progress).toBeInTheDocument();
  });

  it('applies variant class', () => {
    render(<Progress variant="success" />);
    expect(screen.getByRole('progressbar').className).toContain('progress-success');
  });

  it('displays percentage when showValue is true', () => {
    render(<Progress value={75} max={100} showValue />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('does not display value when indeterminate', () => {
    render(<Progress indeterminate showValue />);
    const progress = screen.getByRole('progressbar');
    expect(progress).not.toHaveAttribute('value');
  });

  it('clamps percentage between 0 and 100', () => {
    render(<Progress value={150} max={100} showValue />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});

describe('LoadingOverlay', () => {
  it('renders children always', () => {
    render(<LoadingOverlay isLoading={false}><p>Content</p></LoadingOverlay>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('shows overlay with message when isLoading', () => {
    render(<LoadingOverlay isLoading={true}><p>Content</p></LoadingOverlay>);
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('hides overlay when not loading', () => {
    render(<LoadingOverlay isLoading={false}><p>Content</p></LoadingOverlay>);
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<LoadingOverlay isLoading={true} message="Fetching..."><p>C</p></LoadingOverlay>);
    expect(screen.getByText('Fetching...')).toBeInTheDocument();
  });
});
