import React from 'react';
import { render, screen } from '@testing-library/react';
import Indicator from '../Indicator';

describe('Indicator', () => {
  it('renders children and item', () => {
    render(
      <Indicator item={<span data-testid="indicator-item">Badge</span>}>
        <div data-testid="content">Content</div>
      </Indicator>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByTestId('indicator-item')).toBeInTheDocument();
  });

  it('applies default classes', () => {
    const { container } = render(
      <Indicator item={<span>Badge</span>}>
        <div>Content</div>
      </Indicator>
    );

    expect(container.firstChild).toHaveClass('indicator');
    const indicatorItem = container.querySelector('.indicator-item');
    expect(indicatorItem).toBeInTheDocument();
  });

  it('applies horizontal position classes', () => {
    const { container, rerender } = render(
      <Indicator item={<span>Badge</span>} horizontalPosition="start">
        <div>Content</div>
      </Indicator>
    );
    expect(container.querySelector('.indicator-item')).toHaveClass('indicator-start');

    rerender(
      <Indicator item={<span>Badge</span>} horizontalPosition="center">
        <div>Content</div>
      </Indicator>
    );
    expect(container.querySelector('.indicator-item')).toHaveClass('indicator-center');

    rerender(
      <Indicator item={<span>Badge</span>} horizontalPosition="end">
        <div>Content</div>
      </Indicator>
    );
    expect(container.querySelector('.indicator-item')).toHaveClass('indicator-end');
  });

  it('applies vertical position classes', () => {
    const { container, rerender } = render(
      <Indicator item={<span>Badge</span>} verticalPosition="top">
        <div>Content</div>
      </Indicator>
    );
    expect(container.querySelector('.indicator-item')).toHaveClass('indicator-top');

    rerender(
      <Indicator item={<span>Badge</span>} verticalPosition="middle">
        <div>Content</div>
      </Indicator>
    );
    expect(container.querySelector('.indicator-item')).toHaveClass('indicator-middle');

    rerender(
      <Indicator item={<span>Badge</span>} verticalPosition="bottom">
        <div>Content</div>
      </Indicator>
    );
    expect(container.querySelector('.indicator-item')).toHaveClass('indicator-bottom');
  });

  it('applies custom className to container', () => {
    const { container } = render(
      <Indicator item={<span>Badge</span>} className="custom-class">
        <div>Content</div>
      </Indicator>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('applies itemClassName to indicator item', () => {
    const { container } = render(
      <Indicator item={<span>Badge</span>} itemClassName="custom-item-class">
        <div>Content</div>
      </Indicator>
    );
    expect(container.querySelector('.indicator-item')).toHaveClass('custom-item-class');
  });
});
