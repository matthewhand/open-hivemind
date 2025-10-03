import React from 'react';
import { render, screen } from '@testing-library/react';
import Kbd from './Kbd';

describe('Kbd Component', () => {
  test('renders individual key', () => {
    render(<Kbd>Enter</Kbd>);
    const kbdElement = screen.getByText('Enter');
    expect(kbdElement).toBeInTheDocument();
    expect(kbdElement).toHaveClass('kbd');
    expect(kbdElement).toHaveClass('kbd-md');
  });

  test('renders with different sizes', () => {
    const { rerender } = render(<Kbd size="xs">A</Kbd>);
    expect(screen.getByText('A')).toHaveClass('kbd-xs');

    rerender(<Kbd size="sm">B</Kbd>);
    expect(screen.getByText('B')).toHaveClass('kbd-sm');

    rerender(<Kbd size="lg">C</Kbd>);
    expect(screen.getByText('C')).toHaveClass('kbd-lg');
  });

  test('renders key combinations', () => {
    render(
      <div>
        <Kbd>Ctrl</Kbd> + <Kbd>Alt</Kbd> + <Kbd>Delete</Kbd>
      </div>
    );
    
    expect(screen.getByText('Ctrl')).toBeInTheDocument();
    expect(screen.getByText('Alt')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  test('renders modifier keys correctly', () => {
    render(
      <div>
        <Kbd>Ctrl</Kbd>
        <Kbd>Alt</Kbd>
        <Kbd>Shift</Kbd>
        <Kbd>Cmd</Kbd>
      </div>
    );

    expect(screen.getByText('Ctrl')).toBeInTheDocument();
    expect(screen.getByText('Alt')).toBeInTheDocument();
    expect(screen.getByText('Shift')).toBeInTheDocument();
    expect(screen.getByText('Cmd')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    render(<Kbd className="custom-class" size="sm">Test</Kbd>);
    const kbdElement = screen.getByText('Test');
    expect(kbdElement).toHaveClass('kbd');
    expect(kbdElement).toHaveClass('kbd-sm');
    expect(kbdElement).toHaveClass('custom-class');
  });

  test('includes aria-label for accessibility', () => {
    render(<Kbd aria-label="Keyboard shortcut: Enter">Enter</Kbd>);
    const kbdElement = screen.getByText('Enter');
    expect(kbdElement).toHaveAttribute('aria-label', 'Keyboard shortcut: Enter');
  });

  test('renders without aria-label when not provided', () => {
    render(<Kbd>Space</Kbd>);
    const kbdElement = screen.getByText('Space');
    expect(kbdElement).not.toHaveAttribute('aria-label');
  });

  test('handles complex key combinations', () => {
    render(
      <div>
        <Kbd size="sm">Ctrl</Kbd> + <Kbd size="sm">Shift</Kbd> + <Kbd size="sm">P</Kbd>
      </div>
    );

    expect(screen.getByText('Ctrl')).toHaveClass('kbd-sm');
    expect(screen.getByText('Shift')).toHaveClass('kbd-sm');
    expect(screen.getByText('P')).toHaveClass('kbd-sm');
  });

  test('renders with default size when not specified', () => {
    render(<Kbd>Test</Kbd>);
    const kbdElement = screen.getByText('Test');
    expect(kbdElement).toHaveClass('kbd-md');
  });
});