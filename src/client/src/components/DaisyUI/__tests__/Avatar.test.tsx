import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Avatar from '../Avatar';

describe('Avatar Component', () => {
  it('renders a placeholder when placeholder is true', () => {
    render(<Avatar placeholder={true}>P</Avatar>);
    const span = screen.getByText('P');
    expect(span).toBeInTheDocument();
  });

  it('renders an image when src is provided', () => {
    render(<Avatar src="https://example.com/avatar.png" alt="User" />);
    const img = screen.getByAltText('User');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.png');
  });

  it('applies custom innerClassName and className', () => {
    const { container } = render(
      <Avatar
        className="test-outer"
        innerClassName="test-inner bg-red-500"
        placeholder={true}
      >
        A
      </Avatar>
    );
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass('test-outer');
    expect(outerDiv).toHaveClass('avatar');
    expect(outerDiv).toHaveClass('placeholder');

    const innerDiv = outerDiv.firstChild as HTMLElement;
    expect(innerDiv).toHaveClass('test-inner');
    expect(innerDiv).toHaveClass('bg-red-500');
    expect(innerDiv).not.toHaveClass('bg-neutral-focus'); // default shouldn't be applied
  });
});
