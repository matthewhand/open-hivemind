import React from 'react';
import { render, screen } from '@testing-library/react';
import Tooltip, { hasMeaningfulTip } from '../Tooltip';

const getTooltipRoot = (testId = 'child') =>
  screen.getByTestId(testId).parentElement as HTMLElement;

describe('Tooltip', () => {
  describe('rendering', () => {
    it('renders its children', () => {
      render(
        <Tooltip content="Hello">
          <button data-testid="child">Action</button>
        </Tooltip>
      );
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('wraps children in a tooltip container when content is present', () => {
      render(
        <Tooltip content="Hello">
          <button data-testid="child">Action</button>
        </Tooltip>
      );
      const root = getTooltipRoot();
      expect(root).toHaveClass('tooltip');
      expect(root).toHaveAttribute('data-tip', 'Hello');
    });

    it('exposes the tooltip role and live region for assistive tech', () => {
      render(
        <Tooltip content="Hello">
          <button data-testid="child">Action</button>
        </Tooltip>
      );
      const root = getTooltipRoot();
      expect(root).toHaveAttribute('role', 'tooltip');
      expect(root).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('position', () => {
    it('defaults to the top position', () => {
      render(
        <Tooltip content="Hello">
          <button data-testid="child">Action</button>
        </Tooltip>
      );
      expect(getTooltipRoot()).toHaveClass('tooltip-top');
    });

    it.each(['top', 'bottom', 'left', 'right'] as const)(
      'applies the tooltip-%s class',
      (position) => {
        render(
          <Tooltip content="Hello" position={position}>
            <button data-testid="child">Action</button>
          </Tooltip>
        );
        expect(getTooltipRoot()).toHaveClass(`tooltip-${position}`);
      }
    );
  });

  describe('color', () => {
    it('does not apply a color class by default', () => {
      render(
        <Tooltip content="Hello">
          <button data-testid="child">Action</button>
        </Tooltip>
      );
      const root = getTooltipRoot();
      expect(root.className).not.toMatch(/tooltip-(primary|secondary|accent|info|success|warning|error)/);
    });

    it.each([
      'primary',
      'secondary',
      'accent',
      'info',
      'success',
      'warning',
      'error',
    ] as const)('applies the tooltip-%s color class', (color) => {
      render(
        <Tooltip content="Hello" color={color}>
          <button data-testid="child">Action</button>
        </Tooltip>
      );
      expect(getTooltipRoot()).toHaveClass(`tooltip-${color}`);
    });
  });

  describe('custom className', () => {
    it('merges a custom className onto the tooltip container', () => {
      render(
        <Tooltip content="Hello" className="z-10 custom-class">
          <button data-testid="child">Action</button>
        </Tooltip>
      );
      const root = getTooltipRoot();
      expect(root).toHaveClass('tooltip');
      expect(root).toHaveClass('z-10');
      expect(root).toHaveClass('custom-class');
    });

    it('does not leave stray whitespace in the class list', () => {
      render(
        <Tooltip content="Hello">
          <button data-testid="child">Action</button>
        </Tooltip>
      );
      // No double spaces, leading or trailing whitespace.
      expect(getTooltipRoot().className).toBe('tooltip tooltip-top');
    });
  });

  describe('empty / falsy content', () => {
    it('renders children directly without a tooltip wrapper for empty string', () => {
      render(
        <Tooltip content="">
          <button data-testid="child">Action</button>
        </Tooltip>
      );
      const root = getTooltipRoot();
      expect(root).not.toHaveClass('tooltip');
      expect(root).not.toHaveAttribute('data-tip');
      expect(root).not.toHaveAttribute('role', 'tooltip');
    });

    it('renders children directly for whitespace-only content', () => {
      render(
        <Tooltip content="   ">
          <button data-testid="child">Action</button>
        </Tooltip>
      );
      expect(getTooltipRoot()).not.toHaveClass('tooltip');
    });

    it('renders children directly for null/undefined content', () => {
      const { rerender } = render(
        <Tooltip content={null}>
          <button data-testid="child">Action</button>
        </Tooltip>
      );
      expect(getTooltipRoot()).not.toHaveClass('tooltip');

      rerender(
        <Tooltip content={undefined}>
          <button data-testid="child">Action</button>
        </Tooltip>
      );
      expect(getTooltipRoot()).not.toHaveClass('tooltip');
    });

    it('still renders a tooltip when content is the number zero', () => {
      render(
        <Tooltip content={0}>
          <button data-testid="child">Action</button>
        </Tooltip>
      );
      const root = getTooltipRoot();
      expect(root).toHaveClass('tooltip');
      expect(root).toHaveAttribute('data-tip', '0');
    });
  });
});

describe('hasMeaningfulTip', () => {
  it('returns false for null, undefined and false', () => {
    expect(hasMeaningfulTip(null)).toBe(false);
    expect(hasMeaningfulTip(undefined)).toBe(false);
    expect(hasMeaningfulTip(false)).toBe(false);
  });

  it('returns false for empty and whitespace-only strings', () => {
    expect(hasMeaningfulTip('')).toBe(false);
    expect(hasMeaningfulTip('   ')).toBe(false);
    expect(hasMeaningfulTip('\n\t')).toBe(false);
  });

  it('returns true for non-empty strings', () => {
    expect(hasMeaningfulTip('Run Diagnostic')).toBe(true);
  });

  it('returns true for numeric content including zero', () => {
    expect(hasMeaningfulTip(0)).toBe(true);
    expect(hasMeaningfulTip(42)).toBe(true);
  });

  it('returns true for React node content', () => {
    expect(hasMeaningfulTip(<span>tip</span>)).toBe(true);
  });
});
