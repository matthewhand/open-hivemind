import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dropdown from './Dropdown';

describe('Dropdown', () => {
  it('renders with a button trigger', () => {
    render(
      <Dropdown trigger="Click me">
        <li><a>Item 1</a></li>
        <li><a>Item 2</a></li>
      </Dropdown>
    );
    expect(screen.getByRole('button', { name: /Click me/i })).toBeInTheDocument();
  });

  it('toggles dropdown on trigger click', () => {
    render(
      <Dropdown trigger="Click me">
        <li><a>Item 1</a></li>
      </Dropdown>
    );
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
  });

  it('closes dropdown on outside click', () => {
    render(
      <div>
        <Dropdown trigger="Click me">
          <li><a>Item 1</a></li>
        </Dropdown>
        <div data-testid="outside">Outside</div>
      </div>
    );
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
  });

  it('applies correct position classes', () => {
    const { container } = render(
      <Dropdown trigger="Click me" position="top">
        <li><a>Item 1</a></li>
      </Dropdown>
    );
    expect(container.firstChild).toHaveClass('dropdown-top');
  });

  it('applies correct size classes', () => {
    render(
      <Dropdown trigger="Click me" size="lg">
        <li><a>Item 1</a></li>
      </Dropdown>
    );
    expect(screen.getByRole('button')).toHaveClass('btn-lg');
  });

  it('applies correct color classes', () => {
    render(
      <Dropdown trigger="Click me" color="primary">
        <li><a>Item 1</a></li>
      </Dropdown>
    );
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });

  it('renders custom trigger element', () => {
    render(
      <Dropdown trigger={<span data-testid="custom-trigger">Custom</span>}>
        <li><a>Item 1</a></li>
      </Dropdown>
    );
    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
  });

  it('handles controlled open state', () => {
    const onToggle = jest.fn();
    const { rerender } = render(
      <Dropdown trigger="Click me" isOpen={false} onToggle={onToggle}>
        <li><a>Item 1</a></li>
      </Dropdown>
    );
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();

    rerender(
      <Dropdown trigger="Click me" isOpen={true} onToggle={onToggle}>
        <li><a>Item 1</a></li>
      </Dropdown>
    );
    expect(screen.getByText('Item 1')).toBeInTheDocument();

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});