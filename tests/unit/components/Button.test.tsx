/* @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '../../../src/client/src/components/DaisyUI/Button';

describe('Button', () => {
  it('renders with text content', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('applies primary variant class by default', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('btn-primary');
  });

  it.each(['primary', 'secondary', 'accent', 'ghost', 'link'] as const)(
    'applies btn-%s class for variant="%s"',
    (variant) => {
      render(<Button variant={variant}>{variant}</Button>);
      expect(screen.getByRole('button').className).toContain(`btn-${variant}`);
    },
  );

  it.each(['xs', 'sm', 'lg'] as const)(
    'applies btn-%s class for size="%s"',
    (size) => {
      render(<Button size={size}>{size}</Button>);
      expect(screen.getByRole('button').className).toContain(`btn-${size}`);
    },
  );

  it('does not add a size class for md (default)', () => {
    render(<Button size="md">Medium</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).not.toContain('btn-md');
    expect(btn.className).not.toContain('btn-xs');
  });

  it('applies outline style', () => {
    render(<Button buttonStyle="outline">Outline</Button>);
    expect(screen.getByRole('button').className).toContain('btn-outline');
  });

  it('shows a spinner and sets aria-busy when loading', () => {
    render(<Button loading>Loading</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toBeDisabled();
    const spinner = btn.querySelector('.loading-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
  });

  it('displays loadingText instead of children when loading', () => {
    render(<Button loading loadingText="Saving...">Submit</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Saving...');
    expect(screen.getByRole('button')).not.toHaveTextContent('Submit');
  });

  it('is disabled and prevents click when disabled', () => {
    const onClick = jest.fn();
    render(<Button disabled onClick={onClick}>Disabled</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('prevents click when loading', () => {
    const onClick = jest.fn();
    render(<Button loading onClick={onClick}>Loading</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('fires click handler when enabled', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders icon prop before children', () => {
    render(<Button icon={<span data-testid="icon">I</span>}>Text</Button>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders startIcon alias', () => {
    render(<Button startIcon={<span data-testid="start">S</span>}>Text</Button>);
    expect(screen.getByTestId('start')).toBeInTheDocument();
  });

  it('renders iconRight / endIcon after children', () => {
    render(<Button iconRight={<span data-testid="right">R</span>}>Text</Button>);
    expect(screen.getByTestId('right')).toBeInTheDocument();
  });

  it('hides icons when loading', () => {
    render(
      <Button loading icon={<span data-testid="icon">I</span>} iconRight={<span data-testid="right">R</span>}>
        Text
      </Button>,
    );
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('right')).not.toBeInTheDocument();
  });

  it('passes extra HTML attributes through', () => {
    render(<Button data-testid="custom" aria-label="custom btn">Go</Button>);
    expect(screen.getByTestId('custom')).toHaveAttribute('aria-label', 'custom btn');
  });
});
