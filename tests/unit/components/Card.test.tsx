/* @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Card from '../../../src/client/src/components/DaisyUI/Card';

describe('Card', () => {
  it('renders title', () => {
    render(<Card title="Card Title">Body</Card>);
    expect(screen.getByText('Card Title')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    render(<Card title="T" subtitle="Sub">Body</Card>);
    expect(screen.getByText('Sub')).toBeInTheDocument();
  });

  it('renders body children', () => {
    render(<Card><p>Body content</p></Card>);
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('renders actions', () => {
    render(
      <Card actions={<button>Save</button>}>Body</Card>,
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('renders image with alt text', () => {
    render(<Card imageSrc="/img.png" imageAlt="Photo">Body</Card>);
    const img = screen.getByAltText('Photo');
    expect(img).toHaveAttribute('src', '/img.png');
  });

  it('uses default image alt text', () => {
    render(<Card imageSrc="/img.png">Body</Card>);
    expect(screen.getByAltText('Card image')).toBeInTheDocument();
  });

  it('applies compact mode class', () => {
    const { container } = render(<Card compact>Compact</Card>);
    expect(container.firstChild).toHaveClass('card-compact');
  });

  it('applies side layout class', () => {
    const { container } = render(<Card side>Side</Card>);
    expect(container.firstChild).toHaveClass('card-side');
  });

  it('renders skeleton placeholders when loading', () => {
    const { container } = render(<Card loading>Loading</Card>);
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    // Children are not rendered in loading state
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
  });

  it('renders emptyState content instead of children', () => {
    render(<Card emptyState={<p>No items</p>}>Children</Card>);
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.queryByText('Children')).not.toBeInTheDocument();
  });

  it('applies hover effect classes', () => {
    const { container } = render(<Card hover>Hoverable</Card>);
    expect(container.firstChild).toHaveClass('hover:-translate-y-1');
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="my-card">C</Card>);
    expect(container.firstChild).toHaveClass('my-card');
  });
});

describe('Card subcomponents', () => {
  it('Card.Title renders with default h2 tag', () => {
    render(<Card.Title>Title</Card.Title>);
    const el = screen.getByText('Title');
    expect(el.tagName).toBe('H2');
    expect(el.className).toContain('card-title');
  });

  it('Card.Title renders with custom tag', () => {
    render(<Card.Title tag="h3">H3 Title</Card.Title>);
    expect(screen.getByText('H3 Title').tagName).toBe('H3');
  });

  it('Card.Body renders children', () => {
    render(<Card.Body>Body content</Card.Body>);
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('Card.Actions renders children with card-actions class', () => {
    const { container } = render(<Card.Actions><button>Act</button></Card.Actions>);
    expect(container.querySelector('.card-actions')).toBeInTheDocument();
    expect(screen.getByText('Act')).toBeInTheDocument();
  });
});
