import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Tooltip from './Tooltip';

describe('Tooltip', () => {
  test('renders children and stores tooltip content in data attribute', () => {
    render(
      <Tooltip content="Hello World">
        <button>Hover me</button>
      </Tooltip>
    );
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveAttribute('data-tip', 'Hello World');
  });

  test('tooltip data attribute persists on hover (visual handled by CSS)', () => {
    render(
      <Tooltip content="Hello World">
        <button>Hover me</button>
      </Tooltip>
    );
    const tooltip = screen.getByRole('tooltip');
    const button = screen.getByText('Hover me');
    fireEvent.mouseOver(button);
    expect(tooltip).toHaveAttribute('data-tip', 'Hello World');
  });

 test('mouse events do not remove data attribute (visual hide is CSS only)', () => {
    render(
      <Tooltip content="Hello World">
        <button>Hover me</button>
      </Tooltip>
    );
    const tooltip = screen.getByRole('tooltip');
    const button = screen.getByText('Hover me');
    fireEvent.mouseOver(button);
    expect(tooltip).toHaveAttribute('data-tip', 'Hello World');
    fireEvent.mouseOut(button);
    expect(tooltip).toHaveAttribute('data-tip', 'Hello World');
  });

  test('applies correct position class', () => {
    render(
      <Tooltip content="Hello World" position="bottom">
        <button>Hover me</button>
      </Tooltip>
    );

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveClass('tooltip-bottom');
  });

  test('applies correct color class', () => {
    render(
      <Tooltip content="Hello World" color="primary">
        <button>Hover me</button>
      </Tooltip>
    );

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveClass('tooltip-primary');
  });

  test('applies custom className', () => {
    render(
      <Tooltip content="Hello World" className="custom-class">
        <button>Hover me</button>
      </Tooltip>
    );

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveClass('custom-class');
  });

  test('has correct ARIA attributes', () => {
    render(
      <Tooltip content="Hello World">
        <button>Hover me</button>
      </Tooltip>
    );

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveAttribute('aria-live', 'polite');
  });

  test('works with different child elements', () => {
    render(
      <Tooltip content="Hello World">
        <span>Hover me</span>
      </Tooltip>
    );
    const span = screen.getByText('Hover me');
    fireEvent.mouseOver(span);
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-tip', 'Hello World');
  });
});