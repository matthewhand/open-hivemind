/* @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmptyState from '../../../src/client/src/components/DaisyUI/EmptyState';

// Mock a Lucide icon component
const MockIcon: React.FC<{ className?: string; strokeWidth?: number }> = ({ className }) => (
  <svg data-testid="empty-icon" className={className} />
);

describe('EmptyState', () => {
  it('renders the icon', () => {
    render(
      <EmptyState
        icon={MockIcon as any}
        title="No items"
        description="There are no items yet."
      />,
    );
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
  });

  it('renders title text', () => {
    render(
      <EmptyState
        icon={MockIcon as any}
        title="Nothing here"
        description="Desc"
      />,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(
      <EmptyState
        icon={MockIcon as any}
        title="T"
        description="You have no results."
      />,
    );
    expect(screen.getByText('You have no results.')).toBeInTheDocument();
  });

  it('renders action button when actionLabel and onAction provided', () => {
    const onAction = jest.fn();
    render(
      <EmptyState
        icon={MockIcon as any}
        title="T"
        description="D"
        actionLabel="Create New"
        onAction={onAction}
      />,
    );
    const btn = screen.getByRole('button', { name: /create new/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when actionLabel is missing', () => {
    render(
      <EmptyState
        icon={MockIcon as any}
        title="T"
        description="D"
        onAction={jest.fn()}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not render action button when onAction is missing', () => {
    render(
      <EmptyState
        icon={MockIcon as any}
        title="T"
        description="D"
        actionLabel="Click"
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('has data-testid="empty-state"', () => {
    render(
      <EmptyState
        icon={MockIcon as any}
        title="T"
        description="D"
      />,
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <EmptyState
        icon={MockIcon as any}
        title="T"
        description="D"
        className="custom-empty"
      />,
    );
    expect(screen.getByTestId('empty-state').className).toContain('custom-empty');
  });

  it('renders actionIcon in the button', () => {
    const ActionIcon: React.FC<{ className?: string }> = ({ className }) => (
      <svg data-testid="action-icon" className={className} />
    );
    render(
      <EmptyState
        icon={MockIcon as any}
        title="T"
        description="D"
        actionLabel="Add"
        actionIcon={ActionIcon as any}
        onAction={jest.fn()}
      />,
    );
    expect(screen.getByTestId('action-icon')).toBeInTheDocument();
  });

  it('applies variant styles', () => {
    render(
      <EmptyState
        icon={MockIcon as any}
        title="T"
        description="D"
        variant="error"
      />,
    );
    const el = screen.getByTestId('empty-state');
    // Error variant should include error gradient classes
    expect(el.className).toContain('error');
  });
});
