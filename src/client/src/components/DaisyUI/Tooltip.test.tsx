import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Tooltip from './Tooltip';

describe('Tooltip', () => {
  test('renders children and hides tooltip content initially', () => {
    render(
      <Tooltip content="Hello World">
        <button>Hover me</button>
      </Tooltip>
    );

    expect(screen.getByText('Hover me')).toBeInTheDocument();
    expect(screen.queryByText('Hello World')).not.toBeInTheDocument();
  });

  test('shows tooltip content on hover', () => {
    render(
      <Tooltip content="Hello World">
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');
    fireEvent.mouseOver(button);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

 test('hides tooltip content on mouse out', () => {
    render(
      <Tooltip content="Hello World">
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');
    fireEvent.mouseOver(button);
    expect(screen.getByText('Hello World')).toBeInTheDocument();

    fireEvent.mouseOut(button);
    expect(screen.queryByText('Hello World')).not.toBeInTheDocument();
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
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});