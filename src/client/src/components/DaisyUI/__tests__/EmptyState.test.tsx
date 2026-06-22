import React from 'react';
import { render, screen } from '@testing-library/react';
import EmptyState from '../EmptyState';
import { Search } from 'lucide-react';
import { describe, it, expect, vi } from 'vitest';

describe('EmptyState Component', () => {
  it('renders correctly with default props', () => {
    render(
      <EmptyState
        icon={Search}
        title="No items found"
        description="Try a different search term"
      />
    );

    // Default heading level is h2
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('No items found');
    expect(screen.getByText('Try a different search term')).toBeInTheDocument();
  });

  it('renders with a custom heading level', () => {
    render(
      <EmptyState
        headingLevel="h4"
        icon={Search}
        title="Custom Heading Level"
        description="This should be an h4"
      />
    );

    const heading = screen.getByRole('heading', { level: 4 });
    expect(heading).toHaveTextContent('Custom Heading Level');
  });

  it('renders an action button if actionLabel and onAction are provided', () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        icon={Search}
        title="No items"
        description="Add a new item"
        actionLabel="Create Item"
        onAction={onAction}
      />
    );

    const button = screen.getByRole('button', { name: 'Create Item' });
    expect(button).toBeInTheDocument();

    button.click();
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
